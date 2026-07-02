import { scValToNative } from "@stellar/stellar-sdk";
import { contractIds } from "./config";
import { rpcServer } from "./stellar";
import { toHex } from "./format";

// How far back to look when (re)building the tape. ~22h of testnet ledgers —
// wide enough to surface real activity, within the RPC's event retention. If
// the window ever exceeds retention we fall back to a small recent window.
const LOOKBACK_LEDGERS = 16000;
const FALLBACK_LEDGERS = 2000;

export type TapeKind =
  | "bet"
  | "created"
  | "resolved"
  | "outcome"
  | "claim"
  | "fee"
  | "other";

export interface TapeEvent {
  id: string;
  ledger: number;
  contractId: string;
  kind: TapeKind;
  label: string;
  actor?: string;
  side?: "yes" | "no";
  amountStroops?: string;
  marketId?: string;
  question?: string;
}

function asHex(v: unknown): string | undefined {
  if (v instanceof Uint8Array) return toHex(v);
  if (Array.isArray(v)) return toHex(v as number[]);
  return undefined;
}

function parse(ev: any): TapeEvent | null {
  try {
    const topics: any[] = (ev.topic ?? []).map((t: any) => scValToNative(t));
    const name = String(topics[0] ?? "");
    const data: any = ev.value != null ? scValToNative(ev.value) : undefined;
    const contractId = String(ev.contractId ?? "");
    const ledger: number = Number(ev.ledger ?? 0);
    const id = String(ev.id ?? `${ledger}-${name}-${ev.pagingToken ?? Math.random()}`);
    const base = { id, ledger, contractId };

    switch (name) {
      case "bet_placed":
        return {
          ...base,
          kind: "bet",
          label: "BET",
          actor: String(topics[1]),
          side: data?.side ? "yes" : "no",
          amountStroops: data?.net?.toString(),
        };
      case "market_created":
        return {
          ...base,
          kind: "created",
          label: "NEW MARKET",
          marketId: asHex(topics[1]),
          actor: String(topics[2] ?? ""),
          question: data?.question ? String(data.question) : undefined,
        };
      case "market_resolved":
        return {
          ...base,
          kind: "resolved",
          label: "RESOLVED",
          side: data?.outcome ? "yes" : "no",
        };
      case "outcome_reported":
        return {
          ...base,
          kind: "outcome",
          label: "ORACLE",
          marketId: asHex(topics[1]),
          side: data?.outcome ? "yes" : "no",
        };
      case "claimed":
        return {
          ...base,
          kind: "claim",
          label: "CLAIM",
          actor: String(topics[1]),
          amountStroops: data?.payout?.toString(),
        };
      case "collected":
        return {
          ...base,
          kind: "fee",
          label: "FEE",
          actor: String(topics[1]),
          amountStroops: data?.amount?.toString(),
        };
      default:
        return null; // ignore reporter_added / market_initialized etc. on the tape
    }
  } catch {
    return null;
  }
}

/**
 * Fetch a recent window of protocol events across the factory, oracle, treasury
 * and (optionally) a specific market — decoded into a human-readable tape,
 * newest first.
 */
export async function fetchTape(extraContractIds: string[] = []): Promise<TapeEvent[]> {
  const server = rpcServer();
  const latest = (await server.getLatestLedger()).sequence;
  const ids = Array.from(new Set([...contractIds, ...extraContractIds])).slice(0, 5);

  // Try the wide window; if the RPC rejects it (retention), retry a small one.
  let events: unknown[] = [];
  for (const back of [LOOKBACK_LEDGERS, FALLBACK_LEDGERS]) {
    try {
      const res = await server.getEvents({
        startLedger: Math.max(1, latest - back),
        filters: [{ type: "contract", contractIds: ids }],
      });
      events = res.events;
      break;
    } catch {
      // try the next (smaller) window
    }
  }

  const parsed = events.map(parse).filter((e): e is TapeEvent => e !== null);
  // Dedupe by id, newest first.
  const seen = new Set<string>();
  return parsed
    .reverse()
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

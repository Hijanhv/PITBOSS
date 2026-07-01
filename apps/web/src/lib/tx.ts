"use client";
import type { AssembledTransaction } from "@stellar/stellar-sdk/contract";

export type TxStage =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "success"
  | "error";

export const STAGE_ORDER: TxStage[] = [
  "building",
  "signing",
  "submitting",
  "success",
];

export const STAGE_LABEL: Record<TxStage, string> = {
  idle: "Idle",
  building: "Building & simulating",
  signing: "Sign in your wallet",
  submitting: "Submitting to network",
  success: "Confirmed",
  error: "Failed",
};

function extractHash(sent: any): string | undefined {
  return (
    sent?.sendTransactionResponse?.hash ??
    sent?.getTransactionResponse?.txHash ??
    sent?.result?.hash ??
    undefined
  );
}

/** Map raw SDK/contract errors to friendly, human copy. */
export function decodeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  if (
    lower.includes("reject") ||
    lower.includes("declined") ||
    lower.includes("denied") ||
    lower.includes("cancel")
  ) {
    return "You rejected the request in your wallet.";
  }
  const known: Record<string, string> = {
    MarketClosed: "Betting is closed for this market.",
    NotClosedYet: "The market hasn't reached its close ledger yet.",
    AlreadyResolved: "This market is already resolved.",
    NotResolved: "This market isn't resolved yet.",
    OutcomeNotReady: "The oracle hasn't reported an outcome yet.",
    ZeroAmount: "Amount must be greater than zero.",
    AlreadyClaimed: "You've already claimed from this market.",
    NothingToClaim: "You backed the losing side — nothing to claim.",
    NotReporter: "This account isn't an authorized oracle reporter.",
    AlreadyReported: "An outcome was already reported for this market.",
    NotAdmin: "Admin only.",
    CloseInPast: "Close ledger must be in the future.",
  };
  for (const [k, v] of Object.entries(known)) if (msg.includes(k)) return v;
  const code = msg.match(/#(\d+)/);
  if (code) return `Contract rejected the call (error #${code[1]}).`;
  if (lower.includes("insufficient")) return "Insufficient balance for this transaction.";
  return msg.length > 160 ? `${msg.slice(0, 160)}…` : msg;
}

/**
 * Drive a write transaction through its lifecycle, reporting each stage. Returns
 * the confirmed transaction hash (for a Stellar Expert link) and typed result.
 */
export async function runTx<T>(
  build: () => Promise<AssembledTransaction<T>>,
  onStage: (s: TxStage) => void,
): Promise<{ hash?: string; result: T }> {
  onStage("building");
  const at = await build();
  onStage("signing");
  const sent: any = await (at as any).signAndSend();
  onStage("submitting");
  const hash = extractHash(sent);
  onStage("success");
  return { hash, result: sent?.result as T };
}

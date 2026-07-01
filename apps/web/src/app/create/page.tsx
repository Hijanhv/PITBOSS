"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { factoryWrite } from "@/lib/stellar";
import { useWallet } from "@/lib/wallet";
import { useLatestLedger } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { TxSteps } from "@/components/TxSteps";
import { runTx, decodeError, type TxStage } from "@/lib/tx";

const PRESETS = [
  { label: "1 hour", ledgers: 720 },
  { label: "1 day", ledgers: 17_280 },
  { label: "1 week", ledgers: 120_960 },
  { label: "30 days", ledgers: 518_400 },
];

function humanDuration(ledgers: number): string {
  const secs = ledgers * 5;
  const days = secs / 86_400;
  if (days >= 1) return `~${Math.round(days)} day${days >= 2 ? "s" : ""}`;
  const hours = secs / 3600;
  return `~${Math.round(hours)} hour${hours >= 2 ? "s" : ""}`;
}

export default function CreatePage() {
  const { signer, connect } = useWallet();
  const { data: latest } = useLatestLedger();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const [question, setQuestion] = useState("");
  const [ledgers, setLedgers] = useState(120_960);
  const [stage, setStage] = useState<TxStage>("idle");
  const [err, setErr] = useState<string>();

  const busy = stage !== "idle" && stage !== "success" && stage !== "error";
  const closeLedger = latest ? latest + ledgers : undefined;
  const valid = question.trim().length >= 6 && !!closeLedger;

  async function create() {
    if (!signer) return connect();
    if (!closeLedger) return;
    setErr(undefined);
    try {
      const { hash, result } = await runTx(
        () =>
          factoryWrite(signer).create_market({
            creator: signer.address,
            question: question.trim(),
            close_ledger: closeLedger,
          }),
        setStage,
      );
      let addr: string | undefined;
      try {
        // create_market returns Result<Address>
        addr = (result as { unwrap?: () => string })?.unwrap?.();
      } catch {
        addr = undefined;
      }
      toast.success("Market created", { hash, message: question.trim() });
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["tape"] });
      if (typeof addr === "string" && addr.startsWith("C")) {
        router.push(`/market/${addr}`);
      } else {
        router.push("/");
      }
    } catch (e) {
      const m = decodeError(e);
      setErr(m);
      setStage("error");
      toast.error("Create failed", m);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-bold text-white">
        Open a market
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        The Factory deploys a fresh Market contract and wires it to the shared
        Oracle and Treasury. Permissionless — anyone can be the boss.
      </p>

      <div className="card mt-6 space-y-5 p-6">
        <div>
          <label className="label">Question (resolves YES / NO)</label>
          <textarea
            className="input mt-1.5 min-h-[80px] resize-none"
            placeholder="Will ETH flip BTC by market cap in 2026?"
            value={question}
            maxLength={200}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="mt-1 text-right text-[11px] text-zinc-600">
            {question.length}/200
          </div>
        </div>

        <div>
          <label className="label">Betting window</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((p) => (
              <button
                key={p.ledgers}
                onClick={() => setLedgers(p.ledgers)}
                className={`btn ${
                  ledgers === p.ledgers
                    ? "border border-boss bg-boss/15 text-boss"
                    : "btn-ghost"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Closes in {humanDuration(ledgers)}
            {closeLedger != null && (
              <>
                {" "}
                · at ledger{" "}
                <span className="tabnum text-zinc-400">{closeLedger}</span>
              </>
            )}
          </p>
        </div>

        <button
          className="btn-boss w-full"
          disabled={!!signer && (!valid || busy)}
          onClick={create}
        >
          {!signer
            ? "Connect wallet to create"
            : busy
              ? "Creating…"
              : "Create market"}
        </button>

        <TxSteps stage={stage} error={err} />
      </div>
    </div>
  );
}

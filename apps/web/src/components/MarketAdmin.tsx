"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MarketData } from "@/lib/stellar";
import { marketWrite, oracleWrite } from "@/lib/stellar";
import { useWallet } from "@/lib/wallet";
import { useToast } from "./Toast";
import { TxSteps } from "./TxSteps";
import { runTx, decodeError, type TxStage } from "@/lib/tx";
import type { MarketStatus } from "@/lib/market";

export function MarketAdmin({
  marketId,
  market,
  status,
  isReporter,
  latestLedger,
}: {
  marketId: string;
  market: MarketData;
  status: MarketStatus;
  isReporter: boolean;
  latestLedger?: number;
}) {
  const { signer, connect } = useWallet();
  const qc = useQueryClient();
  const toast = useToast();
  const [stage, setStage] = useState<TxStage>("idle");
  const [err, setErr] = useState<string>();
  const busy = stage !== "idle" && stage !== "success" && stage !== "error";

  if (market.resolved) return null;
  if (!isReporter && status === "open") return null; // nothing to do yet

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["market", marketId] });
    qc.invalidateQueries({ queryKey: ["tape"] });
    setTimeout(() => setStage("idle"), 1600);
  };

  async function report(outcome: boolean) {
    if (!signer) return connect();
    setErr(undefined);
    try {
      const { hash } = await runTx(
        () =>
          oracleWrite(signer).report_outcome({
            reporter: signer.address,
            market_id: market.market_id,
            outcome,
          }),
        setStage,
      );
      toast.success(`Reported ${outcome ? "YES" : "NO"} to the oracle`, { hash });
      refresh();
    } catch (e) {
      const m = decodeError(e);
      setErr(m);
      setStage("error");
      toast.error("Report failed", m);
    }
  }

  async function resolve() {
    if (!signer) return connect();
    setErr(undefined);
    try {
      const { hash } = await runTx(
        () => marketWrite(marketId, signer).resolve(),
        setStage,
      );
      toast.success("Market resolved", {
        hash,
        message: "Outcome pulled from the oracle.",
      });
      refresh();
    } catch (e) {
      const m = decodeError(e);
      setErr(m);
      setStage("error");
      toast.error("Resolve failed", m);
    }
  }

  return (
    <div className="card border-boss/20 p-5">
      <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-boss">
        Resolution
      </h3>

      <p className="mt-2 text-xs text-zinc-500">
        {status === "open" ? (
          <>
            Closes at ledger{" "}
            <span className="tabnum text-zinc-300">{market.close_ledger}</span>
            {latestLedger != null && (
              <>
                {" "}
                · now{" "}
                <span className="tabnum text-zinc-300">{latestLedger}</span>
              </>
            )}
            . Resolvable once closed.
          </>
        ) : (
          "Market closed. Resolve to pull the outcome from the oracle and open claims."
        )}
      </p>

      {isReporter && (
        <div className="mt-4">
          <div className="label">Reporter · publish outcome</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className="btn-yes" onClick={() => report(true)} disabled={busy}>
              Report YES
            </button>
            <button className="btn-no" onClick={() => report(false)} disabled={busy}>
              Report NO
            </button>
          </div>
        </div>
      )}

      <button
        className="btn-boss mt-4 w-full"
        onClick={resolve}
        disabled={busy || status !== "awaiting"}
      >
        {busy ? "Working…" : "Resolve from oracle"}
      </button>

      <TxSteps stage={stage} error={err} />
    </div>
  );
}

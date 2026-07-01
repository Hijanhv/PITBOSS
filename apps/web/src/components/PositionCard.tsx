"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MarketData } from "@/lib/stellar";
import { marketWrite } from "@/lib/stellar";
import { useWallet } from "@/lib/wallet";
import { usePosition } from "@/lib/hooks";
import { useToast } from "./Toast";
import { TxSteps } from "./TxSteps";
import { runTx, decodeError, type TxStage } from "@/lib/tx";
import { fmtNum, fmtXlm, stroopsToXlm } from "@/lib/format";
import { computePayout } from "@/lib/odds";

export function PositionCard({
  marketId,
  market,
}: {
  marketId: string;
  market: MarketData;
}) {
  const { signer } = useWallet();
  const { data: pos } = usePosition(marketId, signer?.address);
  const qc = useQueryClient();
  const toast = useToast();
  const [stage, setStage] = useState<TxStage>("idle");
  const [err, setErr] = useState<string>();

  if (!signer) return null;
  const yes = pos?.yes ?? 0n;
  const no = pos?.no ?? 0n;
  if (yes === 0n && no === 0n) return null;

  const claimed = pos?.claimed ?? false;
  const winningStakeStroops = market.resolved
    ? market.outcome
      ? yes
      : no
    : 0n;
  const payout = market.resolved
    ? computePayout(
        stroopsToXlm(winningStakeStroops),
        market.outcome ? "yes" : "no",
        stroopsToXlm(market.pool_yes),
        stroopsToXlm(market.pool_no),
      )
    : 0;
  const canClaim = market.resolved && !claimed && winningStakeStroops > 0n;
  const busy = stage !== "idle" && stage !== "success" && stage !== "error";

  async function claim() {
    if (!signer) return;
    setErr(undefined);
    try {
      const { hash } = await runTx(
        () => marketWrite(marketId, signer).claim({ bettor: signer.address }),
        setStage,
      );
      toast.success("Winnings claimed", {
        hash,
        message: `Paid out ${fmtNum(payout)} XLM.`,
      });
      qc.invalidateQueries({ queryKey: ["position", marketId] });
      qc.invalidateQueries({ queryKey: ["tape"] });
      setTimeout(() => setStage("idle"), 1600);
    } catch (e) {
      const m = decodeError(e);
      setErr(m);
      setStage("error");
      toast.error("Claim failed", m);
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-zinc-300">
        Your position
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="YES" value={fmtXlm(yes)} accent="text-yes-bright" />
        <Stat label="NO" value={fmtXlm(no)} accent="text-no-bright" />
      </div>

      {market.resolved && (
        <div className="mt-4">
          {winningStakeStroops > 0n ? (
            claimed ? (
              <p className="text-sm text-zinc-400">
                Claimed ✓ — you won{" "}
                <span className="tabnum text-boss">{fmtXlm(payout)} XLM</span>.
              </p>
            ) : (
              <>
                <button
                  className="btn-boss w-full"
                  onClick={claim}
                  disabled={!canClaim || busy}
                >
                  {busy
                    ? "Claiming…"
                    : `Claim ${fmtXlm(payout)} XLM`}
                </button>
                <TxSteps stage={stage} error={err} />
              </>
            )
          ) : (
            <p className="text-sm text-zinc-500">
              You backed the losing side — nothing to claim.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-pit-950/40 p-3">
      <div className={`text-xs font-bold uppercase tracking-widest ${accent}`}>
        {label}
      </div>
      <div className="tabnum mt-1 text-lg font-semibold text-white">{value}</div>
      <div className="text-[10px] text-zinc-600">XLM staked</div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MarketData } from "@/lib/stellar";
import { marketWrite } from "@/lib/stellar";
import { useWallet } from "@/lib/wallet";
import { useBalance } from "@/lib/hooks";
import { useToast } from "./Toast";
import { TxSteps } from "./TxSteps";
import { runTx, decodeError, type TxStage } from "@/lib/tx";
import { applyFee, quotePayout, type Side } from "@/lib/odds";
import { fmtNum, stroopsToXlm, xlmToStroops } from "@/lib/format";

const QUICK = [10, 50, 100, 250];

export function BetPanel({
  marketId,
  market,
}: {
  marketId: string;
  market: MarketData;
}) {
  const { signer, connect } = useWallet();
  const { data: balance } = useBalance(signer?.address);
  const toast = useToast();
  const qc = useQueryClient();

  const [side, setSide] = useState<Side>("yes");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<TxStage>("idle");
  const [err, setErr] = useState<string>();

  const amt = parseFloat(amount) || 0;
  const { fee, net } = applyFee(amt, market.fee_bps);
  const poolYes = stroopsToXlm(market.pool_yes);
  const poolNo = stroopsToXlm(market.pool_no);
  const payout = quotePayout(net, side, poolYes, poolNo);
  const multiple = net > 0 ? payout / net : 0;

  const busy = stage !== "idle" && stage !== "success" && stage !== "error";
  const insufficient = balance != null && amt > balance;
  const canBet = amt > 0 && !insufficient && !busy;

  async function place() {
    if (!signer) {
      connect();
      return;
    }
    setErr(undefined);
    try {
      const { hash } = await runTx(
        () =>
          marketWrite(marketId, signer).bet({
            bettor: signer.address,
            side: side === "yes",
            amount: xlmToStroops(amt),
          }),
        setStage,
      );
      toast.success(`Bet ${fmtNum(amt)} XLM on ${side.toUpperCase()}`, {
        hash,
        message: "Position added to the pool.",
      });
      setAmount("");
      qc.invalidateQueries({ queryKey: ["market", marketId] });
      qc.invalidateQueries({ queryKey: ["position", marketId] });
      qc.invalidateQueries({ queryKey: ["tape"] });
      qc.invalidateQueries({ queryKey: ["treasury-total"] });
      setTimeout(() => setStage("idle"), 1600);
    } catch (e) {
      const m = decodeError(e);
      setErr(m);
      setStage("error");
      toast.error("Bet failed", m);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-zinc-300">
          Place a bet
        </h3>
        {balance != null && (
          <span className="tabnum text-xs text-zinc-500">
            balance {fmtNum(balance)} XLM
          </span>
        )}
      </div>

      {/* side toggle */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("yes")}
          className={`btn ${
            side === "yes"
              ? "border border-yes bg-yes/20 text-yes-bright shadow-glow-yes"
              : "btn-ghost"
          }`}
        >
          YES
        </button>
        <button
          onClick={() => setSide("no")}
          className={`btn ${
            side === "no"
              ? "border border-no bg-no/20 text-no-bright shadow-glow-no"
              : "btn-ghost"
          }`}
        >
          NO
        </button>
      </div>

      {/* amount */}
      <div className="mt-4">
        <label className="label">Amount (XLM)</label>
        <input
          className="input mt-1.5 tabnum"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        />
        <div className="mt-2 flex gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="chip tabnum hover:border-boss/40 hover:text-boss"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* quote */}
      <dl className="mt-4 space-y-1.5 rounded-xl border border-white/5 bg-pit-950/40 p-3 text-xs">
        <Row label={`Protocol fee (${(market.fee_bps / 100).toFixed(2)}%)`}>
          {fmtNum(fee)} XLM → treasury
        </Row>
        <Row label="Into pool (net)">{fmtNum(net)} XLM</Row>
        <Row label="Payout if you win" strong>
          <span className="text-boss">
            {fmtNum(payout)} XLM{" "}
            <span className="text-zinc-500">({multiple > 0 ? `${fmtNum(multiple)}×` : "—"})</span>
          </span>
        </Row>
      </dl>

      {insufficient && (
        <p className="mt-2 text-xs text-no-bright">Insufficient balance.</p>
      )}

      <button
        className={`mt-4 w-full ${side === "yes" ? "btn-yes" : "btn-no"} ${
          !signer ? "btn-boss" : ""
        }`}
        disabled={!!signer && !canBet}
        onClick={place}
      >
        {!signer
          ? "Connect wallet to bet"
          : busy
            ? "Working…"
            : `Bet ${side.toUpperCase()}`}
      </button>

      <TxSteps stage={stage} error={err} />
    </div>
  );
}

function Row({
  label,
  children,
  strong,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`tabnum ${strong ? "font-semibold text-zinc-100" : "text-zinc-300"}`}>
        {children}
      </dd>
    </div>
  );
}

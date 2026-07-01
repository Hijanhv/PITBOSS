"use client";
import { useEffect, useRef, useState } from "react";
import { computeOdds } from "@/lib/odds";
import { fmtNum, fmtPct, fmtXlm, stroopsToXlm } from "@/lib/format";

interface Props {
  poolYes: bigint;
  poolNo: bigint;
  outcome?: boolean | null; // set when resolved
  compact?: boolean;
}

export function OddsBar({ yesPct }: { yesPct: number }) {
  const yes = Math.max(2, Math.min(98, yesPct));
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-pit-700">
      <div
        className="h-full bg-gradient-to-r from-yes-dim to-yes transition-[width] duration-500"
        style={{ width: `${yes}%` }}
      />
      <div
        className="h-full flex-1 bg-gradient-to-r from-no to-no-dim transition-[width] duration-500"
      />
    </div>
  );
}

export function ToteBoard({ poolYes, poolNo, outcome, compact }: Props) {
  const y = stroopsToXlm(poolYes);
  const n = stroopsToXlm(poolNo);
  const odds = computeOdds(y, n);

  const [flash, setFlash] = useState<"yes" | "no" | null>(null);
  const prev = useRef(odds.yesPct);
  useEffect(() => {
    const delta = odds.yesPct - prev.current;
    if (Math.abs(delta) > 0.05) {
      setFlash(delta > 0 ? "yes" : "no");
      const t = setTimeout(() => setFlash(null), 900);
      prev.current = odds.yesPct;
      return () => clearTimeout(t);
    }
    prev.current = odds.yesPct;
  }, [odds.yesPct]);

  if (compact) {
    return (
      <div>
        <OddsBar yesPct={odds.yesPct} />
        <div className="mt-1.5 flex justify-between text-xs tabnum">
          <span className="text-yes-bright">{fmtPct(odds.yesPct)} YES</span>
          <span className="text-no-bright">NO {fmtPct(odds.noPct)}</span>
        </div>
      </div>
    );
  }

  const won = (side: "yes" | "no") =>
    outcome != null && ((side === "yes") === outcome);

  return (
    <div>
      <OddsBar yesPct={odds.yesPct} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["yes", "no"] as const).map((side) => {
          const isYes = side === "yes";
          const pct = isYes ? odds.yesPct : odds.noPct;
          const dec = isYes ? odds.yesDecimal : odds.noDecimal;
          const poolStroops = isYes ? poolYes : poolNo;
          return (
            <div
              key={side}
              className={`rounded-xl border p-3.5 transition-colors ${
                isYes ? "border-yes/20 bg-yes/[0.06]" : "border-no/20 bg-no/[0.06]"
              } ${flash === side ? "animate-steam" : ""} ${
                won(side) ? "ring-2 ring-boss/60" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    isYes ? "text-yes-bright" : "text-no-bright"
                  }`}
                >
                  {side}
                </span>
                {won(side) && <span className="chip !py-0.5 text-boss">WON</span>}
              </div>
              <div className="tabnum mt-1 text-2xl font-bold text-white">
                {fmtPct(pct, 1)}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
                <span className="tabnum">
                  {dec > 0 ? `${fmtNum(dec, 2)}×` : "—"}
                </span>
                <span className="tabnum">{fmtXlm(poolStroops)} XLM</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

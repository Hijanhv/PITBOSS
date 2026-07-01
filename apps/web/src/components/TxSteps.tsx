"use client";
import { STAGE_LABEL, STAGE_ORDER, type TxStage } from "@/lib/tx";

export function TxSteps({ stage, error }: { stage: TxStage; error?: string }) {
  if (stage === "idle") return null;

  if (stage === "error") {
    return (
      <div className="mt-3 rounded-lg border border-no/30 bg-no/10 p-2.5 text-xs text-no-bright">
        {error ?? "Transaction failed."}
      </div>
    );
  }

  const activeIdx = STAGE_ORDER.indexOf(stage);
  return (
    <ol className="mt-3 space-y-1.5">
      {STAGE_ORDER.map((s, i) => {
        const done = stage === "success" || activeIdx > i;
        const active = s === stage && stage !== "success";
        return (
          <li key={s} className="flex items-center gap-2 text-xs">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                done
                  ? "bg-yes text-pit-950"
                  : active
                    ? "bg-boss text-pit-950"
                    : "bg-white/10 text-zinc-500"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={
                active ? "text-zinc-100" : done ? "text-zinc-400" : "text-zinc-600"
              }
            >
              {STAGE_LABEL[s]}
            </span>
            {active && (
              <span className="ml-auto h-3 w-3 animate-spin rounded-full border-2 border-boss/30 border-t-boss" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

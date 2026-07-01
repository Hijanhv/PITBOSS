"use client";
import { useTape } from "@/lib/hooks";
import { fmtXlm, truncate } from "@/lib/format";
import type { TapeEvent } from "@/lib/events";

function itemText(e: TapeEvent): string {
  const who = e.actor ? truncate(e.actor, 4, 4) : "";
  const amt = e.amountStroops ? `${fmtXlm(e.amountStroops)} XLM` : "";
  switch (e.kind) {
    case "bet":
      return `BET ${e.side?.toUpperCase()} · ${amt} · ${who}`;
    case "created":
      return `NEW MARKET · ${e.question ?? ""}`;
    case "resolved":
      return `RESOLVED · ${e.side?.toUpperCase()}`;
    case "outcome":
      return `ORACLE REPORT · ${e.side?.toUpperCase()}`;
    case "claim":
      return `CLAIM · ${amt} · ${who}`;
    case "fee":
      return `FEE → TREASURY · ${amt}`;
    default:
      return e.label;
  }
}

function color(e: TapeEvent): string {
  if (e.side === "yes") return "text-yes-bright";
  if (e.side === "no") return "text-no-bright";
  if (e.kind === "fee") return "text-boss";
  return "text-zinc-300";
}

export function Tape() {
  const { data } = useTape();
  const events = data ?? [];

  if (!events.length) {
    return (
      <div className="border-y border-white/5 bg-pit-950/60">
        <div className="mx-auto max-w-6xl px-4 py-1.5 text-[11px] tracking-[0.2em] text-zinc-600">
          ● LIVE TAPE · waiting for action…
        </div>
      </div>
    );
  }

  const doubled = [...events, ...events];
  return (
    <div className="group overflow-hidden border-y border-white/5 bg-pit-950/60">
      <div className="flex w-max animate-marquee items-center gap-6 py-1.5 pl-4 group-hover:[animation-play-state:paused]">
        {doubled.map((e, i) => (
          <span
            key={`${e.id}-${i}`}
            className="flex items-center gap-2 whitespace-nowrap text-[11px] font-medium tracking-wide tabnum"
          >
            <span className="h-1 w-1 rounded-full bg-boss/60" />
            <span className={color(e)}>{itemText(e)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

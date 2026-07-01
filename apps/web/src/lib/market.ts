import type { MarketData } from "./stellar";

export type MarketStatus = "open" | "awaiting" | "resolved";

export function marketStatus(m: MarketData, latestLedger?: number): MarketStatus {
  if (m.resolved) return "resolved";
  if (latestLedger != null && latestLedger >= m.close_ledger) return "awaiting";
  return "open";
}

export const STATUS_META: Record<
  MarketStatus,
  { label: string; className: string }
> = {
  open: { label: "OPEN", className: "border-yes/30 bg-yes/10 text-yes-bright" },
  awaiting: {
    label: "AWAITING ORACLE",
    className: "border-boss/30 bg-boss/10 text-boss",
  },
  resolved: {
    label: "RESOLVED",
    className: "border-white/15 bg-white/5 text-zinc-300",
  },
};

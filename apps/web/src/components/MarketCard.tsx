"use client";
import Link from "next/link";
import type { MarketWithData } from "@/lib/hooks";
import { ToteBoard } from "./ToteBoard";
import { fmtXlm } from "@/lib/format";
import { marketStatus, STATUS_META } from "@/lib/market";

export function MarketCard({
  item,
  latestLedger,
}: {
  item: MarketWithData;
  latestLedger?: number;
}) {
  const { ref, data } = item;
  const total = data.pool_yes + data.pool_no;
  const status = marketStatus(data, latestLedger);
  const meta = STATUS_META[status];

  return (
    <Link href={`/market/${ref.address}`} className="card card-hover block p-5">
      <div className="flex items-center justify-between gap-2">
        <span className={`chip !border ${meta.className}`}>{meta.label}</span>
        <span className="tabnum text-xs text-zinc-500">{fmtXlm(total)} XLM</span>
      </div>
      <h3 className="mt-3 line-clamp-2 min-h-[2.75rem] text-base font-semibold text-zinc-100">
        {data.question}
      </h3>
      <div className="mt-4">
        <ToteBoard poolYes={data.pool_yes} poolNo={data.pool_no} compact />
      </div>
    </Link>
  );
}

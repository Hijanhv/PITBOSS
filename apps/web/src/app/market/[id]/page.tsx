"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useLatestLedger,
  useMarket,
  useOracleIsReporter,
  useTape,
} from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { ToteBoard } from "@/components/ToteBoard";
import { BetPanel } from "@/components/BetPanel";
import { PositionCard } from "@/components/PositionCard";
import { MarketAdmin } from "@/components/MarketAdmin";
import { Skeleton } from "@/components/Skeletons";
import { marketStatus, STATUS_META } from "@/lib/market";
import { fmtXlm, fmtNum, truncate } from "@/lib/format";
import { explorerContract, explorerTx } from "@/lib/config";
import type { MarketData } from "@/lib/stellar";
import type { TapeEvent } from "@/lib/events";

export default function MarketPage() {
  const params = useParams();
  const id = String(params.id);
  const { data: market, isLoading, isError } = useMarket(id);
  const { data: latest } = useLatestLedger();
  const { signer } = useWallet();
  const { data: isReporter } = useOracleIsReporter(signer?.address);
  const { data: tape } = useTape([id]);

  if (isLoading) return <MarketSkeleton />;
  if (isError || !market)
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-400">Market not found.</p>
        <Link href="/" className="btn-ghost mt-4">
          Back to markets
        </Link>
      </div>
    );

  const status = marketStatus(market, latest);
  const meta = STATUS_META[status];
  const total = market.pool_yes + market.pool_no;

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-zinc-500 transition hover:text-white">
        ← All markets
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between gap-2">
              <span className={`chip !border ${meta.className}`}>{meta.label}</span>
              <span className="tabnum text-xs text-zinc-500">
                {fmtXlm(total)} XLM pool
              </span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-white">
              {market.question}
            </h1>
            {market.resolved && (
              <p className="mt-2 text-sm text-zinc-400">
                Settled outcome:{" "}
                <b className={market.outcome ? "text-yes-bright" : "text-no-bright"}>
                  {market.outcome ? "YES" : "NO"}
                </b>
              </p>
            )}
            <div className="mt-5">
              <ToteBoard
                poolYes={market.pool_yes}
                poolNo={market.pool_no}
                outcome={market.resolved ? market.outcome : null}
              />
            </div>
          </div>

          <MarketMeta market={market} id={id} />
          <MarketTape tape={tape} />
        </div>

        <div className="space-y-6">
          {status === "open" && <BetPanel marketId={id} market={market} />}
          <PositionCard marketId={id} market={market} />
          <MarketAdmin
            marketId={id}
            market={market}
            status={status}
            isReporter={!!isReporter}
            latestLedger={latest}
          />
        </div>
      </div>
    </div>
  );
}

function MarketMeta({ market, id }: { market: MarketData; id: string }) {
  const rows: [string, string][] = [
    ["Market", id],
    ["Oracle", market.oracle],
    ["Treasury", market.treasury],
    ["Factory", market.factory],
  ];
  return (
    <div className="card p-5">
      <h3 className="label">The mesh · on-chain</h3>
      <dl className="mt-3 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <dt className="text-zinc-500">{k}</dt>
            <a
              href={explorerContract(v)}
              target="_blank"
              rel="noreferrer"
              className="tabnum text-zinc-300 transition hover:text-boss"
            >
              {truncate(v, 6, 6)} ↗
            </a>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <dt className="text-zinc-500">Fee</dt>
          <dd className="tabnum text-zinc-300">
            {(market.fee_bps / 100).toFixed(2)}%
          </dd>
        </div>
        <div className="flex items-center justify-between text-sm">
          <dt className="text-zinc-500">Close ledger</dt>
          <dd className="tabnum text-zinc-300">{market.close_ledger}</dd>
        </div>
      </dl>
    </div>
  );
}

function MarketTape({ tape }: { tape?: TapeEvent[] }) {
  const events = (tape ?? []).slice(0, 12);
  return (
    <div className="card p-5">
      <h3 className="label">Live tape</h3>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">No activity yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 text-xs tabnum"
            >
              <span
                className={
                  e.side === "yes"
                    ? "text-yes-bright"
                    : e.side === "no"
                      ? "text-no-bright"
                      : e.kind === "fee"
                        ? "text-boss"
                        : "text-zinc-400"
                }
              >
                {e.label}
                {e.side ? ` ${e.side.toUpperCase()}` : ""}
                {e.amountStroops ? ` · ${fmtXlm(e.amountStroops)} XLM` : ""}
              </span>
              {e.actor && (
                <span className="text-zinc-600">{truncate(e.actor, 4, 4)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MarketSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="card p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-7 w-3/4" />
        <Skeleton className="mt-6 h-2.5 w-full rounded-full" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

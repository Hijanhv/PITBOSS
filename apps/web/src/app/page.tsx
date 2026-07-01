"use client";
import Link from "next/link";
import {
  useLatestLedger,
  useMarkets,
  useTreasuryTotal,
} from "@/lib/hooks";
import { MarketCard } from "@/components/MarketCard";
import { MarketGridSkeleton } from "@/components/Skeletons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fmtXlm } from "@/lib/format";

export default function Home() {
  const { data: markets, isLoading, isError, refetch } = useMarkets();
  const { data: latest } = useLatestLedger();
  const { data: treasury } = useTreasuryTotal();

  return (
    <div className="space-y-10">
      <Hero />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Markets" value={markets ? String(markets.length) : "—"} />
        <Stat
          label="Fees → treasury"
          value={treasury != null ? `${fmtXlm(treasury)}` : "—"}
          suffix="XLM"
        />
        <Stat label="Contracts" value="4" suffix="on-chain" />
        <Stat
          label="Ledger"
          value={latest ? String(latest) : "—"}
          suffix="testnet"
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            Live markets
          </h2>
          <Link href="/create" className="btn-boss">
            + New market
          </Link>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <MarketGridSkeleton />
          ) : isError ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-no-bright">Couldn&apos;t load markets.</p>
              <button className="btn-ghost mt-4" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : !markets || markets.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-zinc-400">No markets yet.</p>
              <Link href="/create" className="btn-boss mt-4">
                Be the first to open one
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((m) => (
                <MarketCard key={m.ref.address} item={m} latestLedger={latest} />
              ))}
            </div>
          )}
        </ErrorBoundary>
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-pit-850/60 to-pit-900/40 px-6 py-12 sm:px-10 sm:py-16">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-boss/10 blur-3xl" />
      <div className="relative max-w-2xl">
        <span className="chip border-boss/30 text-boss">
          ● Permissionless · Stellar testnet
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
          Every market
          <br />
          answers to the <span className="text-boss">boss</span>.
        </h1>
        <p className="mt-4 max-w-xl text-zinc-400">
          A permissionless pari-mutuel prediction-market protocol. Anyone spins up
          a market from the Factory; each one shares a resolution Oracle and routes
          fees to a common Treasury — a real cross-contract mesh.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-500">
          {[
            "Factory → deploys markets",
            "Market → reads Oracle",
            "Market → pays Treasury",
          ].map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="tabnum mt-1 text-xl font-bold text-white">
        {value}
        {suffix && (
          <span className="ml-1 text-xs font-normal text-zinc-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}

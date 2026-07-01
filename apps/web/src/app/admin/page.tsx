"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { oracleWrite, treasuryWrite } from "@/lib/stellar";
import { useWallet } from "@/lib/wallet";
import {
  useMarkets,
  useOracleIsReporter,
  useProtocolAdmin,
  useTreasuryTotal,
} from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { runTx, decodeError } from "@/lib/tx";
import { fmtXlm, truncate, xlmToStroops } from "@/lib/format";
import { explorerContract } from "@/lib/config";
import { config } from "@/lib/config";

export default function AdminPage() {
  const { signer, connect } = useWallet();
  const { data: isReporter } = useOracleIsReporter(signer?.address);
  const { data: admin } = useProtocolAdmin();
  const { data: markets } = useMarkets();
  const { data: treasuryTotal } = useTreasuryTotal();
  const qc = useQueryClient();
  const toast = useToast();

  const isAdmin = !!signer && !!admin && signer.address === admin;
  const [busy, setBusy] = useState<string | null>(null);
  const unresolved = useMemo(
    () => (markets ?? []).filter((m) => !m.data.resolved),
    [markets],
  );

  const [newReporter, setNewReporter] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  async function run(key: string, fn: () => Promise<{ hash?: string }>, ok: string) {
    if (!signer) return connect();
    setBusy(key);
    try {
      const { hash } = await fn();
      toast.success(ok, { hash });
      qc.invalidateQueries();
    } catch (e) {
      toast.error("Failed", decodeError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Oracle & Treasury
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Reporters publish outcomes; the Treasury holds protocol fees routed from
          every market.
        </p>
      </div>

      {/* access */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className="label">You</span>
        {signer ? (
          <span className="chip tabnum">{truncate(signer.address, 5, 5)}</span>
        ) : (
          <button className="btn-boss !py-2" onClick={connect}>
            Connect wallet
          </button>
        )}
        {signer && (
          <>
            <span
              className={`chip ${
                isReporter
                  ? "border-yes/30 text-yes-bright"
                  : "border-white/10 text-zinc-500"
              }`}
            >
              {isReporter ? "REPORTER ✓" : "not a reporter"}
            </span>
            {isAdmin && <span className="chip border-boss/30 text-boss">ADMIN</span>}
          </>
        )}
      </div>

      {/* treasury */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="label">Treasury</h2>
          <a
            href={explorerContract(config.treasuryId)}
            target="_blank"
            rel="noreferrer"
            className="tabnum text-xs text-zinc-500 hover:text-boss"
          >
            {truncate(config.treasuryId, 5, 5)} ↗
          </a>
        </div>
        <div className="tabnum mt-2 text-3xl font-bold text-white">
          {treasuryTotal != null ? fmtXlm(treasuryTotal) : "—"}{" "}
          <span className="text-sm font-normal text-zinc-500">XLM collected</span>
        </div>
        {isAdmin && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className="input"
              placeholder="Withdraw to G…"
              value={withdrawTo}
              onChange={(e) => setWithdrawTo(e.target.value.trim())}
            />
            <input
              className="input tabnum sm:max-w-[9rem]"
              placeholder="XLM"
              inputMode="decimal"
              value={withdrawAmt}
              onChange={(e) => setWithdrawAmt(e.target.value.replace(/[^0-9.]/g, ""))}
            />
            <button
              className="btn-ghost"
              disabled={busy === "wd" || !withdrawTo || !(parseFloat(withdrawAmt) > 0)}
              onClick={() =>
                run(
                  "wd",
                  () =>
                    runTx(
                      () =>
                        treasuryWrite(signer!).withdraw({
                          to: withdrawTo,
                          amount: xlmToStroops(parseFloat(withdrawAmt)),
                        }),
                      () => {},
                    ),
                  "Withdrawn",
                )
              }
            >
              {busy === "wd" ? "…" : "Withdraw"}
            </button>
          </div>
        )}
      </div>

      {/* add reporter */}
      {isAdmin && (
        <div className="card p-5">
          <h2 className="label">Authorize a reporter</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="input"
              placeholder="Reporter address G…"
              value={newReporter}
              onChange={(e) => setNewReporter(e.target.value.trim())}
            />
            <button
              className="btn-boss"
              disabled={busy === "ar" || newReporter.length < 56}
              onClick={() =>
                run(
                  "ar",
                  () =>
                    runTx(
                      () => oracleWrite(signer!).add_reporter({ reporter: newReporter }),
                      () => {},
                    ),
                  "Reporter added",
                ).then(() => setNewReporter(""))
              }
            >
              {busy === "ar" ? "…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* report outcomes */}
      <div className="card p-5">
        <h2 className="label">Unresolved markets</h2>
        {!isReporter && (
          <p className="mt-2 text-xs text-zinc-500">
            Connect an authorized reporter account to publish outcomes.
          </p>
        )}
        <ul className="mt-3 divide-y divide-white/5">
          {unresolved.length === 0 && (
            <li className="py-4 text-sm text-zinc-600">Nothing to resolve.</li>
          )}
          {unresolved.map((m) => (
            <li
              key={m.ref.address}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <Link
                href={`/market/${m.ref.address}`}
                className="min-w-0 flex-1 truncate text-sm text-zinc-200 hover:text-boss"
              >
                {m.data.question}
              </Link>
              {isReporter && (
                <div className="flex gap-1.5">
                  <button
                    className="btn-yes !px-3 !py-1.5"
                    disabled={busy === m.ref.address}
                    onClick={() =>
                      run(
                        m.ref.address,
                        () =>
                          runTx(
                            () =>
                              oracleWrite(signer!).report_outcome({
                                reporter: signer!.address,
                                market_id: m.data.market_id,
                                outcome: true,
                              }),
                            () => {},
                          ),
                        "Reported YES",
                      )
                    }
                  >
                    YES
                  </button>
                  <button
                    className="btn-no !px-3 !py-1.5"
                    disabled={busy === m.ref.address}
                    onClick={() =>
                      run(
                        m.ref.address,
                        () =>
                          runTx(
                            () =>
                              oracleWrite(signer!).report_outcome({
                                reporter: signer!.address,
                                market_id: m.data.market_id,
                                outcome: false,
                              }),
                            () => {},
                          ),
                        "Reported NO",
                      )
                    }
                  >
                    NO
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";
import { useQuery } from "@tanstack/react-query";
import { factoryRead, marketRead, oracleRead, rpcServer, treasuryRead } from "./stellar";
import type { MarketData, MarketRef } from "./stellar";
import { fetchTape } from "./events";

export function useLatestLedger() {
  return useQuery({
    queryKey: ["latest-ledger"],
    queryFn: async () => (await rpcServer().getLatestLedger()).sequence,
    refetchInterval: 5000,
  });
}

export interface MarketWithData {
  ref: MarketRef;
  data: MarketData;
}

export function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: async (): Promise<MarketWithData[]> => {
      const refs = (await factoryRead().list_markets()).result;
      return Promise.all(
        refs.map(async (ref) => ({
          ref,
          data: (await marketRead(ref.address).get_market()).result.unwrap(),
        })),
      );
    },
    refetchInterval: 8000,
  });
}

export function useMarket(id: string) {
  return useQuery({
    queryKey: ["market", id],
    enabled: !!id,
    queryFn: async () => (await marketRead(id).get_market()).result.unwrap(),
    refetchInterval: 5000,
  });
}

export interface Position {
  yes: bigint;
  no: bigint;
  claimed: boolean;
}

export function usePosition(id: string, user?: string | null) {
  return useQuery({
    queryKey: ["position", id, user],
    enabled: !!id && !!user,
    queryFn: async (): Promise<Position> => {
      const c = marketRead(id);
      const [yes, no, claimed] = await Promise.all([
        c.get_stake({ user: user!, side: true }),
        c.get_stake({ user: user!, side: false }),
        c.has_claimed({ user: user! }),
      ]);
      return { yes: yes.result, no: no.result, claimed: claimed.result };
    },
    refetchInterval: 5000,
  });
}

export function useTape(extraIds: string[] = []) {
  return useQuery({
    queryKey: ["tape", ...extraIds],
    queryFn: () => fetchTape(extraIds),
    refetchInterval: 4000,
  });
}

/** Native XLM balance of an account, via Horizon. 0 if the account is new. */
export function useBalance(address?: string | null) {
  return useQuery({
    queryKey: ["balance", address],
    enabled: !!address,
    refetchInterval: 8000,
    queryFn: async (): Promise<number> => {
      const { config } = await import("./config");
      const res = await fetch(`${config.horizon}/accounts/${address}`);
      if (!res.ok) return 0;
      const acc = await res.json();
      const native = (acc.balances ?? []).find(
        (b: { asset_type: string }) => b.asset_type === "native",
      );
      return native ? parseFloat(native.balance) : 0;
    },
  });
}

export function useTreasuryTotal() {
  return useQuery({
    queryKey: ["treasury-total"],
    queryFn: async () => (await treasuryRead().total_collected()).result,
    refetchInterval: 8000,
  });
}

export function useProtocolAdmin() {
  return useQuery({
    queryKey: ["protocol-admin"],
    queryFn: async () => (await oracleRead().get_admin()).result,
    staleTime: 60_000,
  });
}

export function useOracleIsReporter(user?: string | null) {
  return useQuery({
    queryKey: ["is-reporter", user],
    enabled: !!user,
    queryFn: async () => (await oracleRead().is_reporter({ reporter: user! })).result,
  });
}

/**
 * Pari-mutuel odds + payout math — the single source of truth the UI renders.
 *
 * In a pari-mutuel pool everyone who backs the winning side splits the entire
 * pot pro-rata by stake:
 *
 *   payout = winning_stake * (pool_yes + pool_no) / winning_pool
 *
 * Implied probability of a side is just its share of the pot; decimal odds are
 * the payout multiple on a unit stake (total / side_pool).
 */
export type Side = "yes" | "no";

export interface Odds {
  /** Implied probability of YES, 0..100. */
  yesPct: number;
  noPct: number;
  /** Decimal odds (payout multiple incl. stake). 0 when a side is empty. */
  yesDecimal: number;
  noDecimal: number;
  total: number;
}

/** Pools are passed in a common unit (stroops or XLM) — only ratios matter. */
export function computeOdds(poolYes: number, poolNo: number): Odds {
  const yes = Math.max(0, poolYes);
  const no = Math.max(0, poolNo);
  const total = yes + no;
  if (total <= 0) {
    return { yesPct: 50, noPct: 50, yesDecimal: 0, noDecimal: 0, total: 0 };
  }
  return {
    yesPct: (yes / total) * 100,
    noPct: (no / total) * 100,
    yesDecimal: yes > 0 ? total / yes : 0,
    noDecimal: no > 0 ? total / no : 0,
    total,
  };
}

/**
 * Gross payout if `stake` on `side` wins, given the pools *after* the stake is
 * included. Returns the full amount returned to the bettor (stake + winnings).
 */
export function computePayout(
  stake: number,
  side: Side,
  poolYes: number,
  poolNo: number,
): number {
  const total = poolYes + poolNo;
  const winningPool = side === "yes" ? poolYes : poolNo;
  if (winningPool <= 0 || stake <= 0) return 0;
  return (stake * total) / winningPool;
}

/**
 * What a *prospective* bet of `amount` (net of fee) on `side` would pay out if
 * it won, accounting for the fact that it grows its own winning pool.
 */
export function quotePayout(
  amount: number,
  side: Side,
  poolYes: number,
  poolNo: number,
): number {
  const nextYes = side === "yes" ? poolYes + amount : poolYes;
  const nextNo = side === "no" ? poolNo + amount : poolNo;
  return computePayout(amount, side, nextYes, nextNo);
}

/** Apply a basis-point fee, returning { fee, net }. */
export function applyFee(amount: number, feeBps: number): { fee: number; net: number } {
  const fee = Math.floor((amount * feeBps) / 10_000);
  return { fee, net: amount - fee };
}

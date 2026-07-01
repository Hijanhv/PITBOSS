export const STROOP_DECIMALS = 7;
const STROOPS_PER_XLM = 10 ** STROOP_DECIMALS;

/** Convert a stroop amount (i128 as bigint/string/number) to a float XLM value. */
export function stroopsToXlm(stroops: bigint | string | number): number {
  const b = typeof stroops === "bigint" ? stroops : BigInt(Math.trunc(Number(stroops || 0)));
  return Number(b) / STROOPS_PER_XLM;
}

/** Convert a float XLM value to a stroop bigint. */
export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * STROOPS_PER_XLM));
}

/** Format a stroop amount as a human XLM string, e.g. "1,234.50". */
export function fmtXlm(stroops: bigint | string | number, dp = 2): string {
  return stroopsToXlm(stroops).toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** Format a plain number with fixed decimals and grouping. */
export function fmtNum(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** Format a percentage 0..100. */
export function fmtPct(pct: number, dp = 1): string {
  if (!Number.isFinite(pct)) return "—";
  return `${pct.toFixed(dp)}%`;
}

/** Truncate a Stellar address/hash for compact display: GABC…WXYZ. */
export function truncate(value: string, lead = 4, tail = 4): string {
  if (!value) return "";
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

/** Hex-encode a Buffer/Uint8Array (e.g. a market_id BytesN<32>). */
export function toHex(bytes: Uint8Array | ArrayLike<number>): string {
  return Array.from(bytes as ArrayLike<number>)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

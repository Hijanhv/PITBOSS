import { describe, expect, it } from "vitest";
import { fmtXlm, stroopsToXlm, toHex, truncate, xlmToStroops } from "./format";

describe("stroop conversion", () => {
  it("round-trips XLM <-> stroops (7 decimals)", () => {
    expect(stroopsToXlm(10_000_000n)).toBe(1);
    expect(xlmToStroops(1)).toBe(10_000_000n);
    expect(stroopsToXlm(xlmToStroops(12.5))).toBe(12.5);
  });
});

describe("fmtXlm", () => {
  it("formats stroops as XLM with 2 decimals", () => {
    expect(fmtXlm(15_000_000n)).toBe("1.50");
    expect(fmtXlm(980_000_000n)).toBe("98.00");
  });
});

describe("truncate", () => {
  it("shortens long identifiers with an ellipsis", () => {
    expect(truncate("GABCDEFGHIJKLMNOP", 4, 4)).toBe("GABC…MNOP");
    expect(truncate("SHORT", 4, 4)).toBe("SHORT");
  });
});

describe("toHex", () => {
  it("hex-encodes bytes", () => {
    expect(toHex(new Uint8Array([0, 255, 16]))).toBe("00ff10");
  });
});

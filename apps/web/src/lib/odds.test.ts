import { describe, expect, it } from "vitest";
import { applyFee, computeOdds, computePayout, quotePayout } from "./odds";

describe("computeOdds", () => {
  it("splits implied probability by pool share", () => {
    const o = computeOdds(800, 200);
    expect(o.yesPct).toBeCloseTo(80);
    expect(o.noPct).toBeCloseTo(20);
    expect(o.yesDecimal).toBeCloseTo(1.25); // 1000 / 800
    expect(o.noDecimal).toBeCloseTo(5); // 1000 / 200
  });

  it("is 50/50 with no liquidity", () => {
    const o = computeOdds(0, 0);
    expect(o.yesPct).toBe(50);
    expect(o.noPct).toBe(50);
    expect(o.total).toBe(0);
  });
});

describe("computePayout", () => {
  it("pays the entire pot pro-rata to the winning side", () => {
    // YES pool 400 (300 + 100), NO pool 600, total pot 1000
    expect(computePayout(300, "yes", 400, 600)).toBeCloseTo(750);
    expect(computePayout(100, "yes", 400, 600)).toBeCloseTo(250);
  });

  it("returns 0 when the winning pool is empty", () => {
    expect(computePayout(100, "yes", 0, 500)).toBe(0);
  });
});

describe("quotePayout", () => {
  it("accounts for the new bet growing its own pool", () => {
    // existing: YES 0, NO 100; bet 100 on YES => pools 100/100, pot 200 => 200
    expect(quotePayout(100, "yes", 0, 100)).toBeCloseTo(200);
  });
});

describe("applyFee", () => {
  it("splits a basis-point fee off the top", () => {
    expect(applyFee(1000, 200)).toEqual({ fee: 20, net: 980 });
    expect(applyFee(1000, 0)).toEqual({ fee: 0, net: 1000 });
  });
});

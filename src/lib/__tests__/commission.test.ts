import { describe, it, expect } from "vitest";
import { isOverrideActive, getEffectiveCommissionPercent } from "../commission";

describe("isOverrideActive", () => {
  it("returns false when override percent is null", () => {
    expect(isOverrideActive(null, null)).toBe(false);
  });

  it("returns true when override is set with no expiry", () => {
    expect(isOverrideActive(0, null)).toBe(true);
  });

  it("returns true when override is set and expiry is in the future", () => {
    const future = new Date(Date.now() + 86400000);
    expect(isOverrideActive(0, future)).toBe(true);
  });

  it("returns false when override is set but expired", () => {
    const past = new Date(Date.now() - 86400000);
    expect(isOverrideActive(0, past)).toBe(false);
  });

  it("returns true for non-zero override percent", () => {
    expect(isOverrideActive(3, null)).toBe(true);
  });
});

describe("getEffectiveCommissionPercent", () => {
  it("returns default 8 when no creator provided", () => {
    expect(getEffectiveCommissionPercent()).toBe(8);
  });

  it("returns default 8 when override is null", () => {
    expect(getEffectiveCommissionPercent({
      commissionOverridePercent: null,
      commissionOverrideExpiresAt: null,
    })).toBe(8);
  });

  it("returns 0 when active 0% override", () => {
    expect(getEffectiveCommissionPercent({
      commissionOverridePercent: 0,
      commissionOverrideExpiresAt: null,
    })).toBe(0);
  });

  it("returns default 8 when override is expired", () => {
    const past = new Date(Date.now() - 86400000);
    expect(getEffectiveCommissionPercent({
      commissionOverridePercent: 0,
      commissionOverrideExpiresAt: past,
    })).toBe(8);
  });

  it("returns custom percent when active", () => {
    const future = new Date(Date.now() + 86400000);
    expect(getEffectiveCommissionPercent({
      commissionOverridePercent: 2,
      commissionOverrideExpiresAt: future,
    })).toBe(2);
  });
});

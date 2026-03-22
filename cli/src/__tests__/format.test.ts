import { describe, it, expect } from "vitest";
import { formatPrice, buildTable } from "../lib/format.js";

describe("formatPrice", () => {
  it("formats cents to dollars", () => {
    expect(formatPrice(2900)).toBe("$29.00");
    expect(formatPrice(100)).toBe("$1.00");
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPrice(1999)).toBe("$19.99");
  });
});

describe("buildTable", () => {
  it("returns formatted table string", () => {
    const result = buildTable(["Name", "Price"], [["Widget", "$10.00"]]);
    expect(result).toContain("Name");
    expect(result).toContain("Widget");
    expect(result).toContain("$10.00");
  });

  it("handles empty rows", () => {
    const result = buildTable(["Name"], []);
    expect(result).toContain("Name");
  });
});

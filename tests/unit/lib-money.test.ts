import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/money";

describe("formatMoney", () => {
  it("formats whole amounts with two decimals", () => {
    expect(formatMoney(350)).toBe("₹350.00");
    expect(formatMoney(0)).toBe("₹0.00");
  });

  it("formats decimal amounts", () => {
    expect(formatMoney(350.5)).toBe("₹350.50");
    expect(formatMoney(0.5)).toBe("₹0.50");
  });

  it("rounds to two decimals", () => {
    expect(formatMoney(350.555)).toBe("₹350.56");
    expect(formatMoney(1.999)).toBe("₹2.00");
    expect(formatMoney(0.999)).toBe("₹1.00");
    expect(formatMoney(0.005)).toBe("₹0.01");
  });

  it("formats negative amounts", () => {
    expect(formatMoney(-350)).toBe("-₹350.00");
    expect(formatMoney(-0.5)).toBe("-₹0.50");
  });

  it("uses Indian digit grouping", () => {
    expect(formatMoney(1234567.89)).toBe("₹12,34,567.89");
    expect(formatMoney(100000)).toBe("₹1,00,000.00");
  });

  it("supports custom currencies", () => {
    expect(formatMoney(350, "USD")).toBe("$350.00");
    expect(formatMoney(350, "EUR")).toBe("€350.00");
  });

  it("does not throw on non-finite numbers (documents Intl behavior)", () => {
    expect(formatMoney(NaN)).toBe("₹NaN");
    expect(formatMoney(Infinity)).toBe("₹∞");
    expect(formatMoney(-Infinity)).toBe("-₹∞");
  });
});

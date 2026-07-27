import { describe, expect, it } from "vitest";
import { summarizeSessionBill } from "@/server/domain/bill-summary";

describe("summarizeSessionBill", () => {
  it("splits a one-bill session into table and product category totals", () => {
    const summary = summarizeSessionBill({
      tableAmount: 175,
      items: [
        { category: "CAFE", lineTotalAmount: 80 },
        { category: "BEVERAGES", lineTotalAmount: 40 },
        { category: "CIGARETTES", lineTotalAmount: 20 },
        { category: "CAFE", lineTotalAmount: 40 }
      ]
    });

    expect(summary.tableAmount).toBe(175);
    expect(summary.categoryTotals).toEqual({
      CAFE: 120,
      CIGARETTES: 20,
      BEVERAGES: 40
    });
    expect(summary.itemTotal).toBe(180);
    expect(summary.grandTotal).toBe(355);
  });
});

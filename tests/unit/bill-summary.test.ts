import { describe, expect, it } from "vitest";
import { calculateBillSegmentTableAmount, summarizeBill } from "@/server/domain/bill-summary";

describe("summarizeBill", () => {
  it("splits a one-bill session into table and product category totals", () => {
    const summary = summarizeBill({
      tableAmount: 175,
      items: [
        { category: "FOOD", lineTotalAmount: 80 },
        { category: "BEVERAGES", lineTotalAmount: 40 },
        { category: "CIGARETTES", lineTotalAmount: 20 },
        { category: "FOOD", lineTotalAmount: 40 }
      ]
    });

    expect(summary.tableAmount).toBe(175);
    expect(summary.categoryTotals).toEqual({
      FOOD: 120,
      CIGARETTES: 20,
      BEVERAGES: 40
    });
    expect(summary.itemTotal).toBe(180);
    expect(summary.grandTotal).toBe(355);
  });

  it("calculates a closed bill segment from exact elapsed minutes", () => {
    const amount = calculateBillSegmentTableAmount({
      startedAt: new Date("2026-07-27T10:00:00.000Z"),
      endedAt: new Date("2026-07-27T10:42:15.000Z"),
      hourlyRate: 350
    });

    expect(amount).toBe(250.83);
  });
});

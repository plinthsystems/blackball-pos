import { calculateBillableSeconds, calculateProratedTableCharge } from "./session-calculations";
import type { PauseInterval } from "./session-calculations";

export type BillItemCategory = "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES";

export type BillSummary = {
  tableAmount: number;
  categoryTotals: Record<"FOOD" | "CIGARETTES" | "BEVERAGES", number>;
  discountAmount: number;
  itemSubtotal: number;
  itemTotal: number;
  grandTotal: number;
};

export function summarizeBill({
  tableAmount,
  items
}: {
  tableAmount: number;
  items: Array<{ category: BillItemCategory; lineTotalAmount: number }>;
}): BillSummary {
  const categoryTotals: Record<"FOOD" | "CIGARETTES" | "BEVERAGES", number> = {
    FOOD: 0,
    CIGARETTES: 0,
    BEVERAGES: 0
  };

  for (const item of items) {
    const category = item.category === "CAFE" ? "FOOD" : item.category;
    categoryTotals[category] = roundMoney(categoryTotals[category] + item.lineTotalAmount);
  }

  const itemTotal = roundMoney(Object.values(categoryTotals).reduce((total, amount) => total + amount, 0));
  const discountAmount = roundMoney(items.reduce((total, item) => {
    const category = item.category === "CAFE" ? "FOOD" : item.category;
    return category === "FOOD" && item.lineTotalAmount < 0 ? total - item.lineTotalAmount : total;
  }, 0));
  const itemSubtotal = roundMoney(itemTotal + discountAmount);
  return {
    tableAmount: roundMoney(tableAmount),
    categoryTotals,
    discountAmount,
    itemSubtotal,
    itemTotal,
    grandTotal: roundMoney(tableAmount + itemTotal)
  };
}

export const summarizeSessionBill = summarizeBill;

export function calculateBillSegmentTableAmount({
  startedAt,
  endedAt,
  hourlyRate,
  pauses = []
}: {
  startedAt: Date;
  endedAt: Date;
  hourlyRate: number;
  pauses?: PauseInterval[];
}) {
  const elapsedSeconds = calculateBillableSeconds({ startedAt, endedAt, pauses });
  return calculateProratedTableCharge({ billableSeconds: elapsedSeconds, hourlyRate });
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export type BillItemCategory = "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES";

export type BillSummary = {
  tableAmount: number;
  categoryTotals: Record<"FOOD" | "CIGARETTES" | "BEVERAGES", number>;
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
  return {
    tableAmount: roundMoney(tableAmount),
    categoryTotals,
    itemTotal,
    grandTotal: roundMoney(tableAmount + itemTotal)
  };
}

export const summarizeSessionBill = summarizeBill;

export function calculateBillSegmentTableAmount({
  startedAt,
  endedAt,
  hourlyRate
}: {
  startedAt: Date;
  endedAt: Date;
  hourlyRate: number;
}) {
  const elapsedSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
  const billableMinutes = elapsedSeconds === 0 ? 0 : Math.ceil(elapsedSeconds / 60);
  return roundMoney((billableMinutes / 60) * hourlyRate);
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

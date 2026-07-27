export type BillItemCategory = "CAFE" | "CIGARETTES" | "BEVERAGES";

export type BillSummary = {
  tableAmount: number;
  categoryTotals: Record<BillItemCategory, number>;
  itemTotal: number;
  grandTotal: number;
};

export function summarizeSessionBill({
  tableAmount,
  items
}: {
  tableAmount: number;
  items: Array<{ category: BillItemCategory; lineTotalAmount: number }>;
}): BillSummary {
  const categoryTotals: Record<BillItemCategory, number> = {
    CAFE: 0,
    CIGARETTES: 0,
    BEVERAGES: 0
  };

  for (const item of items) {
    categoryTotals[item.category] = roundMoney(categoryTotals[item.category] + item.lineTotalAmount);
  }

  const itemTotal = roundMoney(Object.values(categoryTotals).reduce((total, amount) => total + amount, 0));
  return {
    tableAmount: roundMoney(tableAmount),
    categoryTotals,
    itemTotal,
    grandTotal: roundMoney(tableAmount + itemTotal)
  };
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

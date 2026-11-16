import { describe, expect, it } from "vitest";
import { calculateExpenseStockUnits } from "@/features/expenses/domain/expense-calculations";
import { expenseFormSchema } from "@/features/expenses/schemas";

describe("expense stock purchases", () => {
  it("converts purchased packs into individual stock units", () => {
    expect(calculateExpenseStockUnits(3, 20)).toBe(60);
  });

  it("requires a tracked stock product for inventory purchases", () => {
    const result = expenseFormSchema.safeParse({
      category: "INVENTORY_PURCHASE",
      paymentMethod: "UPI",
      spentAt: "2026-11-16",
      items: [{ description: "Cold drinks", amount: "500" }]
    });

    expect(result.success).toBe(false);
  });

  it("accepts ordinary expense lines without inventory tracking", () => {
    const result = expenseFormSchema.safeParse({
      category: "GROCERIES",
      paymentMethod: "CASH",
      spentAt: "2026-11-16",
      items: [{ description: "Kitchen groceries", amount: "320.50" }]
    });

    expect(result.success).toBe(true);
  });

  it("requires pack quantity when a line is linked to tracked stock", () => {
    const result = expenseFormSchema.safeParse({
      category: "INVENTORY_PURCHASE",
      paymentMethod: "UPI",
      spentAt: "2026-11-16",
      items: [{ description: "Soda", amount: "500", productId: "product-1" }]
    });

    expect(result.success).toBe(false);
  });
});

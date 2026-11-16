import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  tx: {
    product: { findFirst: vi.fn(), updateMany: vi.fn() },
    expense: { create: vi.fn() }
  },
  context: vi.fn(),
  requirePermission: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mocked.prisma }));
vi.mock("@/server/auth/current-employee", () => ({ getCurrentEmployeeContext: mocked.context }));
vi.mock("@/server/auth/permissions", () => ({ requirePermission: mocked.requirePermission }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createExpenseAction } from "@/features/expenses/actions";

describe("createExpenseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.context.mockResolvedValue({ businessId: "business-1" });
    mocked.prisma.$transaction.mockImplementation(async (callback: (tx: typeof mocked.tx) => Promise<unknown>) => callback(mocked.tx));
    mocked.tx.product.findFirst.mockResolvedValue({ id: "water-1", name: "Water Bottle", unitsPerPack: 12, stockUnit: "bottles" });
    mocked.tx.product.updateMany.mockResolvedValue({ count: 1 });
    mocked.tx.expense.create.mockImplementation(async ({ data }: { data: { amount: number } }) => ({ id: "expense-1", amount: data.amount }));
  });

  it("records an inventory purchase and adds packs to tracked stock in the same transaction", async () => {
    const result = await createExpenseAction({
      category: "INVENTORY_PURCHASE",
      paymentMethod: "UPI",
      spentAt: "2026-11-16",
      vendorName: "Wholesale Shop",
      items: [{ description: "Water Bottle", amount: 500, productId: "water-1", packs: 2 }]
    });

    expect(result.ok).toBe(true);
    expect(mocked.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocked.tx.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { stockOnHand: { increment: 24 }, stockUpdatedAt: expect.any(Date) }
    }));
    expect(mocked.tx.expense.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amount: 500,
        items: { create: [expect.objectContaining({ nameSnapshot: "Water Bottle", packs: 2, stockUnit: "bottles", stockUnitsAdded: 24 })] }
      })
    }));
  });

  it("records grocery expenses without changing inventory", async () => {
    const result = await createExpenseAction({
      category: "GROCERIES",
      paymentMethod: "CASH",
      spentAt: "2026-11-16",
      items: [{ description: "Kitchen groceries", amount: 320.5 }]
    });

    expect(result.ok).toBe(true);
    expect(mocked.tx.product.updateMany).not.toHaveBeenCalled();
    expect(mocked.tx.expense.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 320.5, paymentMethod: "CASH" })
    }));
  });
});

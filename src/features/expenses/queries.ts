import { prisma } from "@/server/db/prisma";
import { addDaysToDateKey, formatStoreDateKey, storeDateStart } from "@/lib/time";
import type { ExpenseCategory, ExpenseFilters, ExpensePageData, ExpensePeriod, ExpenseProductOption } from "./types";

export async function getExpensesPageData(businessId: string, filters: ExpenseFilters, now = new Date()): Promise<ExpensePageData> {
  const today = formatStoreDateKey(now);
  const daysBack = filters.period === "7d" ? 6 : filters.period === "30d" ? 29 : 0;
  const where = {
    businessId,
    ...(filters.category === "ALL" ? {} : { category: filters.category as ExpenseCategory }),
    ...(filters.period === "all" ? {} : {
      spentAt: {
        gte: storeDateStart(filters.period === "today" ? today : addDaysToDateKey(today, -daysBack)),
        lt: storeDateStart(addDaysToDateKey(today, 1))
      }
    })
  };

  const [rows, count, aggregate, payments] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { items: { orderBy: { createdAt: "asc" }, select: { id: true, nameSnapshot: true, amount: true, packs: true, stockUnit: true, stockUnitsAdded: true } } }
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["paymentMethod"], where, _sum: { amount: true } })
  ]);

  const cashAmount = Number(payments.find((payment) => payment.paymentMethod === "CASH")?._sum.amount ?? 0);
  const upiAmount = Number(payments.find((payment) => payment.paymentMethod === "UPI")?._sum.amount ?? 0);
  return {
    records: rows.map((expense) => ({
      id: expense.id,
      category: expense.category,
      vendorName: expense.vendorName,
      paymentMethod: expense.paymentMethod === "CASH" ? "CASH" : "UPI",
      amount: Number(expense.amount),
      spentAt: expense.spentAt.toISOString(),
      notes: expense.notes,
      items: expense.items.map((item) => ({
        id: item.id,
        name: item.nameSnapshot,
        amount: Number(item.amount),
        packs: item.packs,
        stockUnit: item.stockUnit,
        stockUnitsAdded: item.stockUnitsAdded
      }))
    })),
    count,
    totalAmount: Number(aggregate._sum.amount ?? 0),
    cashAmount,
    upiAmount,
    filters
  };
}

export async function getExpenseProductOptions(businessId: string): Promise<ExpenseProductOption[]> {
  const products = await prisma.product.findMany({
    where: { businessId, active: true, trackInventory: true, category: { in: ["BEVERAGES", "CIGARETTES"] } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, stockUnit: true, unitsPerPack: true }
  });
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category as "BEVERAGES" | "CIGARETTES",
    stockUnit: product.stockUnit,
    unitsPerPack: product.unitsPerPack
  }));
}

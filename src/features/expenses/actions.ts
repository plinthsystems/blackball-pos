"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { storeDateStart } from "@/lib/time";
import { calculateExpenseStockUnits } from "./domain/expense-calculations";
import { expenseFormSchema } from "./schemas";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function createExpenseAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "products.manage");
    const parsed = expenseFormSchema.parse(input);
    const occurredAt = storeDateStart(parsed.spentAt);
    const saved = await prisma.$transaction(async (tx) => {
      const itemRows: Array<{
        businessId: string;
        nameSnapshot: string;
        amount: number;
        productId: string | null;
        packs: number | null;
        stockUnit: string | null;
        stockUnitsAdded: number;
      }> = [];

      for (const line of parsed.items) {
        const amount = roundMoney(line.amount);
        if (amount < 0.01) throw new Error("Each expense line must be at least ₹0.01.");
        if (!line.productId) {
          itemRows.push({
            businessId: context.businessId,
            nameSnapshot: line.description,
            amount,
            productId: null,
            packs: null,
            stockUnit: null,
            stockUnitsAdded: 0
          });
          continue;
        }

        const product = await tx.product.findFirst({
          where: {
            id: line.productId,
            businessId: context.businessId,
            active: true,
            trackInventory: true,
            category: { in: ["BEVERAGES", "CIGARETTES"] }
          },
          select: { id: true, name: true, unitsPerPack: true, stockUnit: true }
        });
        if (!product || !line.packs) throw new Error("Choose an active tracked drink or cigarette item and enter its pack count.");

        const stockUnitsAdded = calculateExpenseStockUnits(line.packs, product.unitsPerPack);
        const updated = await tx.product.updateMany({
          where: { id: product.id, businessId: context.businessId, active: true, trackInventory: true },
          data: { stockOnHand: { increment: stockUnitsAdded }, stockUpdatedAt: new Date() }
        });
        if (updated.count !== 1) throw new Error(`${product.name} could not be restocked.`);
        itemRows.push({
          businessId: context.businessId,
          nameSnapshot: product.name,
          amount,
          productId: product.id,
          packs: line.packs,
          stockUnit: product.stockUnit,
          stockUnitsAdded
        });
      }

      const amount = roundMoney(itemRows.reduce((sum, item) => sum + item.amount, 0));
      if (amount < 0.01) throw new Error("Enter a valid expense amount.");
      return tx.expense.create({
        data: {
          businessId: context.businessId,
          category: parsed.category,
          vendorName: parsed.vendorName || null,
          paymentMethod: parsed.paymentMethod,
          amount,
          spentAt: occurredAt,
          notes: parsed.notes || null,
          items: { create: itemRows }
        },
        select: { id: true, amount: true }
      });
    });

    revalidatePath("/expenses");
    revalidatePath("/inventory");
    return { ok: true, message: `Expense saved · ${formatMoney(Number(saved.amount))}. Inventory stock updated where linked.` };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return { ok: false, message: issue?.message ?? "Check the expense details and try again." };
    }
    return { ok: false, message: error instanceof Error ? error.message : "Expense could not be saved." };
  }
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

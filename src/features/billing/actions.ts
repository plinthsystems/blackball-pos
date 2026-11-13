"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { DomainError } from "@/server/domain/errors";
import { calculateBillSegmentTableAmount } from "@/server/domain/bill-summary";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function closeBillAction(input: { billId: string }): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bills.manage");

    const { billId } = input;
    const bill = await prisma.bill.findFirst({
      where: { id: billId, businessId: context.businessId, status: "OPEN" },
      include: { items: true, session: true }
    });

    if (!bill) {
      throw new DomainError("BILL_NOT_FOUND", "Open bill not found.");
    }

    const now = new Date();
    const itemTotal = bill.items.reduce((sum, item) => sum + Number(item.lineTotalAmount), 0);
    const tableAmount = bill.kind === "SESSION" && bill.session
      ? calculateBillSegmentTableAmount({
          startedAt: bill.openedAt,
          endedAt: now,
          hourlyRate: Number(bill.session.hourlyRateSnapshot)
        })
      : 0;
    const total = Math.round((itemTotal + tableAmount) * 100) / 100;

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        status: "CLOSED",
        closedAt: now,
        tableAmountSnapshot: tableAmount,
        itemTotalAmountSnapshot: itemTotal,
        totalAmountSnapshot: total
      }
    });

    revalidatePath("/billing");
    revalidatePath("/live-tables");
    return { ok: true, message: `Bill closed. Total: ${formatMoney(total)}` };
  } catch (error) {
    return error instanceof DomainError
      ? { ok: false, message: error.message }
      : { ok: false, message: "Failed to close bill." };
  }
}

export async function cancelBillAction(input: { billId: string }): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bills.manage");

    const { billId } = input;
    const bill = await prisma.bill.findFirst({
      where: { id: billId, businessId: context.businessId, status: "OPEN" }
    });

    if (!bill) {
      throw new DomainError("BILL_NOT_FOUND", "Open bill not found.");
    }

    await prisma.bill.update({
      where: { id: bill.id },
      data: { status: "CANCELLED", closedAt: new Date() }
    });

    revalidatePath("/billing");
    revalidatePath("/live-tables");
    return { ok: true, message: "Bill cancelled." };
  } catch (error) {
    return error instanceof DomainError
      ? { ok: false, message: error.message }
      : { ok: false, message: "Failed to cancel bill." };
  }
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);
}

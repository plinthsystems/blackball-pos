"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { calculateBillSegmentTableAmount } from "@/server/domain/bill-summary";
import { DomainError } from "@/server/domain/errors";
import { noopDomainEventPublisher } from "@/server/domain/events";
import { prismaAuditLogRepository } from "@/server/repositories/audit-log-repository";
import { prismaSessionRepository } from "@/server/repositories/session-repository";
import { prismaTableRepository } from "@/server/repositories/table-repository";
import { SessionService } from "@/server/services/session-service";
import { TableService } from "@/server/services/table-service";
import {
  addBillItemSchema,
  closeCounterBillSchema,
  closeBillAndContinueSessionSchema,
  endSessionSchema,
  extendSessionSchema,
  removeBillItemSchema,
  startCounterBillSchema,
  startWalkInSessionSchema,
  tableStatusSchema
} from "@/features/sessions/schemas";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

function services() {
  const transaction = <T,>(callback: (tx: unknown) => Promise<T>) => prisma.$transaction((tx) => callback(tx));
  return {
    sessions: new SessionService(
      prismaTableRepository,
      prismaSessionRepository,
      prismaAuditLogRepository,
      noopDomainEventPublisher,
      transaction
    ),
    tables: new TableService(prismaTableRepository, prismaAuditLogRepository, noopDomainEventPublisher, transaction)
  };
}

function actionError(error: unknown): ActionResult {
  if (error instanceof DomainError) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: "The operation could not be completed. Please try again." };
}

export async function startWalkInSessionAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "sessions.start");
    const parsed = startWalkInSessionSchema.parse(input);
    const table = await prisma.clubTable.findFirst({
      where: { id: parsed.tableId, businessId: context.businessId },
      select: { gameType: true, pricingGroup: true }
    });
    if (!table) {
      throw new DomainError("TABLE_NOT_AVAILABLE", "This table is not available for a new session.");
    }
    const ps5MemberCount = table.gameType === "PS5" ? parsed.ps5MemberCount ?? 1 : null;
    const pricingGroup = table.gameType === "PS5" ? ps5PricingGroup(ps5MemberCount ?? 1) : table.pricingGroup;
    const pricing = await prisma.tablePricing.findUnique({
      where: {
        businessId_gameType_pricingGroup_durationMinutes: {
          businessId: context.businessId,
          gameType: table.gameType,
          pricingGroup,
          durationMinutes: 60
        }
      },
      select: { priceAmount: true }
    });
    if (!pricing) {
      throw new DomainError("PRICING_NOT_FOUND", "Hourly rate was not found for this station.");
    }

    const session = await services().sessions.startWalkInSession({
      businessId: context.businessId,
      employeeId: context.employeeId,
      tableId: parsed.tableId,
      durationMinutes: parsed.durationMinutes,
      ps5MemberCount,
      hourlyRateSnapshot: Number(pricing.priceAmount),
      assignedEmployeeId: parsed.assignedEmployeeId ?? context.employeeId,
      now: new Date()
    });

    await prisma.bill.create({
      data: {
        businessId: context.businessId,
        sessionId: session.sessionId,
        kind: "SESSION",
        status: "OPEN",
        label: "Bill 1"
      }
    });

    if (parsed.customerPhone) {
      void shareBookingLinkWithCustomer(context.businessId, parsed.customerPhone);
    }

    revalidatePath("/live-tables");
    return { ok: true, message: "Session started." };
  } catch (error) {
    return actionError(error);
  }
}

async function shareBookingLinkWithCustomer(businessId: string, phone: string) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { slug: true, name: true }
    });
    if (!business) {
      return;
    }
    const { getBookingPageUrl, getBookingQrPngUrl } = await import("@/server/integrations/base-url");
    const { sendManualBookingShareMessage } = await import("@/server/integrations/whatsapp");
    await sendManualBookingShareMessage(phone, business.name, {
      bookingLink: getBookingPageUrl(business.slug),
      qrImageUrl: getBookingQrPngUrl(business.slug)
    });
  } catch {
    // WhatsApp share is best-effort; never breaks the POS flow.
  }
}

export async function extendSessionAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "sessions.extend");
    const parsed = extendSessionSchema.parse(input);
    await services().sessions.extendSession({ ...parsed, businessId: context.businessId, employeeId: context.employeeId, now: new Date() });
    revalidatePath("/live-tables");
    return { ok: true, message: "Session extended." };
  } catch (error) {
    return actionError(error);
  }
}

export async function endSessionAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "sessions.end");
    const parsed = endSessionSchema.parse(input);
    const now = new Date();
    const finalTotal = await prisma.$transaction(async (tx) => {
      const session = await tx.session.findFirst({
        where: { id: parsed.sessionId, businessId: context.businessId, status: { in: ["ACTIVE", "PAUSED"] } },
        include: { table: true }
      });
      if (!session) {
        throw new DomainError("SESSION_NOT_ACTIVE", "Only an active or paused session can be ended.");
      }

      const openBill = await tx.bill.findFirst({
        where: { businessId: context.businessId, sessionId: session.id, status: "OPEN" },
        orderBy: { openedAt: "desc" },
        include: { items: true }
      });

      const closedTotal = openBill
        ? await closeBill(tx, openBill, Number(session.hourlyRateSnapshot), now)
        : 0;
      return closedTotal;
    });

    await services().sessions.endSession({ ...parsed, businessId: context.businessId, employeeId: context.employeeId, now });
    revalidatePath("/live-tables");
    return { ok: true, message: `Session ended. Final total ${formatActionMoney(finalTotal)}.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function addBillItemAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bills.manage");
    const parsed = addBillItemSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const [bill, product] = await Promise.all([
        tx.bill.findFirst({
          where: {
            id: parsed.billId,
            businessId: context.businessId,
            status: "OPEN"
          },
          select: { id: true }
        }),
        tx.product.findFirst({
          where: {
            id: parsed.productId,
            businessId: context.businessId,
            active: true
          },
          select: { id: true, name: true, category: true, priceAmount: true }
        })
      ]);

      if (!bill || !product) {
        throw new DomainError("SESSION_NOT_ACTIVE", "Open bill or product was not found.");
      }

      const unitPrice = Number(product.priceAmount);
      const lineTotal = Math.round(unitPrice * parsed.quantity * 100) / 100;
      await tx.billItem.create({
        data: {
          businessId: context.businessId,
          billId: bill.id,
          productId: product.id,
          category: product.category,
          nameSnapshot: product.name,
          unitPriceAmount: product.priceAmount,
          quantity: parsed.quantity,
          lineTotalAmount: lineTotal
        }
      });
    });

    revalidatePath("/live-tables");
    return { ok: true, message: "Item added to bill." };
  } catch (error) {
    return actionError(error);
  }
}

export async function addSessionItemAction(input: unknown): Promise<ActionResult> {
  const value = input as { sessionId?: string; productId?: string; quantity?: number };
  if (!value.sessionId) {
    return addBillItemAction(input);
  }

  const context = await getCurrentEmployeeContext();
  const bill = await prisma.bill.findFirst({
    where: { businessId: context.businessId, sessionId: value.sessionId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    select: { id: true }
  });
  if (!bill) {
    return { ok: false, message: "Open bill was not found." };
  }
  return addBillItemAction({ billId: bill.id, productId: value.productId, quantity: value.quantity });
}

export async function removeBillItemAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bills.manage");
    const parsed = removeBillItemSchema.parse(input);
    const item = await prisma.billItem.findFirst({
      where: { id: parsed.billItemId, businessId: context.businessId, bill: { status: "OPEN" } },
      select: { id: true, bill: { select: { kind: true } } }
    });
    if (!item) {
      throw new DomainError("SESSION_NOT_ACTIVE", "Open bill item was not found.");
    }

    await prisma.billItem.delete({ where: { id: item.id } });
    revalidatePath("/live-tables");
    revalidatePath("/settings");
    return { ok: true, message: "Item removed from bill." };
  } catch (error) {
    return actionError(error);
  }
}

export async function closeBillAndContinueSessionAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bills.manage");
    const parsed = closeBillAndContinueSessionSchema.parse(input);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const session = await tx.session.findFirst({
        where: { id: parsed.sessionId, businessId: context.businessId, status: { in: ["ACTIVE", "PAUSED"] } },
        include: { bills: { where: { status: "OPEN" }, orderBy: { openedAt: "desc" }, include: { items: true }, take: 1 } }
      });
      const openBill = session?.bills[0];
      if (!session || !openBill) {
        throw new DomainError("SESSION_NOT_ACTIVE", "Open session bill was not found.");
      }

      await closeBill(tx, openBill, Number(session.hourlyRateSnapshot), now);
      const billCount = await tx.bill.count({ where: { businessId: context.businessId, sessionId: session.id } });
      await tx.bill.create({
        data: {
          businessId: context.businessId,
          sessionId: session.id,
          kind: "SESSION",
          status: "OPEN",
          label: `Bill ${billCount + 1}`,
          openedAt: now
        }
      });
    });

    revalidatePath("/live-tables");
    return { ok: true, message: "Bill closed. New bill started." };
  } catch (error) {
    return actionError(error);
  }
}

export async function startCounterBillAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bills.manage");
    const parsed = startCounterBillSchema.parse(input);
    await prisma.bill.create({
      data: {
        businessId: context.businessId,
        kind: "COUNTER",
        status: "OPEN",
        label: parsed.label || "Counter bill"
      }
    });
    revalidatePath("/live-tables");
    return { ok: true, message: "Counter bill started." };
  } catch (error) {
    return actionError(error);
  }
}

export async function closeCounterBillAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bills.manage");
    const parsed = closeCounterBillSchema.parse(input);
    const bill = await prisma.bill.findFirst({
      where: { id: parsed.billId, businessId: context.businessId, kind: "COUNTER", status: "OPEN" },
      include: { items: true }
    });
    if (!bill) {
      throw new DomainError("SESSION_NOT_ACTIVE", "Open counter bill was not found.");
    }

    const itemTotal = roundMoney(bill.items.reduce((total, item) => total + Number(item.lineTotalAmount), 0));
    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        tableAmountSnapshot: 0,
        itemTotalAmountSnapshot: itemTotal,
        totalAmountSnapshot: itemTotal
      }
    });
    revalidatePath("/live-tables");
    return { ok: true, message: `Counter bill closed. Total ${formatActionMoney(itemTotal)}.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateTableStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "tables.update_status");
    const parsed = tableStatusSchema.parse(input);
    await services().tables.updateOperationalStatus({ ...parsed, businessId: context.businessId, employeeId: context.employeeId });
    revalidatePath("/live-tables");
    return { ok: true, message: "Table status updated." };
  } catch (error) {
    return actionError(error);
  }
}

async function closeBill(
  tx: Prisma.TransactionClient,
  bill: {
    id: string;
    kind: "SESSION" | "COUNTER";
    openedAt: Date;
    items: Array<{ lineTotalAmount: unknown }>;
  },
  hourlyRate: number,
  closedAt: Date
) {
  const itemTotal = roundMoney(bill.items.reduce((total, item) => total + Number(item.lineTotalAmount), 0));
  const tableAmount =
    bill.kind === "SESSION"
      ? calculateBillSegmentTableAmount({ startedAt: bill.openedAt, endedAt: closedAt, hourlyRate })
      : 0;
  const total = roundMoney(itemTotal + tableAmount);
  await tx.bill.update({
    where: { id: bill.id },
    data: {
      status: "CLOSED",
      closedAt,
      tableAmountSnapshot: tableAmount,
      itemTotalAmountSnapshot: itemTotal,
      totalAmountSnapshot: total
    }
  });
  return total;
}

function ps5PricingGroup(memberCount: number) {
  return `players-${memberCount}`;
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function formatActionMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

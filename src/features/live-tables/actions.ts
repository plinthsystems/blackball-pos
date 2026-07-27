"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { DomainError } from "@/server/domain/errors";
import { noopDomainEventPublisher } from "@/server/domain/events";
import { prismaAuditLogRepository } from "@/server/repositories/audit-log-repository";
import { prismaSessionRepository } from "@/server/repositories/session-repository";
import { prismaTableRepository } from "@/server/repositories/table-repository";
import { SessionService } from "@/server/services/session-service";
import { TableService } from "@/server/services/table-service";
import {
  addSessionItemSchema,
  endSessionSchema,
  extendSessionSchema,
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

    await services().sessions.startWalkInSession({
      businessId: context.businessId,
      employeeId: context.employeeId,
      tableId: parsed.tableId,
      durationMinutes: parsed.durationMinutes,
      assignedEmployeeId: parsed.assignedEmployeeId ?? context.employeeId,
      now: new Date()
    });

    revalidatePath("/live-tables");
    return { ok: true, message: "Session started." };
  } catch (error) {
    return actionError(error);
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
    await services().sessions.endSession({ ...parsed, businessId: context.businessId, employeeId: context.employeeId, now: new Date() });
    revalidatePath("/live-tables");
    return { ok: true, message: "Session ended." };
  } catch (error) {
    return actionError(error);
  }
}

export async function addSessionItemAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "sessions.add_items");
    const parsed = addSessionItemSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const [session, product] = await Promise.all([
        tx.session.findFirst({
          where: {
            id: parsed.sessionId,
            businessId: context.businessId,
            status: { in: ["ACTIVE", "PAUSED"] }
          },
          select: { id: true, businessId: true }
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

      if (!session || !product) {
        throw new DomainError("SESSION_NOT_ACTIVE", "Active session or product was not found.");
      }

      const unitPrice = Number(product.priceAmount);
      const lineTotal = Math.round(unitPrice * parsed.quantity * 100) / 100;
      await tx.sessionItem.create({
        data: {
          businessId: context.businessId,
          sessionId: session.id,
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

"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/server/domain/errors";
import { bookableItemFormSchema, bookableItemIdSchema } from "@/features/sessions/schemas";
import { defaultHourlyRateFor } from "./pricing-groups";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

function actionError(error: unknown): ActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { ok: false, message: "An item with this name already exists for your store." };
  }
  if (error instanceof DomainError) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: "The operation could not be completed. Please try again." };
}

function revalidateBookablePaths() {
  revalidatePath("/tables");
  revalidatePath("/live-tables");
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
}

export async function createBookableItemAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "tables.manage");
    const parsed = bookableItemFormSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      await ensureHourlyRateRule(tx, context.businessId, parsed.gameType, parsed.pricingGroup);
      await tx.clubTable.create({
        data: {
          businessId: context.businessId,
          number: parsed.number,
          gameType: parsed.gameType,
          pricingGroup: parsed.pricingGroup,
          status: "AVAILABLE",
          active: true
        }
      });
    });

    revalidateBookablePaths();
    return { ok: true, message: "Bookable item added." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateBookableItemAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "tables.manage");
    const parsed = bookableItemFormSchema.parse(input);
    if (!parsed.id) {
      return { ok: false, message: "Choose an item to update." };
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.clubTable.findFirst({
        where: { id: parsed.id, businessId: context.businessId },
        select: { id: true }
      });
      if (!existing) {
        return { ok: false, message: "This bookable item was not found." };
      }
      await ensureHourlyRateRule(tx, context.businessId, parsed.gameType, parsed.pricingGroup);
      await tx.clubTable.update({
        where: { id: existing.id },
        data: {
          number: parsed.number,
          gameType: parsed.gameType,
          pricingGroup: parsed.pricingGroup,
          active: true
        }
      });
    });

    revalidateBookablePaths();
    return { ok: true, message: "Bookable item updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function setBookableItemActiveAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "tables.manage");
    const { id, active } = input as { id?: string; active?: boolean };
    if (!id || typeof active !== "boolean") {
      return { ok: false, message: "Choose an item to update." };
    }

    const result = await prisma.clubTable.updateMany({
      where: { id, businessId: context.businessId },
      data: { active }
    });
    if (result.count === 0) {
      return { ok: false, message: "This bookable item was not found." };
    }

    revalidateBookablePaths();
    return { ok: true, message: active ? "Item restored." : "Item removed from store." };
  } catch (error) {
    return actionError(error);
  }
}

async function ensureHourlyRateRule(
  tx: Prisma.TransactionClient,
  businessId: string,
  gameType: "POOL" | "SNOOKER" | "PS5",
  pricingGroup: string
) {
  const existing = await tx.tablePricing.findUnique({
    where: {
      businessId_gameType_pricingGroup_durationMinutes: {
        businessId,
        gameType,
        pricingGroup,
        durationMinutes: 60
      }
    },
    select: { id: true }
  });
  if (existing) {
    return;
  }
  await tx.tablePricing.create({
    data: {
      businessId,
      gameType,
      pricingGroup,
      durationMinutes: 60,
      priceAmount: defaultHourlyRateFor(gameType, pricingGroup)
    }
  });
}

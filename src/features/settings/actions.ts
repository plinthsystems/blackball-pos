"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { bookingSettingsSchema } from "@/server/domain/booking-settings";
import { brandingFormSchema, productFormSchema } from "@/features/sessions/schemas";

export async function updateBookingSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "settings.update");
    const parsed = bookingSettingsSchema.parse(input);

    await prisma.businessSettings.upsert({
      where: { businessId: context.businessId },
      update: parsed,
      create: { businessId: context.businessId, ...parsed }
    });

    revalidatePath("/settings");
    return { ok: true, message: "Booking preferences saved." };
  } catch (error) {
    // Surface validation errors in dev; generic message in production.
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return { ok: false, message: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid booking settings." };
    }
    const message = error instanceof Error ? error.message : "Booking preferences could not be saved.";
    return { ok: false, message };
  }
}

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function createOrUpdateProductAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "products.manage");
    const parsed = productFormSchema.parse(input);

    if (parsed.id) {
      await prisma.product.update({
        where: { id: parsed.id, businessId: context.businessId },
        data: {
          name: parsed.name,
          category: parsed.category,
          priceAmount: parsed.priceAmount,
          active: true
        }
      });
    } else {
      await prisma.product.create({
        data: {
          businessId: context.businessId,
          name: parsed.name,
          category: parsed.category,
          priceAmount: parsed.priceAmount
        }
      });
    }

    revalidatePath("/settings");
    revalidatePath("/live-tables");
    return { ok: true, message: parsed.id ? "Item updated." : "Item added." };
  } catch {
    return { ok: false, message: "Menu item could not be saved." };
  }
}

export async function deactivateProductAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "products.manage");
    const id = typeof input === "object" && input && "id" in input ? String(input.id) : "";
    if (!id) {
      return { ok: false, message: "Choose an item to remove." };
    }

    await prisma.product.update({
      where: { id, businessId: context.businessId },
      data: { active: false }
    });
    revalidatePath("/settings");
    revalidatePath("/live-tables");
    return { ok: true, message: "Item removed from list." };
  } catch {
    return { ok: false, message: "Menu item could not be removed." };
  }
}

export async function updateBrandingAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "settings.update");
    const parsed = brandingFormSchema.parse(input);

    await prisma.businessSettings.upsert({
      where: { businessId: context.businessId },
      update: parsed,
      create: {
        businessId: context.businessId,
        ...parsed
      }
    });

    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { ok: true, message: "Branding updated." };
  } catch {
    return { ok: false, message: "Branding could not be saved." };
  }
}

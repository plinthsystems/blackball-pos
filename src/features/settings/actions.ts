"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { brandingFormSchema, productFormSchema } from "@/features/sessions/schemas";

const bookingSettingsSchema = z.object({
  bookingEnabled: z.boolean(),
  requireConfirmation: z.boolean(),
  bookingBufferMinutes: z.number().int().min(0).max(120),
  bookingOpenHour: z.number().int().min(6).max(14),
  bookingCloseHour: z.number().int().min(14).max(24),
  paymentProvider: z.enum(["NONE", "RAZORPAY", "STRIPE"]),
  bookingAdvanceAmount: z.number().min(0).max(100000)
});

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
  } catch {
    return { ok: false, message: "Booking preferences could not be saved." };
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

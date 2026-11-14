"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { bookingSettingsSchema } from "@/server/domain/booking-settings";
import {
  brandingFormSchema,
  inventoryImportSchema,
  inventoryProductSettingsSchema,
  productFormSchema,
  restockProductSchema,
  setInventoryStockSchema
} from "@/features/sessions/schemas";

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
          ...(parsed.stockUnit ? { stockUnit: parsed.stockUnit } : {}),
          ...(parsed.unitsPerPack ? { unitsPerPack: parsed.unitsPerPack } : {}),
          active: true
        }
      });
    } else {
      await prisma.product.create({
        data: {
          businessId: context.businessId,
          name: parsed.name,
          category: parsed.category,
          priceAmount: parsed.priceAmount,
          stockUnit: parsed.stockUnit ?? (parsed.category === "CIGARETTES" ? "stick" : "unit"),
          unitsPerPack: parsed.unitsPerPack ?? (parsed.category === "CIGARETTES" ? 10 : 1),
          trackInventory: parsed.category === "CIGARETTES"
        }
      });
    }

    revalidatePath("/settings");
    revalidatePath("/inventory");
    revalidatePath("/live-tables");
    return { ok: true, message: parsed.id ? "Item updated." : "Item added." };
  } catch {
    return { ok: false, message: "Menu item could not be saved." };
  }
}

export async function restockProductAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "products.manage");
    const parsed = restockProductSchema.parse(input);
    const product = await prisma.product.findFirst({
      where: { id: parsed.id, businessId: context.businessId, active: true },
      select: { id: true, unitsPerPack: true }
    });
    if (!product) {
      return { ok: false, message: "Menu item was not found." };
    }

    const restockUnits = parsed.packs * product.unitsPerPack;
    const updated = await prisma.product.updateMany({
      where: { id: product.id, businessId: context.businessId, active: true },
      data: { stockOnHand: { increment: restockUnits }, stockUpdatedAt: new Date(), trackInventory: true }
    });
    if (updated.count !== 1) {
      return { ok: false, message: "Menu item was not found." };
    }
    revalidatePath("/settings");
    revalidatePath("/inventory");
    revalidatePath("/live-tables");
    return { ok: true, message: "Stock added." };
  } catch {
    return { ok: false, message: "Stock could not be added." };
  }
}

export async function setInventoryStockAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "products.manage");
    const parsed = setInventoryStockSchema.parse(input);
    const updated = await prisma.product.updateMany({
      where: { id: parsed.id, businessId: context.businessId, active: true, trackInventory: true },
      data: { stockOnHand: parsed.stockOnHand, stockUpdatedAt: new Date() }
    });
    if (updated.count !== 1) {
      return { ok: false, message: "Inventory item was not found." };
    }
    revalidatePath("/inventory");
    revalidatePath("/live-tables");
    return { ok: true, message: "On-hand stock updated." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Enter a whole-number stock quantity of zero or more." };
    }
    return { ok: false, message: "Stock could not be updated. Please try again." };
  }
}

export async function updateInventoryProductAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "products.manage");
    const parsed = inventoryProductSettingsSchema.parse(input);
    await prisma.product.update({
      where: { id: parsed.id, businessId: context.businessId },
      data: { stockUnit: parsed.stockUnit, unitsPerPack: parsed.unitsPerPack, trackInventory: true }
    });
    revalidatePath("/inventory");
    revalidatePath("/live-tables");
    return { ok: true, message: "Stock settings saved." };
  } catch {
    return { ok: false, message: "Stock settings could not be saved." };
  }
}

export async function importInventoryAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "products.manage");
    const rows = inventoryImportSchema.parse(input);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const existing = await tx.product.findFirst({
          where: { businessId: context.businessId, name: row.name, category: row.category },
          select: { id: true }
        });
        const data = {
          name: row.name,
          category: row.category,
          priceAmount: row.priceAmount,
          stockUnit: row.stockUnit,
          unitsPerPack: row.unitsPerPack,
          stockOnHand: row.stockOnHand,
          stockUpdatedAt: now,
          trackInventory: true,
          active: true
        };
        if (existing) {
          await tx.product.update({ where: { id: existing.id, businessId: context.businessId }, data });
        } else {
          await tx.product.create({ data: { businessId: context.businessId, ...data } });
        }
      }
    });

    revalidatePath("/inventory");
    revalidatePath("/settings");
    revalidatePath("/live-tables");
    return { ok: true, message: `Imported ${rows.length} inventory items.` };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return { ok: false, message: issue ? `CSV row data: ${issue.message}` : "CSV data is invalid." };
    }
    return { ok: false, message: "Inventory CSV could not be imported." };
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

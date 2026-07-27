"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { productFormSchema } from "@/features/sessions/schemas";

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

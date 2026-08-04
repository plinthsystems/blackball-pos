"use server";

import { revalidatePath } from "next/cache";
import { rateFormSchema } from "@/features/sessions/schemas";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function updateHourlyRateAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "settings.update");
    const parsed = rateFormSchema.parse(input);
    await prisma.tablePricing.update({
      where: { id: parsed.id, businessId: context.businessId },
      data: { priceAmount: parsed.hourlyRate }
    });
    revalidatePath("/rates");
    revalidatePath("/live-tables");
    revalidatePath("/dashboard");
    return { ok: true, message: "Hourly rate updated." };
  } catch {
    return { ok: false, message: "Hourly rate could not be updated." };
  }
}

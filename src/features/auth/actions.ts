"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requireAuth } from "@/server/auth/authorization";
import { createSessionToken, hashPassword, verifyPassword } from "@/server/auth/auth-service";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(128)
});

export type ChangePasswordResult = { ok: true; message: string } | { ok: false; message: string };

export async function changePasswordAction(input: unknown): Promise<ChangePasswordResult> {
  try {
    const context = await requireAuth();
    const parsed = changePasswordSchema.parse(input);

    if (parsed.newPassword === parsed.currentPassword) {
      return { ok: false, message: "Naya password purane jaisa nahi ho sakta." };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: context.employeeId },
      select: { passwordHash: true, email: true, accountType: true, businessId: true, mustChangePassword: true }
    });
    if (!employee || !employee.passwordHash) {
      return { ok: false, message: "Account not found." };
    }

    if (!verifyPassword(parsed.currentPassword, employee.passwordHash)) {
      return { ok: false, message: "Current password sahi nahi hai." };
    }

    await prisma.employee.update({
      where: { id: context.employeeId },
      data: { passwordHash: hashPassword(parsed.newPassword), mustChangePassword: false }
    });

    const cookieStore = await cookies();
    const token = createSessionToken({
      employeeId: context.employeeId,
      email: employee.email,
      accountType: employee.accountType,
      businessId: employee.businessId ?? undefined,
      mustChangePassword: false
    });
    cookieStore.set("auth_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return { ok: true, message: "Password update ho gaya." };
  } catch {
    return { ok: false, message: "Password change nahi ho paya." };
  }
}

"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/server/auth/auth-service";
import { prisma } from "@/server/db/prisma";

export async function createPlatformAdminAction(formData: FormData): Promise<void> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const businessName = formData.get("businessName") as string;

  if (!name || !email || !password || !businessName) {
    redirect(`/setup?error=${encodeURIComponent("Sab fields required hain")}`);
  }

  try {
    // Transaction ensures atomic creation of Org + User
    // Note: permissions are granted automatically by accountType "PLATFORM_ADMIN"
    // in src/server/auth/current-employee.ts — no need to store them separately.
    await prisma.$transaction(async (tx) => {
      // 1. Create the Organization (The SaaS Store)
      const organization = await tx.organization.create({
        data: {
          name: businessName,
          slug: businessName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
          type: "INDEPENDENT_SAAS",
        },
      });

      // 2. Create the Platform Admin Employee
      await tx.employee.create({
        data: {
          email: email,
          passwordHash: hashPassword(password),
          name: name,
          businessId: organization.id,
          accountType: "PLATFORM_ADMIN",
        },
      });
    });
  } catch (error) {
    console.error("Setup failed:", error);
    redirect(`/setup?error=${encodeURIComponent("Setup failed. Please try again.")}`);
  }

  redirect("/login");
}
"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/server/auth/auth-service";
import { prisma } from "@/server/db/prisma";

export async function createPlatformAdminAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const businessName = formData.get("businessName") as string;

  if (!name || !email || !password || !businessName) {
    return { error: "Sab fields required hain" };
  }

  try {
    // Transaction ensures atomic creation of Org + User
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
          permissions: [
            "platform.setup.manage",
            "platform.admin.manage",
            "dashboard.read",
            "dashboard.manage",
            "tables.read",
            "tables.manage",
            "settings.update",
            "rates.manage",
            "products.manage",
            "bookings.manage",
            "bills.manage",
            "sessions.start",
            "sessions.end",
          ],
        },
      });
    });

  } catch (error) {
    console.error("Setup failed:", error);
    return { error: "Setup failed. Please try again." };
  }

  redirect("/login");
}
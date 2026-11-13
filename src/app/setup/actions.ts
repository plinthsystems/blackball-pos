"use server";

import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { seedTheNine } from "@/server/provisioning/the-nine";

export async function createTheNineSetupAction(formData: FormData): Promise<void> {
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  const storeEmail = String(formData.get("storeEmail") ?? "").trim();
  const storePassword = String(formData.get("storePassword") ?? "");

  if (!adminName || !adminEmail || !adminPassword || !storeEmail || !storePassword) {
    redirect("/setup?error=All+fields+are+required");
  }
  if (adminPassword.length < 8 || storePassword.length < 8) {
    redirect("/setup?error=Passwords+must+be+at+least+8+characters");
  }

  const existingStoreCount = await prisma.business.count();
  if (existingStoreCount > 0) {
    redirect("/login");
  }

  try {
    await prisma.$transaction((tx) =>
      seedTheNine(tx, {
        adminName,
        adminEmail,
        password: adminPassword,
        storeEmail,
        storePassword,
        storeName: "The Nine Store",
        includeSampleSales: false
      }).then(() => undefined)
    );
  } catch (error) {
    console.error("The Nine setup failed:", error);
    redirect("/setup?error=Setup+failed.+Please+try+again");
  }

  redirect("/login?setup=complete");
}

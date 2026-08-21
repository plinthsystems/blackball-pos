/**
 * Production Setup Utility
 * -------------------------
 * Runs this script to create your first Super Admin account.
 * It generates a secure random password and saves it to the database.
 *
 * Usage:
 * 1. Run: npx tsx scripts/generate-super-admin.ts
 * 2. Copy the printed Email and Password.
 * 3. Use these to log in.
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/auth-service";

const prisma = new PrismaClient();

/**
 * Generates a cryptographically strong random password.
 * Returns a 32-character random hex string.
 */
function generateStrongPassword(): string {
  return crypto.randomBytes(20).toString("hex");
}

async function main(): Promise<void> {
  console.log("🔐 Production Super Admin Setup\n");

  // Default values, but can be overridden by env vars
  const email = process.env.ADMIN_EMAIL || "admin@production.com";
  const name = process.env.ADMIN_NAME || "System Administrator";
  const businessName = process.env.BUSINESS_NAME || "Production Club";

  // Generate strong password
  const password = generateStrongPassword();

  console.log("📝 Configuration:");
  console.log(`   Email:      ${email}`);
  console.log(`   Name:       ${name}`);
  console.log(`   Business:   ${businessName}`);
  console.log(`   Password:   ${password}`);
  console.log("\n");

  try {
    // Transaction ensures both Org and User are created together
    await prisma.$transaction(async (tx) => {
      // Check if organization already exists (idempotency)
      const existingOrg = await tx.organization.findFirst({
        where: { name: businessName },
      });

      let organization;

      if (existingOrg) {
        organization = existingOrg;
        console.log(`⚠️  Organization '${businessName}' already exists.`);
      } else {
        console.log("➕ Creating Organization...");
        organization = await tx.organization.create({
          data: {
            name: businessName,
            slug: businessName.toLowerCase().replace(/\s+/g, "-"),
            type: "INDEPENDENT_SAAS",
          },
        });
      }

      console.log("👤 Creating Super Admin...");
      // Note: permissions are granted automatically by accountType "PLATFORM_ADMIN"
      // in src/server/auth/current-employee.ts — no need to store them separately.
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

    console.log("✅ Success! Super Admin created.");
    console.log("\n📥 YOUR PRODUCTION CREDENTIALS:");
    console.log("────────────────────────────────────");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log("────────────────────────────────────");
    console.log("\n⚠️  Please save this password securely. It will not be shown again.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error setting up Super Admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
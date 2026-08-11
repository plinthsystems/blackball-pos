"use server";

import { GameType, Prisma, ProductCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { hashPassword } from "@/server/auth/auth-service";
import { prisma } from "@/server/db/prisma";

const defaultPasswordHash = hashPassword("Password@123");

const saasSchema = z.object({
  organizationName: z.string().trim().min(2),
  businessName: z.string().trim().min(2),
  ownerEmail: z.string().trim().email(),
  staffEmail: z.string().trim().email().optional().or(z.literal("")),
  planId: z.string().trim().min(1)
});

const franchiseSchema = z.object({
  franchiseBrandName: z.string().trim().min(2),
  franchiseeName: z.string().trim().min(2),
  businessName: z.string().trim().min(2),
  ownerEmail: z.string().trim().email(),
  royaltyPercent: z.coerce.number().min(0).max(40),
  planId: z.string().trim().min(1)
});

const operationalPermissions = [
  "dashboard.read",
  "tables.read",
  "tables.update_status",
  "sessions.start",
  "sessions.pause",
  "sessions.resume",
  "sessions.extend",
  "sessions.end",
  "sessions.add_items",
  "bills.manage",
  "products.manage",
  "rates.manage",
  "settings.update"
];

const staffPermissions = [
  "tables.read",
  "tables.update_status",
  "sessions.start",
  "sessions.pause",
  "sessions.resume",
  "sessions.extend",
  "sessions.end",
  "sessions.add_items",
  "bills.manage"
];

type SetupDb = Prisma.TransactionClient;

export async function createSaasSetupAction(formData: FormData) {
  await assertPlatformAdmin();
  const input = saasSchema.parse(Object.fromEntries(formData.entries()));
  const organizationSlug = slugify(input.organizationName);
  const businessSlug = uniqueBusinessSlug(input.businessName);
  let createdBusinessSlug = businessSlug;

  await prisma.$transaction(async (tx) => {
    await assertActivePlan(tx, input.planId);

    const organization = await tx.organization.upsert({
      where: { slug: organizationSlug },
      update: { name: input.organizationName, type: "INDEPENDENT_SAAS" },
      create: { name: input.organizationName, slug: organizationSlug, type: "INDEPENDENT_SAAS" }
    });

    const business = await createOperationalOutlet(tx, {
      organizationId: organization.id,
      name: input.businessName,
      slug: businessSlug,
      email: input.ownerEmail,
      appName: input.organizationName,
      logoInitials: initials(input.organizationName),
      ownerEmail: input.ownerEmail,
      ownerName: `${input.organizationName} Owner`,
      staffEmail: input.staffEmail || undefined,
      franchiseeId: null
    });
    createdBusinessSlug = business.slug;

    await createSubscription(tx, {
      id: `subscription-${business.slug}`,
      organizationId: organization.id,
      businessId: business.id,
      planId: input.planId,
      outletLimit: 1
    });
  });

  revalidatePath("/platform/setup");
  revalidatePath("/platform/setup/saas");
  redirect(`/platform/setup/saas?created=${encodeURIComponent(createdBusinessSlug)}`);
}

export async function createFranchiseSetupAction(formData: FormData) {
  await assertPlatformAdmin();
  const input = franchiseSchema.parse(Object.fromEntries(formData.entries()));
  const organizationSlug = slugify(input.franchiseBrandName);
  const franchiseeSlug = slugify(input.franchiseeName);
  const businessSlug = uniqueBusinessSlug(input.businessName);
  let createdBusinessSlug = businessSlug;

  await prisma.$transaction(async (tx) => {
    await assertActivePlan(tx, input.planId);

    const organization = await tx.organization.upsert({
      where: { slug: organizationSlug },
      update: { name: input.franchiseBrandName, type: "FRANCHISE" },
      create: { name: input.franchiseBrandName, slug: organizationSlug, type: "FRANCHISE" }
    });

    const franchisee = await tx.franchisee.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: franchiseeSlug } },
      update: {
        name: input.franchiseeName,
        contactName: input.franchiseeName,
        email: input.ownerEmail,
        active: true
      },
      create: {
        organizationId: organization.id,
        slug: franchiseeSlug,
        name: input.franchiseeName,
        contactName: input.franchiseeName,
        email: input.ownerEmail
      }
    });

    const business = await createOperationalOutlet(tx, {
      organizationId: organization.id,
      franchiseeId: franchisee.id,
      name: input.businessName,
      slug: businessSlug,
      email: input.ownerEmail,
      appName: input.franchiseBrandName,
      logoInitials: initials(input.franchiseBrandName),
      ownerEmail: input.ownerEmail,
      ownerName: `${input.franchiseeName} Owner`
    });
    createdBusinessSlug = business.slug;

    await createSubscription(tx, {
      id: `subscription-${business.slug}`,
      organizationId: organization.id,
      franchiseeId: franchisee.id,
      planId: input.planId,
      outletLimit: 1
    });

    await tx.royaltyRule.upsert({
      where: { id: `royalty-${franchisee.id}` },
      update: {
        organizationId: organization.id,
        franchiseeId: franchisee.id,
        name: `${input.franchiseeName} royalty`,
        basis: "GROSS_SALES",
        rateBasisPoints: Math.round(input.royaltyPercent * 100),
        active: true
      },
      create: {
        id: `royalty-${franchisee.id}`,
        organizationId: organization.id,
        franchiseeId: franchisee.id,
        name: `${input.franchiseeName} royalty`,
        basis: "GROSS_SALES",
        rateBasisPoints: Math.round(input.royaltyPercent * 100),
        fixedAmount: "0.00",
        minimumAmount: "0.00"
      }
    });
  });

  revalidatePath("/platform/setup");
  revalidatePath("/platform/setup/franchise");
  redirect(`/platform/setup/franchise?created=${encodeURIComponent(createdBusinessSlug)}`);
}

async function assertPlatformAdmin() {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("platform.setup.manage")) {
    throw new Error("Platform setup access is required.");
  }
}

async function assertActivePlan(db: SetupDb, planId: string) {
  const plan = await db.subscriptionPlan.findFirst({
    where: { id: planId, active: true },
    select: { id: true }
  });

  if (!plan) {
    throw new Error("Please choose an active subscription plan before creating setup.");
  }
}

async function createOperationalOutlet(db: SetupDb, input: {
  organizationId: string;
  franchiseeId?: string | null;
  name: string;
  slug: string;
  email: string;
  appName: string;
  logoInitials: string;
  ownerEmail: string;
  ownerName: string;
  staffEmail?: string;
}) {
  const business = await db.business.upsert({
    where: { slug: input.slug },
    update: {
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId ?? null,
      name: input.name,
      email: input.email
    },
    create: {
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId ?? null,
      slug: input.slug,
      name: input.name,
      email: input.email
    }
  });

  await db.businessSettings.upsert({
    where: { businessId: business.id },
    update: {
      appName: input.appName,
      logoInitials: input.logoInitials,
      brandColor: "#16a34a",
      accentColor: "#22d3ee"
    },
    create: {
      businessId: business.id,
      appName: input.appName,
      logoInitials: input.logoInitials,
      brandColor: "#16a34a",
      accentColor: "#22d3ee",
      taxRateBasisPoints: 1800,
      bookingBufferMinutes: 10
    }
  });

  await seedOutletRolesAndAccounts(db, {
    businessId: business.id,
    organizationId: input.organizationId,
    franchiseeId: input.franchiseeId ?? null,
    ownerEmail: input.ownerEmail,
    ownerName: input.ownerName,
    staffEmail: input.staffEmail
  });
  await seedDefaultOutletCatalog(db, business.id);

  return business;
}

async function seedOutletRolesAndAccounts(db: SetupDb, input: {
  businessId: string;
  organizationId: string;
  franchiseeId: string | null;
  ownerEmail: string;
  ownerName: string;
  staffEmail?: string;
}) {
  await Promise.all(
    [...new Set([...operationalPermissions, ...staffPermissions])].map((key) =>
      db.permission.upsert({ where: { key }, update: {}, create: { key } })
    )
  );

  const ownerRole = await db.role.upsert({
    where: { businessId_name: { businessId: input.businessId, name: "Owner" } },
    update: {},
    create: { businessId: input.businessId, name: "Owner", description: "Full outlet operations and settings access" }
  });
  const ownerPermissions = await db.permission.findMany({ where: { key: { in: operationalPermissions } } });
  await Promise.all(
    ownerPermissions.map((permission) =>
      db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: permission.id }
      })
    )
  );

  await db.employee.upsert({
    where: { id: `user-owner-${input.businessId}` },
    update: {
      businessId: input.businessId,
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId,
      name: input.ownerName,
      email: input.ownerEmail.toLowerCase(),
      passwordHash: defaultPasswordHash,
      accountType: "STORE_OWNER",
      active: true
    },
    create: {
      id: `user-owner-${input.businessId}`,
      businessId: input.businessId,
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId,
      name: input.ownerName,
      email: input.ownerEmail.toLowerCase(),
      passwordHash: defaultPasswordHash,
      accountType: "STORE_OWNER",
      active: true,
      roles: { create: { roleId: ownerRole.id } }
    }
  });

  if (!input.staffEmail) {
    return;
  }

  const staffRole = await db.role.upsert({
    where: { businessId_name: { businessId: input.businessId, name: "Staff" } },
    update: {},
    create: { businessId: input.businessId, name: "Staff", description: "Floor, table, and billing operations" }
  });
  const selectedStaffPermissions = await db.permission.findMany({ where: { key: { in: staffPermissions } } });
  await Promise.all(
    selectedStaffPermissions.map((permission) =>
      db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: staffRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: staffRole.id, permissionId: permission.id }
      })
    )
  );

  await db.employee.upsert({
    where: { id: `user-staff-${input.businessId}` },
    update: {
      businessId: input.businessId,
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId,
      name: "Floor Staff",
      email: input.staffEmail.toLowerCase(),
      passwordHash: defaultPasswordHash,
      accountType: "STORE_USER",
      active: true
    },
    create: {
      id: `user-staff-${input.businessId}`,
      businessId: input.businessId,
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId,
      name: "Floor Staff",
      email: input.staffEmail.toLowerCase(),
      passwordHash: defaultPasswordHash,
      accountType: "STORE_USER",
      active: true,
      roles: { create: { roleId: staffRole.id } }
    }
  });
}

async function seedDefaultOutletCatalog(db: SetupDb, businessId: string) {
  const tables = [
    { number: "Royal Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "royal" },
    { number: "Royal Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "royal" },
    { number: "Mini Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "mini" },
    { number: "Mini Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "mini" },
    { number: "Pool Table 1", gameType: GameType.POOL, pricingGroup: "standard" },
    { number: "PS5 1", gameType: GameType.PS5, pricingGroup: "players-2" },
    { number: "PS5 2", gameType: GameType.PS5, pricingGroup: "players-4" }
  ];
  const pricing = [
    { gameType: GameType.SNOOKER, pricingGroup: "royal", durationMinutes: 60, priceAmount: "350.00" },
    { gameType: GameType.SNOOKER, pricingGroup: "mini", durationMinutes: 60, priceAmount: "330.00" },
    { gameType: GameType.POOL, pricingGroup: "standard", durationMinutes: 60, priceAmount: "160.00" },
    { gameType: GameType.PS5, pricingGroup: "players-1", durationMinutes: 60, priceAmount: "100.00" },
    { gameType: GameType.PS5, pricingGroup: "players-2", durationMinutes: 60, priceAmount: "150.00" },
    { gameType: GameType.PS5, pricingGroup: "players-3", durationMinutes: 60, priceAmount: "200.00" },
    { gameType: GameType.PS5, pricingGroup: "players-4", durationMinutes: 60, priceAmount: "250.00" }
  ];
  const products = [
    { id: `product-${businessId}-water`, name: "Water Bottle", category: ProductCategory.BEVERAGES, priceAmount: "20.00" },
    { id: `product-${businessId}-chai`, name: "Masala Chai", category: ProductCategory.FOOD, priceAmount: "30.00" },
    { id: `product-${businessId}-fries`, name: "French Fries", category: ProductCategory.FOOD, priceAmount: "110.00" },
    { id: `product-${businessId}-classic-cigarette`, name: "Classic Cigarette", category: ProductCategory.CIGARETTES, priceAmount: "20.00" },
    { id: `product-${businessId}-cold-coffee`, name: "Cold Coffee", category: ProductCategory.BEVERAGES, priceAmount: "120.00" }
  ];

  await Promise.all(
    tables.map((table) =>
      db.clubTable.upsert({
        where: { businessId_number: { businessId, number: table.number } },
        update: { gameType: table.gameType, pricingGroup: table.pricingGroup, status: "AVAILABLE" },
        create: { businessId, ...table }
      })
    )
  );

  await Promise.all(
    pricing.map((rule) =>
      db.tablePricing.upsert({
        where: {
          businessId_gameType_pricingGroup_durationMinutes: {
            businessId,
            gameType: rule.gameType,
            pricingGroup: rule.pricingGroup,
            durationMinutes: rule.durationMinutes
          }
        },
        update: { priceAmount: rule.priceAmount },
        create: { businessId, ...rule }
      })
    )
  );

  await Promise.all(
    products.map((product) =>
      db.product.upsert({
        where: { id: product.id },
        update: { name: product.name, category: product.category, priceAmount: product.priceAmount, active: true },
        create: { businessId, ...product }
      })
    )
  );
}

async function createSubscription(db: SetupDb, input: {
  id: string;
  organizationId: string;
  businessId?: string;
  franchiseeId?: string;
  planId: string;
  outletLimit: number;
}) {
  const currentPeriodStart = new Date();
  currentPeriodStart.setHours(0, 0, 0, 0);
  const currentPeriodEnd = new Date(currentPeriodStart);
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

  return db.subscription.upsert({
    where: { id: input.id },
    update: {
      organizationId: input.organizationId,
      businessId: input.businessId ?? null,
      franchiseeId: input.franchiseeId ?? null,
      planId: input.planId,
      status: "ACTIVE",
      outletLimit: input.outletLimit,
      currentPeriodStart,
      currentPeriodEnd
    },
    create: {
      id: input.id,
      organizationId: input.organizationId,
      businessId: input.businessId ?? null,
      franchiseeId: input.franchiseeId ?? null,
      planId: input.planId,
      status: "ACTIVE",
      outletLimit: input.outletLimit,
      currentPeriodStart,
      currentPeriodEnd
    }
  });
}

function uniqueBusinessSlug(name: string) {
  return `${slugify(name)}-${Date.now().toString(36)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "tenant";
}

function initials(value: string) {
  const letters = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return letters || "BB";
}

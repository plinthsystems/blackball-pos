import { GameType, PrismaClient, ProductCategory } from "@prisma/client";
import { hashPassword } from "../src/server/auth/auth-service";
import { buildDatabaseUrl } from "../src/server/db/connection";
import crypto from "crypto";

const isProduction = process.env.NODE_ENV === "production";
const isSeedAllowed = process.env.SEED_ALLOWED === "true";
const skipOrganizations = process.env.SEED_SKIP_ORGANIZATIONS === "true";

if (isProduction && !isSeedAllowed) {
  throw new Error(
    "Refusing to seed in production — this creates known demo credentials. " +
    "Set SEED_ALLOWED=true ONLY if you intentionally want to wipe/seed in production."
  );
}

const prisma = new PrismaClient({ datasourceUrl: buildDatabaseUrl() });

/**
 * Generates a cryptographically strong random password.
 * Returns a 32-character random hex string.
 */
function generateSecurePassword(): string {
  return crypto.randomBytes(20).toString("hex");
}

const defaultPasswordHash = hashPassword(generateSecurePassword());

const permissionKeys = [
  "dashboard.read",
  "tables.read",
  "tables.manage",
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
  "settings.update",
  "bookings.manage",
  "billing.read"
];

const storeUserPermissionKeys = [
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

const desiredTablesForSeedBusiness = [
  { number: "Royal Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "royal" },
  { number: "Royal Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "royal" },
  { number: "Mini Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "mini" },
  { number: "Mini Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "mini" },
  { number: "Pool Table 1", gameType: GameType.POOL, pricingGroup: "standard" },
  { number: "PS5 1", gameType: GameType.PS5, pricingGroup: "standard" },
  { number: "PS5 2", gameType: GameType.PS5, pricingGroup: "standard" }
];

const standardTables = [
  { number: "Snooker Table 1", gameType: GameType.SNOOKER, pricingGroup: "royal" },
  { number: "Snooker Table 2", gameType: GameType.SNOOKER, pricingGroup: "royal" },
  { number: "Pool Table 1", gameType: GameType.POOL, pricingGroup: "standard" },
  { number: "Pool Table 2", gameType: GameType.POOL, pricingGroup: "standard" },
  { number: "PS5 Console 1", gameType: GameType.PS5, pricingGroup: "players-2" },
  { number: "PS5 Console 2", gameType: GameType.PS5, pricingGroup: "players-4" }
];

const menuProducts = [
  { name: "Masala Chai", category: ProductCategory.FOOD, priceAmount: "30.00" },
  { name: "Cappuccino", category: ProductCategory.FOOD, priceAmount: "90.00" },
  { name: "Club Sandwich", category: ProductCategory.FOOD, priceAmount: "140.00" },
  { name: "French Fries", category: ProductCategory.FOOD, priceAmount: "110.00" },
  { name: "Classic Cigarette", category: ProductCategory.CIGARETTES, priceAmount: "20.00" },
  { name: "Water Bottle", category: ProductCategory.BEVERAGES, priceAmount: "20.00" },
  { name: "Mineral Water 1L", category: ProductCategory.BEVERAGES, priceAmount: "20.00" },
  { name: "Red Bull Energy Drink", category: ProductCategory.BEVERAGES, priceAmount: "160.00" },
  { name: "Cold Coffee", category: ProductCategory.BEVERAGES, priceAmount: "120.00" }
];

const standardPricing = [
  { gameType: GameType.SNOOKER, pricingGroup: "royal", durationMinutes: 60, priceAmount: "350.00" },
  { gameType: GameType.POOL, pricingGroup: "standard", durationMinutes: 60, priceAmount: "180.00" },
  { gameType: GameType.PS5, pricingGroup: "players-2", durationMinutes: 60, priceAmount: "150.00" },
  { gameType: GameType.PS5, pricingGroup: "players-4", durationMinutes: 60, priceAmount: "250.00" }
];

async function main() {
  console.log("Seeding realistic Multi-Tenancy Demo Data...");

  const plans = await seedSubscriptionPlans();

  await prisma.permission.upsert({
    where: { key: "platform.setup.manage" },
    update: {},
    create: { key: "platform.setup.manage" }
  });

  await prisma.employee.upsert({
    where: { id: "user-platform-admin" },
    update: {
      name: "Ajinkya Platform Admin",
      email: "platform@blackball.example",
      passwordHash: defaultPasswordHash,
      accountType: "PLATFORM_ADMIN",
      active: true
    },
    create: {
      id: "user-platform-admin",
      name: "Ajinkya Platform Admin",
      email: "platform@blackball.example",
      passwordHash: defaultPasswordHash,
      accountType: "PLATFORM_ADMIN",
      active: true
    }
  });

  // Ensure all employees have default password set
  await prisma.employee.updateMany({
    data: { passwordHash: defaultPasswordHash }
  });

  // 1. FRANCHISE GROUP 1: BlackBall Franchise Group (3 Stores)
  // -------------------------------------------------------------
  const blackballOrg = await prisma.organization.upsert({
    where: { slug: "blackball-franchise" },
    update: { name: "BlackBall Franchise Group", type: "FRANCHISE" },
    create: { id: "org-blackball-franchise", name: "BlackBall Franchise Group", slug: "blackball-franchise", type: "FRANCHISE" }
  });

  const blackballBangaloreFranchisee = await prisma.franchisee.upsert({
    where: { organizationId_slug: { organizationId: blackballOrg.id, slug: "bangalore-central" } },
    update: { name: "Bangalore Central Franchisee", contactName: "Rahul Sharma", email: "franchisee.bangalore@blackball.example", active: true },
    create: {
      id: "franchisee-blackball-bangalore",
      organizationId: blackballOrg.id,
      slug: "bangalore-central",
      name: "Bangalore Central Franchisee",
      contactName: "Rahul Sharma",
      email: "franchisee.bangalore@blackball.example",
      phone: "+91 98765 90001"
    }
  });

  const blackballEastFranchisee = await prisma.franchisee.upsert({
    where: { organizationId_slug: { organizationId: blackballOrg.id, slug: "bangalore-east" } },
    update: { name: "Bangalore East Franchisee", contactName: "Priya Nair", email: "franchisee.east@blackball.example", active: true },
    create: {
      id: "franchisee-blackball-east",
      organizationId: blackballOrg.id,
      slug: "bangalore-east",
      name: "Bangalore East Franchisee",
      contactName: "Priya Nair",
      email: "franchisee.east@blackball.example",
      phone: "+91 98765 90002"
    }
  });

  await seedRoyaltyRule({
    id: "royalty-blackball-standard",
    organizationId: blackballOrg.id,
    name: "BlackBall standard royalty",
    rateBasisPoints: 600,
    minimumAmount: "15000.00"
  });

  // BlackBall HQ Admin
  await prisma.employee.upsert({
    where: { id: "user-blackball-hq" },
    update: { organizationId: blackballOrg.id, name: "Vikram Malhotra (HQ Director)", email: "hq.blackball@example.com", passwordHash: defaultPasswordHash, accountType: "HQ_ADMIN", active: true },
    create: { id: "user-blackball-hq", organizationId: blackballOrg.id, name: "Vikram Malhotra (HQ Director)", email: "hq.blackball@example.com", passwordHash: defaultPasswordHash, accountType: "HQ_ADMIN", active: true }
  });

  const bbStore1 = await createStoreWithData({
    id: "seed-business",
    organizationId: blackballOrg.id,
    slug: "seed-business",
    name: "BlackBall Koramangala",
    phone: "+91 98765 11111",
    email: "koramangala@blackball.example",
    franchiseeId: blackballBangaloreFranchisee.id,
    appName: "BlackBall Koramangala",
    logoInitials: "BB-K",
    brandColor: "#12613d",
    accentColor: "#b98922",
    managerEmail: "owner@cueclub.example", // default fallback email
    managerName: "Rahul Sharma (Store Manager)",
    staffEmail: "staff@cueclub.example",
    staffName: "Amit Kumar (Floor Staff)",
    occupiedCount: 2,
    salesTarget: 5200
  });

  const bbStore2 = await createStoreWithData({
    id: "outlet-mg-road",
    organizationId: blackballOrg.id,
    slug: "outlet-mg-road",
    name: "BlackBall MG Road",
    phone: "+91 98765 22222",
    email: "mgroad@blackball.example",
    franchiseeId: blackballBangaloreFranchisee.id,
    appName: "BlackBall MG Road",
    logoInitials: "BB-M",
    brandColor: "#12613d",
    accentColor: "#b98922",
    managerEmail: "manager.mgroad@blackball.example",
    managerName: "Sanjay Patel (Store Manager)",
    occupiedCount: 1,
    salesTarget: 4100
  });

  const bbStore3 = await createStoreWithData({
    id: "outlet-indiranagar",
    organizationId: blackballOrg.id,
    slug: "outlet-indiranagar",
    name: "BlackBall Indiranagar",
    phone: "+91 98765 33333",
    email: "indiranagar@blackball.example",
    franchiseeId: blackballEastFranchisee.id,
    appName: "BlackBall Indiranagar",
    logoInitials: "BB-I",
    brandColor: "#12613d",
    accentColor: "#b98922",
    managerEmail: "manager.indiranagar@blackball.example",
    managerName: "Priya Nair (Store Manager)",
    occupiedCount: 3,
    salesTarget: 6400
  });

  // -------------------------------------------------------------
  // 2. FRANCHISE GROUP 2: CueNation Franchise Group (2 Stores)
  // -------------------------------------------------------------
  const cuenationOrg = await prisma.organization.upsert({
    where: { slug: "cuenation-franchise" },
    update: { name: "CueNation Franchise Group", type: "FRANCHISE" },
    create: { id: "org-cuenation-franchise", name: "CueNation Franchise Group", slug: "cuenation-franchise", type: "FRANCHISE" }
  });

  const cuenationWhitefieldFranchisee = await prisma.franchisee.upsert({
    where: { organizationId_slug: { organizationId: cuenationOrg.id, slug: "whitefield-franchisee" } },
    update: { name: "Whitefield Franchisee", contactName: "Karthik Verma", email: "franchisee.whitefield@cuenation.example", active: true },
    create: {
      id: "franchisee-cuenation-whitefield",
      organizationId: cuenationOrg.id,
      slug: "whitefield-franchisee",
      name: "Whitefield Franchisee",
      contactName: "Karthik Verma",
      email: "franchisee.whitefield@cuenation.example",
      phone: "+91 98765 90003"
    }
  });

  const cuenationSouthFranchisee = await prisma.franchisee.upsert({
    where: { organizationId_slug: { organizationId: cuenationOrg.id, slug: "south-bangalore-franchisee" } },
    update: { name: "South Bangalore Franchisee", contactName: "Deepak Rao", email: "franchisee.south@cuenation.example", active: true },
    create: {
      id: "franchisee-cuenation-south",
      organizationId: cuenationOrg.id,
      slug: "south-bangalore-franchisee",
      name: "South Bangalore Franchisee",
      contactName: "Deepak Rao",
      email: "franchisee.south@cuenation.example",
      phone: "+91 98765 90004"
    }
  });

  await seedRoyaltyRule({
    id: "royalty-cuenation-standard",
    organizationId: cuenationOrg.id,
    name: "CueNation standard royalty",
    rateBasisPoints: 500,
    minimumAmount: "12000.00"
  });

  // CueNation HQ Admin
  await prisma.employee.upsert({
    where: { id: "user-cuenation-hq" },
    update: { organizationId: cuenationOrg.id, name: "Anish Roy (HQ Director)", email: "hq.cuenation@example.com", passwordHash: defaultPasswordHash, accountType: "HQ_ADMIN", active: true },
    create: { id: "user-cuenation-hq", organizationId: cuenationOrg.id, name: "Anish Roy (HQ Director)", email: "hq.cuenation@example.com", passwordHash: defaultPasswordHash, accountType: "HQ_ADMIN", active: true }
  });

  await createStoreWithData({
    id: "outlet-whitefield",
    organizationId: cuenationOrg.id,
    slug: "outlet-whitefield",
    name: "CueNation Whitefield",
    phone: "+91 98765 44444",
    email: "whitefield@cuenation.example",
    franchiseeId: cuenationWhitefieldFranchisee.id,
    appName: "CueNation Whitefield",
    logoInitials: "CN-W",
    brandColor: "#0284c7",
    accentColor: "#f59e0b",
    managerEmail: "whitefield.manager@cuenation.example",
    managerName: "Karthik Verma (Store Manager)",
    occupiedCount: 2,
    salesTarget: 3800
  });

  await createStoreWithData({
    id: "outlet-hsr",
    organizationId: cuenationOrg.id,
    slug: "outlet-hsr",
    name: "CueNation HSR Layout",
    phone: "+91 98765 55555",
    email: "hsr@cuenation.example",
    franchiseeId: cuenationSouthFranchisee.id,
    appName: "CueNation HSR",
    logoInitials: "CN-H",
    brandColor: "#0284c7",
    accentColor: "#f59e0b",
    managerEmail: "hsr.manager@cuenation.example",
    managerName: "Deepak Rao (Store Manager)",
    occupiedCount: 1,
    salesTarget: 3100
  });

  // -------------------------------------------------------------
  // 3. INDEPENDENT SAAS B2B STORES (3 Independent Owners)
  // -------------------------------------------------------------
  // Independent SaaS Store 1
  const saas1Org = await prisma.organization.upsert({
    where: { slug: "royal-snooker-org" },
    update: { name: "Royal Snooker Club", type: "INDEPENDENT_SAAS" },
    create: { id: "org-royal-snooker", name: "Royal Snooker Club", slug: "royal-snooker-org", type: "INDEPENDENT_SAAS" }
  });
  await createStoreWithData({
    id: "saas-royal-snooker",
    organizationId: saas1Org.id,
    slug: "saas-royal-snooker",
    name: "Royal Snooker Club (JP Nagar)",
    phone: "+91 98765 66666",
    email: "owner@royalsnooker.example",
    appName: "Royal Snooker Club",
    logoInitials: "RSC",
    brandColor: "#7c3aed",
    accentColor: "#eab308",
    managerEmail: "owner@royalsnooker.example",
    managerName: "Arjun Reddy (Club Owner)",
    occupiedCount: 3,
    salesTarget: 5800
  });
  await seedSubscription({
    id: "subscription-royal-snooker",
    organizationId: saas1Org.id,
    businessId: "saas-royal-snooker",
    planId: plans.professional.id,
    outletLimit: 1
  });

  // Independent SaaS Store 2
  const saas2Org = await prisma.organization.upsert({
    where: { slug: "break-and-run-org" },
    update: { name: "Break & Run Pool Lounge", type: "INDEPENDENT_SAAS" },
    create: { id: "org-break-and-run", name: "Break & Run Pool Lounge", slug: "break-and-run-org", type: "INDEPENDENT_SAAS" }
  });
  await createStoreWithData({
    id: "saas-break-and-run",
    organizationId: saas2Org.id,
    slug: "saas-break-and-run",
    name: "Break & Run Lounge (BTM Layout)",
    phone: "+91 98765 77777",
    email: "owner@breakandrun.example",
    appName: "Break & Run Lounge",
    logoInitials: "B&R",
    brandColor: "#dc2626",
    accentColor: "#fbbf24",
    managerEmail: "owner@breakandrun.example",
    managerName: "Varun Mehta (Club Owner)",
    occupiedCount: 2,
    salesTarget: 4300
  });
  await seedSubscription({
    id: "subscription-break-and-run",
    organizationId: saas2Org.id,
    businessId: "saas-break-and-run",
    planId: plans.professional.id,
    outletLimit: 1
  });

  // Independent SaaS Store 3
  const saas3Org = await prisma.organization.upsert({
    where: { slug: "gamezone-org" },
    update: { name: "GameZone PS5 & Cue Cafe", type: "INDEPENDENT_SAAS" },
    create: { id: "org-gamezone", name: "GameZone PS5 & Cue Cafe", slug: "gamezone-org", type: "INDEPENDENT_SAAS" }
  });
  await createStoreWithData({
    id: "saas-gamezone",
    organizationId: saas3Org.id,
    slug: "saas-gamezone",
    name: "GameZone PS5 & Cue (Hebbal)",
    phone: "+91 98765 88888",
    email: "owner@gamezone.example",
    appName: "GameZone PS5 Cafe",
    logoInitials: "GZ",
    brandColor: "#059669",
    accentColor: "#38bdf8",
    managerEmail: "owner@gamezone.example",
    managerName: "Karan Singh (Club Owner)",
    occupiedCount: 2,
    salesTarget: 4900
  });
  await seedSubscription({
    id: "subscription-gamezone",
    organizationId: saas3Org.id,
    businessId: "saas-gamezone",
    planId: plans.multiOutlet.id,
    outletLimit: 3
  });

  await seedSubscription({
    id: "subscription-blackball-franchise",
    organizationId: blackballOrg.id,
    franchiseeId: blackballBangaloreFranchisee.id,
    planId: plans.franchise.id,
    outletLimit: 5
  });

  await seedSubscription({
    id: "subscription-cuenation-franchise",
    organizationId: cuenationOrg.id,
    franchiseeId: cuenationWhitefieldFranchisee.id,
    planId: plans.franchise.id,
    outletLimit: 5
  });

  // Seed billing data with store-specific amounts for easy verification
  await seedBillingData();

  console.log("Successfully seeded 2 Franchise Groups (5 Outlets total) and 3 Independent B2B SaaS Store accounts!");
}

type CreateStoreInput = {
  id: string;
  organizationId: string;
  franchiseeId?: string;
  slug: string;
  name: string;
  phone: string;
  email: string;
  appName: string;
  logoInitials: string;
  brandColor: string;
  accentColor: string;
  managerEmail: string;
  managerName: string;
  staffEmail?: string;
  staffName?: string;
  occupiedCount: number;
  salesTarget: number;
};

async function seedSubscriptionPlans() {
  const starter = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-starter-monthly" },
    update: {
      name: "Starter",
      baseAmount: "1999.00",
      pricePerOutletAmount: "0.00",
      setupFeeAmount: "10000.00",
      includedOutletCount: 1,
      active: true,
      features: ["live_tables", "billing", "food_menu", "daily_reports"]
    },
    create: {
      id: "plan-starter-monthly",
      code: "starter",
      name: "Starter",
      description: "Single outlet table and billing operations",
      billingCycle: "MONTHLY",
      baseAmount: "1999.00",
      pricePerOutletAmount: "0.00",
      setupFeeAmount: "10000.00",
      includedOutletCount: 1,
      features: ["live_tables", "billing", "food_menu", "daily_reports"]
    }
  });

  const professional = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-professional-monthly" },
    update: {
      name: "Professional",
      baseAmount: "3999.00",
      pricePerOutletAmount: "0.00",
      setupFeeAmount: "20000.00",
      includedOutletCount: 1,
      active: true,
      features: ["live_tables", "billing", "food_menu", "rates", "owner_dashboard", "staff_roles"]
    },
    create: {
      id: "plan-professional-monthly",
      code: "professional",
      name: "Professional",
      description: "Full club operations with owner dashboard",
      billingCycle: "MONTHLY",
      baseAmount: "3999.00",
      pricePerOutletAmount: "0.00",
      setupFeeAmount: "20000.00",
      includedOutletCount: 1,
      features: ["live_tables", "billing", "food_menu", "rates", "owner_dashboard", "staff_roles"]
    }
  });

  const multiOutlet = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-multi-outlet-monthly" },
    update: {
      name: "Multi-Outlet",
      baseAmount: "6999.00",
      pricePerOutletAmount: "2000.00",
      setupFeeAmount: "30000.00",
      includedOutletCount: 2,
      active: true,
      features: ["multi_outlet_dashboard", "store_switching", "central_rates", "inventory_ready", "advanced_reports"]
    },
    create: {
      id: "plan-multi-outlet-monthly",
      code: "multi-outlet",
      name: "Multi-Outlet",
      description: "Owner dashboard across multiple outlets",
      billingCycle: "MONTHLY",
      baseAmount: "6999.00",
      pricePerOutletAmount: "2000.00",
      setupFeeAmount: "30000.00",
      includedOutletCount: 2,
      features: ["multi_outlet_dashboard", "store_switching", "central_rates", "inventory_ready", "advanced_reports"]
    }
  });

  const franchise = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-franchise-monthly" },
    update: {
      name: "Franchise Platform",
      baseAmount: "15000.00",
      pricePerOutletAmount: "2500.00",
      setupFeeAmount: "50000.00",
      includedOutletCount: 3,
      active: true,
      features: ["hq_dashboard", "franchisee_dashboard", "royalties", "multi_outlet_controls", "priority_support"]
    },
    create: {
      id: "plan-franchise-monthly",
      code: "franchise",
      name: "Franchise Platform",
      description: "Franchisor and franchisee management",
      billingCycle: "MONTHLY",
      baseAmount: "15000.00",
      pricePerOutletAmount: "2500.00",
      setupFeeAmount: "50000.00",
      includedOutletCount: 3,
      features: ["hq_dashboard", "franchisee_dashboard", "royalties", "multi_outlet_controls", "priority_support"]
    }
  });

  return { starter, professional, multiOutlet, franchise };
}

async function seedRoyaltyRule(input: {
  id: string;
  organizationId: string;
  name: string;
  rateBasisPoints: number;
  minimumAmount: string;
}) {
  return prisma.royaltyRule.upsert({
    where: { id: input.id },
    update: {
      organizationId: input.organizationId,
      name: input.name,
      basis: "GROSS_SALES",
      rateBasisPoints: input.rateBasisPoints,
      minimumAmount: input.minimumAmount,
      active: true
    },
    create: {
      id: input.id,
      organizationId: input.organizationId,
      name: input.name,
      basis: "GROSS_SALES",
      rateBasisPoints: input.rateBasisPoints,
      minimumAmount: input.minimumAmount,
      fixedAmount: "0.00"
    }
  });
}

async function seedSubscription(input: {
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

  return prisma.subscription.upsert({
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

async function createStoreWithData(input: CreateStoreInput) {
  const store = await prisma.business.upsert({
    where: { id: input.id },
    update: {
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId ?? null,
      slug: input.slug,
      name: input.name,
      phone: input.phone,
      email: input.email
    },
    create: {
      id: input.id,
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId ?? null,
      slug: input.slug,
      name: input.name,
      phone: input.phone,
      email: input.email,
      settings: {
        create: {
          appName: input.appName,
          logoInitials: input.logoInitials,
          brandColor: input.brandColor,
          accentColor: input.accentColor,
          taxRateBasisPoints: 1800,
          bookingBufferMinutes: 10
        }
      }
    }
  });

  await prisma.businessSettings.upsert({
    where: { businessId: store.id },
    update: {
      appName: input.appName,
      logoInitials: input.logoInitials,
      brandColor: input.brandColor,
      accentColor: input.accentColor
    },
    create: {
      businessId: store.id,
      appName: input.appName,
      logoInitials: input.logoInitials,
      brandColor: input.brandColor,
      accentColor: input.accentColor
    }
  });

  // Ensure permissions exist
  await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key }
      })
    )
  );

  const ownerRole = await prisma.role.upsert({
    where: { businessId_name: { businessId: store.id, name: "Owner" } },
    update: {},
    create: { businessId: store.id, name: "Owner", description: "Full store operational access" }
  });

  const allPermissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  await Promise.all(
    allPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: permission.id }
      })
    )
  );

  const manager = await prisma.employee.upsert({
    where: { id: `user-mgr-${store.id}` },
    update: {
      businessId: store.id,
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId ?? null,
      name: input.managerName,
      email: input.managerEmail,
      passwordHash: defaultPasswordHash,
      accountType: "STORE_OWNER",
      active: true
    },
    create: {
      id: `user-mgr-${store.id}`,
      businessId: store.id,
      organizationId: input.organizationId,
      franchiseeId: input.franchiseeId ?? null,
      name: input.managerName,
      email: input.managerEmail,
      passwordHash: defaultPasswordHash,
      accountType: "STORE_OWNER",
      active: true,
      roles: { create: { roleId: ownerRole.id } }
    }
  });

  if (input.staffEmail && input.staffName) {
    const staffRole = await prisma.role.upsert({
      where: { businessId_name: { businessId: store.id, name: "Staff" } },
      update: {},
      create: { businessId: store.id, name: "Staff", description: "Counter and floor operations" }
    });

    await prisma.employee.upsert({
      where: { id: `user-staff-${store.id}` },
      update: {
        businessId: store.id,
        organizationId: input.organizationId,
        franchiseeId: input.franchiseeId ?? null,
        name: input.staffName,
        email: input.staffEmail,
        passwordHash: defaultPasswordHash,
        accountType: "STORE_USER",
        active: true
      },
      create: {
        id: `user-staff-${store.id}`,
        businessId: store.id,
        organizationId: input.organizationId,
        franchiseeId: input.franchiseeId ?? null,
        name: input.staffName,
        email: input.staffEmail,
        passwordHash: defaultPasswordHash,
        accountType: "STORE_USER",
        active: true,
        roles: { create: { roleId: staffRole.id } }
      }
    });
  }

const desiredPricingForSeedBusiness = [
  { gameType: GameType.SNOOKER, pricingGroup: "royal", durationMinutes: 60, priceAmount: "350.00" },
  { gameType: GameType.SNOOKER, pricingGroup: "mini", durationMinutes: 60, priceAmount: "330.00" },
  { gameType: GameType.POOL, pricingGroup: "standard", durationMinutes: 60, priceAmount: "160.00" },
  { gameType: GameType.PS5, pricingGroup: "players-1", durationMinutes: 60, priceAmount: "100.00" },
  { gameType: GameType.PS5, pricingGroup: "players-2", durationMinutes: 60, priceAmount: "150.00" },
  { gameType: GameType.PS5, pricingGroup: "players-3", durationMinutes: 60, priceAmount: "200.00" },
  { gameType: GameType.PS5, pricingGroup: "players-4", durationMinutes: 60, priceAmount: "250.00" }
];

  // Table pricing
  const pricingToSeed = store.id === "seed-business" ? desiredPricingForSeedBusiness : standardPricing;
  await prisma.tablePricing.deleteMany({ where: { businessId: store.id } });
  for (const rule of pricingToSeed) {
    await prisma.tablePricing.upsert({
      where: {
        businessId_gameType_pricingGroup_durationMinutes: {
          businessId: store.id,
          gameType: rule.gameType,
          pricingGroup: rule.pricingGroup,
          durationMinutes: rule.durationMinutes
        }
      },
      update: { priceAmount: rule.priceAmount },
      create: { businessId: store.id, ...rule }
    });
  }

  // Club Tables
  const tablesToSeed = store.id === "seed-business" ? desiredTablesForSeedBusiness : standardTables;
  await prisma.clubTable.deleteMany({
    where: {
      businessId: store.id,
      number: { notIn: tablesToSeed.map((t) => t.number) }
    }
  });
  let occupiedLeft = input.occupiedCount;
  for (const table of tablesToSeed) {
    const isOccupied = occupiedLeft > 0;
    if (isOccupied) occupiedLeft--;

    await prisma.clubTable.upsert({
      where: { businessId_number: { businessId: store.id, number: table.number } },
      update: {
        gameType: table.gameType,
        status: isOccupied ? "OCCUPIED" : "AVAILABLE",
        pricingGroup: table.pricingGroup
      },
      create: {
        businessId: store.id,
        number: table.number,
        gameType: table.gameType,
        status: isOccupied ? "OCCUPIED" : "AVAILABLE",
        pricingGroup: table.pricingGroup
      }
    });
  }

  // Products
  for (const product of menuProducts) {
    const existing = await prisma.product.findFirst({
      where: { businessId: store.id, name: product.name }
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          businessId: store.id,
          ...product
        }
      });
    }
  }

  // Seed Today's Completed Bills & Sales History
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

  // Generate 4-6 completed bills for sales history
  const billAmounts = [450, 780, 1200, 650, 950, 1170];
  for (let i = 0; i < billAmounts.length; i++) {
    const billTime = new Date(todayStart.getTime() + i * 2 * 60 * 60 * 1000);
    const amount = billAmounts[i];

    const bill = await prisma.bill.create({
      data: {
        businessId: store.id,
        kind: i % 2 === 0 ? "SESSION" : "COUNTER",
        status: "CLOSED",
        openedAt: billTime,
        closedAt: new Date(billTime.getTime() + 45 * 60 * 1000),
        tableAmountSnapshot: amount * 0.7,
        itemTotalAmountSnapshot: amount * 0.3,
        totalAmountSnapshot: amount
      }
    });

    await prisma.billItem.create({
      data: {
        businessId: store.id,
        billId: bill.id,
        category: ProductCategory.FOOD,
        nameSnapshot: "Masala Chai & Snack Combo",
        unitPriceAmount: amount * 0.3,
        quantity: 1,
        lineTotalAmount: amount * 0.3
      }
    });
  }

  return store;
}

/**
 * Seed billing data with completely unique profiles per store.
 * Each store gets different:
 *  - Mix of OPEN/CLOSED/CANCELLED bills
 *  - Different SESSION vs COUNTER ratios
 *  - Dates spread across 10+ days
 *  - Random item counts (0-4) and categories
 *  - Staff names and table associations
 *  - Realistic random amounts (no multipliers/formulas)
 */
async function seedBillingData() {
  const stores = await prisma.business.findMany({
    select: { id: true, slug: true, name: true }
  });

  // --- Store-specific profiles (completely different) ---
  const storeProfiles: Record<string, {
    prefix: string;
    billCount: number;
    openCount: number;
    closedCount: number;
    cancelledCount: number;
    sessionRatio: number;    // 0-1, fraction of bills that are SESSION
    hasTables: boolean;      // SESSION bills have table associations
    staffNames: string[];
    primaryCategories: ProductCategory[];
  }> = {
    "seed-business": {
      prefix: "BBK",
      billCount: 14, openCount: 4, closedCount: 8, cancelledCount: 2,
      sessionRatio: 0.5, hasTables: true,
      staffNames: ["Rahul Sharma", "Amit Kumar", "Priya Singh"],
      primaryCategories: ["FOOD", "BEVERAGES", "CIGARETTES"]
    },
    "outlet-mg-road": {
      prefix: "BBM",
      billCount: 11, openCount: 2, closedCount: 7, cancelledCount: 2,
      sessionRatio: 0.7, hasTables: true,
      staffNames: ["Sanjay Patel", "Neha Desai"],
      primaryCategories: ["FOOD", "FOOD", "BEVERAGES"]
    },
    "outlet-indiranagar": {
      prefix: "BBI",
      billCount: 18, openCount: 5, closedCount: 10, cancelledCount: 3,
      sessionRatio: 0.4, hasTables: true,
      staffNames: ["Priya Nair", "Vikram Joshi", "Meera Rao", "Arjun Das"],
      primaryCategories: ["FOOD", "CIGARETTES", "FOOD", "BEVERAGES"]
    },
    "outlet-whitefield": {
      prefix: "CNW",
      billCount: 9, openCount: 1, closedCount: 7, cancelledCount: 1,
      sessionRatio: 0.9, hasTables: true,
      staffNames: ["Karthik Verma"],
      primaryCategories: ["FOOD", "FOOD", "BEVERAGES"]
    },
    "outlet-hsr": {
      prefix: "CNH",
      billCount: 7, openCount: 1, closedCount: 5, cancelledCount: 1,
      sessionRatio: 0.3, hasTables: false,
      staffNames: ["Deepak Rao", "Sunita K"],
      primaryCategories: ["BEVERAGES", "CIGARETTES", "FOOD"]
    },
    "saas-royal-snooker": {
      prefix: "RSC",
      billCount: 16, openCount: 3, closedCount: 11, cancelledCount: 2,
      sessionRatio: 0.8, hasTables: true,
      staffNames: ["Arjun Reddy", "Lakshmi N", "Rohan P"],
      primaryCategories: ["FOOD", "CIGARETTES", "BEVERAGES", "FOOD"]
    },
    "saas-break-and-run": {
      prefix: "BAR",
      billCount: 12, openCount: 2, closedCount: 8, cancelledCount: 2,
      sessionRatio: 0.6, hasTables: true,
      staffNames: ["Varun Mehta", "Kavita S", "Aditya M"],
      primaryCategories: ["FOOD", "BEVERAGES", "CIGARETTES"]
    },
    "saas-gamezone": {
      prefix: "GZC",
      billCount: 10, openCount: 2, closedCount: 6, cancelledCount: 2,
      sessionRatio: 0.5, hasTables: true,
      staffNames: ["Karan Singh", "Pooja Gupta"],
      primaryCategories: ["BEVERAGES", "FOOD", "CIGARETTES"]
    }
  };

  const productOptions = [
    { name: "Masala Chai & Snack", category: "FOOD" as ProductCategory, priceRange: [40, 160] },
    { name: "Club Sandwich Special", category: "FOOD" as ProductCategory, priceRange: [120, 280] },
    { name: "Cold Coffee", category: "FOOD" as ProductCategory, priceRange: [80, 140] },
    { name: "French Fries", category: "FOOD" as ProductCategory, priceRange: [70, 130] },
    { name: "Premium Cigarette Pack", category: "CIGARETTES" as ProductCategory, priceRange: [40, 120] },
    { name: "Classic Cigarette", category: "CIGARETTES" as ProductCategory, priceRange: [20, 60] },
    { name: "Red Bull Energy Drink", category: "BEVERAGES" as ProductCategory, priceRange: [100, 180] },
    { name: "Water Bottle", category: "BEVERAGES" as ProductCategory, priceRange: [20, 40] },
    { name: "Mineral Water 1L", category: "BEVERAGES" as ProductCategory, priceRange: [20, 40] },
    { name: "Cappuccino", category: "FOOD" as ProductCategory, priceRange: [70, 120] },
    { name: "Veg Burger", category: "FOOD" as ProductCategory, priceRange: [100, 180] },
    { name: "Pasta Bowl", category: "FOOD" as ProductCategory, priceRange: [150, 280] },
  ];

  const now = new Date();

  for (const store of stores) {
    const slug = store.slug;
    const profile = storeProfiles[slug];
    if (!profile) continue;

    // Clear old data
    await prisma.billItem.deleteMany({ where: { businessId: store.id } });
    await prisma.bill.deleteMany({ where: { businessId: store.id } });

    // Simple hash of slug for deterministic-but-different per store
    let rng = 0;
    for (let i = 0; i < slug.length; i++) {
      rng = (rng * 31 + slug.charCodeAt(i)) % 10000;
    }

    const randomBetween = (min: number, max: number, offset: number = 0): number => {
      const val = ((rng + offset * 9301 + 49297) % 233280) / 233280;
      return Math.round(min + val * (max - min));
    };

    // Build date/time offsets: spread across ~15 days
    const dateOffsets: Array<{ day: number; hour: number; minute: number }> = [];

    // Today: open bills first
    for (let i = 0; i < profile.openCount; i++) {
      dateOffsets.push({ day: 0, hour: 9 + i * 2, minute: randomBetween(0, 50, i * 3) });
    }
    // Today: some closed bills
    const closedToday = Math.min(profile.closedCount, profile.openCount + 2);
    for (let i = 0; i < closedToday; i++) {
      dateOffsets.push({ day: 0, hour: 11 + i * 2, minute: randomBetween(0, 50, 100 + i * 5) });
    }
    // Yesterday
    for (let i = 0; i < Math.floor(profile.closedCount / 3); i++) {
      dateOffsets.push({ day: -1, hour: 10 + i * 3, minute: randomBetween(0, 50, 200 + i * 7) });
    }
    // Older days (2-14 days ago)
    for (let i = 0; i < profile.billCount - dateOffsets.length; i++) {
      const daysAgo = 2 + (i % 13);
      dateOffsets.push({ day: -daysAgo, hour: 11 + randomBetween(0, 8, 300 + i), minute: randomBetween(0, 59, 400 + i) });
    }

    // Fetch employees for this store
    const employees = await prisma.employee.findMany({
      where: { businessId: store.id, active: true },
      select: { id: true, name: true },
      take: 3
    });
    const defaultEmployeeId = employees[0]?.id ?? "seed-employee";

    for (let i = 0; i < dateOffsets.length; i++) {
      const offset = dateOffsets[i];
      const openedAt = new Date(now);
      openedAt.setDate(openedAt.getDate() + offset.day);
      openedAt.setHours(offset.hour, offset.minute, 0, 0);

      // Determine status
      let status: "OPEN" | "CLOSED" | "CANCELLED" = "CLOSED";
      if (i < profile.openCount) status = "OPEN";
      else if (i >= profile.openCount + profile.closedCount) status = "CANCELLED";

      // Determine kind
      const kind: "SESSION" | "COUNTER" = Math.random() < profile.sessionRatio ? "SESSION" : "COUNTER";

      // Amounts — unique ranges per store prefix
      const baseAmount = profile.prefix === "RSC" ? randomBetween(800, 2800, i * 11)
        : profile.prefix === "BBI" ? randomBetween(500, 1800, i * 13)
        : profile.prefix === "BBK" ? randomBetween(400, 1500, i * 17)
        : profile.prefix === "CNW" ? randomBetween(350, 900, i * 19)
        : profile.prefix === "CNH" ? randomBetween(200, 600, i * 23)
        : profile.prefix === "BAR" ? randomBetween(300, 1100, i * 29)
        : profile.prefix === "GZC" ? randomBetween(450, 1300, i * 31)
        : randomBetween(350, 1000, i * 37);

      const totalAmount = baseAmount;
      const tablePortion = Math.round(baseAmount * randomBetween(50, 80, i * 41) / 100);
      const itemPortion = baseAmount - tablePortion;

      await prisma.bill.create({
        data: {
          businessId: store.id,
          label: `${profile.prefix}-${String(i + 1).padStart(3, "0")}`,
          kind,
          status,
          openedAt,
          closedAt: status !== "OPEN" ? new Date(openedAt.getTime() + randomBetween(25, 90, i * 43) * 60 * 1000) : null,
          tableAmountSnapshot: tablePortion,
          itemTotalAmountSnapshot: itemPortion,
          totalAmountSnapshot: totalAmount
        }
      }).then(async (bill) => {
        // Add items if CLOSED
        if (status === "CLOSED" && Math.random() > 0.3) {
          const itemCount = randomBetween(1, 3, i * 47);
          for (let j = 0; j < itemCount; j++) {
            const product = productOptions[randomBetween(0, productOptions.length - 1, i * 53 + j * 3)];
            const qty = randomBetween(1, 4, i * 59 + j * 7);
            const unitPrice = Math.round((itemPortion / itemCount / qty) * 100) / 100;

            await prisma.billItem.create({
              data: {
                businessId: store.id,
                billId: bill.id,
                category: product.category,
                nameSnapshot: product.name,
                quantity: qty,
                unitPriceAmount: unitPrice,
                lineTotalAmount: Math.round(unitPrice * qty * 100) / 100
              }
            });
          }
        }
      });
    }

    // Create sessions for stores with tables
    if (profile.hasTables) {
      const tables = await prisma.clubTable.findMany({
        where: { businessId: store.id, active: true },
        select: { id: true, number: true }
      });

      if (tables.length > 0) {
        const sessionsToCreate = randomBetween(2, 4, 900);
        for (let s = 0; s < sessionsToCreate; s++) {
          const table = tables[s % tables.length];
          const employee = employees[randomBetween(0, employees.length - 1, s * 11)] ?? employees[0];
          const startedAt = new Date(now);
          startedAt.setDate(startedAt.getDate() - randomBetween(0, 3, s * 13));
          startedAt.setHours(randomBetween(10, 22, s * 17), randomBetween(0, 59, s * 19));

          await prisma.session.create({
            data: {
              businessId: store.id,
              tableId: table.id,
              assignedEmployeeId: employee.id,
              createdByEmployeeId: defaultEmployeeId,
              status: Math.random() > 0.6 ? "ACTIVE" : "COMPLETED",
              startedAt,
              plannedEndAt: new Date(startedAt.getTime() + randomBetween(60, 180, s * 23) * 60 * 1000)
            }
          });
        }
      }
    }
  }

  console.log("Billing data seeded with unique profiles per store (different counts, statuses, kinds, dates, item mixes).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

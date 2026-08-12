import { GameType, PrismaClient, ProductCategory } from "@prisma/client";
import { hashPassword } from "../src/server/auth/auth-service";

const prisma = new PrismaClient();
const defaultPasswordHash = hashPassword("Password@123");

const permissionKeys = [
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

  console.log("Successfully seeded 2 Franchise Groups (5 Outlets total) and 3 Independent B2B SaaS Store accounts!");
}

type CreateStoreInput = {
  id: string;
  organizationId: string;
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

async function createStoreWithData(input: CreateStoreInput) {
  const store = await prisma.business.upsert({
    where: { id: input.id },
    update: {
      organizationId: input.organizationId,
      slug: input.slug,
      name: input.name,
      phone: input.phone,
      email: input.email
    },
    create: {
      id: input.id,
      organizationId: input.organizationId,
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

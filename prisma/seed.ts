import { GameType, PrismaClient, ProductCategory } from "@prisma/client";

const prisma = new PrismaClient();

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

const desiredTables = [
  { number: "Royal Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "royal" },
  { number: "Royal Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "royal" },
  { number: "Mini Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "mini" },
  { number: "Mini Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "mini" },
  { number: "Pool Table 1", gameType: GameType.POOL, pricingGroup: "standard" },
  { number: "PS5 1", gameType: GameType.PS5, pricingGroup: "standard" },
  { number: "PS5 2", gameType: GameType.PS5, pricingGroup: "standard" }
];

const menuProducts = [
  { name: "Tea", category: ProductCategory.FOOD, priceAmount: "20.00" },
  { name: "Coffee", category: ProductCategory.FOOD, priceAmount: "40.00" },
  { name: "Sandwich", category: ProductCategory.FOOD, priceAmount: "80.00" },
  { name: "Classic Cigarette", category: ProductCategory.CIGARETTES, priceAmount: "20.00" },
  { name: "Gold Flake Cigarette", category: ProductCategory.CIGARETTES, priceAmount: "20.00" },
  { name: "Water Bottle", category: ProductCategory.BEVERAGES, priceAmount: "20.00" },
  { name: "Cold Drink", category: ProductCategory.BEVERAGES, priceAmount: "40.00" },
  { name: "Energy Drink", category: ProductCategory.BEVERAGES, priceAmount: "120.00" }
];

async function main() {
  const business = await prisma.business.upsert({
    where: { id: "seed-business" },
    update: {
      slug: "seed-business",
      name: "Pool & Snooker Cafe",
      phone: "+91 90000 00000",
      email: "operations@cueclub.example"
    },
    create: {
      id: "seed-business",
      slug: "seed-business",
      name: "Pool & Snooker Cafe",
      phone: "+91 90000 00000",
      email: "operations@cueclub.example",
      settings: {
        create: {
          appName: "Black Ball",
          logoInitials: "BB",
          brandColor: "#12613d",
          accentColor: "#b98922",
          taxRateBasisPoints: 1800,
          bookingBufferMinutes: 10
        }
      }
    }
  });

  await prisma.businessSettings.upsert({
    where: { businessId: business.id },
    update: {
      appName: "Black Ball",
      logoInitials: "BB",
      brandColor: "#12613d",
      accentColor: "#b98922",
      taxRateBasisPoints: 1800,
      bookingBufferMinutes: 10
    },
    create: {
      businessId: business.id,
      appName: "Black Ball",
      logoInitials: "BB",
      brandColor: "#12613d",
      accentColor: "#b98922",
      taxRateBasisPoints: 1800,
      bookingBufferMinutes: 10
    }
  });

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
    where: { businessId_name: { businessId: business.id, name: "Owner" } },
    update: {},
    create: { businessId: business.id, name: "Owner", description: "Full operational access" }
  });

  const storeUserRole = await prisma.role.upsert({
    where: { businessId_name: { businessId: business.id, name: "Store User" } },
    update: {},
    create: { businessId: business.id, name: "Store User", description: "Live floor and billing access" }
  });

  const owner = await prisma.employee.upsert({
    where: { businessId_email: { businessId: business.id, email: "owner@cueclub.example" } },
    update: { name: "Cafe Manager", accountType: "MANAGER", active: true },
    create: {
      businessId: business.id,
      name: "Cafe Manager",
      email: "owner@cueclub.example",
      accountType: "MANAGER",
      roles: { create: { roleId: ownerRole.id } }
    }
  });

  const storeUser = await prisma.employee.upsert({
    where: { businessId_email: { businessId: business.id, email: "staff@cueclub.example" } },
    update: { name: "Floor Staff", accountType: "STORE_USER", active: true },
    create: {
      businessId: business.id,
      name: "Floor Staff",
      email: "staff@cueclub.example",
      accountType: "STORE_USER",
      roles: { create: { roleId: storeUserRole.id } }
    }
  });

  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: owner.id, roleId: ownerRole.id } },
    update: {},
    create: { employeeId: owner.id, roleId: ownerRole.id }
  });

  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: storeUser.id, roleId: storeUserRole.id } },
    update: {},
    create: { employeeId: storeUser.id, roleId: storeUserRole.id }
  });

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: permission.id }
      })
    )
  );

  const storePermissions = await prisma.permission.findMany({ where: { key: { in: storeUserPermissionKeys } } });
  await Promise.all(
    storePermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: storeUserRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: storeUserRole.id, permissionId: permission.id }
      })
    )
  );

  const pricing = [
    { gameType: GameType.SNOOKER, pricingGroup: "royal", durationMinutes: 60, priceAmount: "350.00" },
    { gameType: GameType.SNOOKER, pricingGroup: "mini", durationMinutes: 60, priceAmount: "330.00" },
    { gameType: GameType.POOL, pricingGroup: "standard", durationMinutes: 60, priceAmount: "160.00" },
    { gameType: GameType.PS5, pricingGroup: "players-1", durationMinutes: 60, priceAmount: "100.00" },
    { gameType: GameType.PS5, pricingGroup: "players-2", durationMinutes: 60, priceAmount: "150.00" },
    { gameType: GameType.PS5, pricingGroup: "players-3", durationMinutes: 60, priceAmount: "200.00" },
    { gameType: GameType.PS5, pricingGroup: "players-4", durationMinutes: 60, priceAmount: "250.00" }
  ];

  await prisma.tablePricing.deleteMany({ where: { businessId: business.id } });
  for (const rule of pricing) {
    await prisma.tablePricing.upsert({
      where: {
        businessId_gameType_pricingGroup_durationMinutes: {
          businessId: business.id,
          gameType: rule.gameType,
          pricingGroup: rule.pricingGroup,
          durationMinutes: rule.durationMinutes
        }
      },
      update: { priceAmount: rule.priceAmount },
      create: { businessId: business.id, ...rule }
    });
  }

  await prisma.payment.deleteMany({ where: { businessId: business.id } });
  await prisma.invoice.deleteMany({ where: { businessId: business.id } });
  await prisma.billItem.deleteMany({ where: { businessId: business.id } });
  await prisma.bill.deleteMany({ where: { businessId: business.id } });
  await prisma.sessionItem.deleteMany({ where: { businessId: business.id } });
  await prisma.sessionExtension.deleteMany({ where: { session: { businessId: business.id } } });
  await prisma.sessionPause.deleteMany({ where: { session: { businessId: business.id } } });
  await prisma.session.deleteMany({ where: { businessId: business.id } });
  await prisma.booking.deleteMany({ where: { businessId: business.id } });
  await prisma.auditLog.deleteMany({ where: { businessId: business.id } });
  await prisma.product.deleteMany({ where: { businessId: business.id } });
  await prisma.clubTable.deleteMany({
    where: {
      businessId: business.id,
      number: { notIn: desiredTables.map((table) => table.number) }
    }
  });

  for (const table of desiredTables) {
    await prisma.clubTable.upsert({
      where: { businessId_number: { businessId: business.id, number: table.number } },
      update: { gameType: table.gameType, status: "AVAILABLE", pricingGroup: table.pricingGroup },
      create: { businessId: business.id, number: table.number, gameType: table.gameType, pricingGroup: table.pricingGroup }
    });
  }

  for (const product of menuProducts) {
    await prisma.product.create({
      data: {
        businessId: business.id,
        ...product
      }
    });
  }

  console.log(`Seeded ${business.name} with owner ${owner.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

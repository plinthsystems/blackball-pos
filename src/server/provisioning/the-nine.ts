import { GameType, Prisma, ProductCategory, type PrismaClient } from "@prisma/client";
import { hashPassword } from "@/server/auth/auth-service";

export const THE_NINE_STORE = {
  id: "the-nine-store",
  slug: "the-nine",
  name: "The Nine",
  phone: "+91 90000 00000",
  email: "hello@thenine.local",
  appName: "The Nine",
  logoInitials: "TN",
  brandColor: "#12613d",
  accentColor: "#b98922"
} as const;

export const THE_NINE_ACCOUNTS = [
  {
    id: "the-nine-admin",
    name: "The Nine Admin",
    email: process.env.THE_NINE_ADMIN_EMAIL ?? "admin@thenine.local",
    accountType: "STORE_OWNER" as const,
    roleName: "Admin",
    organizationId: null,
    franchiseeId: null
  },
  {
    id: "the-nine-store-user",
    name: "The Nine Store",
    email: process.env.THE_NINE_STORE_EMAIL ?? "store@thenine.local",
    accountType: "STORE_USER" as const,
    roleName: "Store",
    organizationId: null,
    franchiseeId: null
  }
] as const;

export const THE_NINE_DEFAULT_PASSWORD = process.env.THE_NINE_DEFAULT_PASSWORD ?? "Password@123";

const adminPermissionKeys = [
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
  "billing.read"
];

const storePermissionKeys = [
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

const tables = [
  { number: "Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "standard" },
  { number: "Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "standard" },
  { number: "Pool 1", gameType: GameType.POOL, pricingGroup: "standard" },
  { number: "Pool 2", gameType: GameType.POOL, pricingGroup: "standard" },
  { number: "PS5 1", gameType: GameType.PS5, pricingGroup: "players-2" }
];

const pricing = [
  { gameType: GameType.SNOOKER, pricingGroup: "standard", durationMinutes: 60, priceAmount: "350.00" },
  { gameType: GameType.POOL, pricingGroup: "standard", durationMinutes: 60, priceAmount: "200.00" },
  { gameType: GameType.PS5, pricingGroup: "players-2", durationMinutes: 60, priceAmount: "150.00" }
];

const products = [
  { name: "Water Bottle", category: ProductCategory.BEVERAGES, priceAmount: "20.00" },
  { name: "Cold Drink", category: ProductCategory.BEVERAGES, priceAmount: "60.00" },
  { name: "Coffee", category: ProductCategory.CAFE, priceAmount: "80.00" },
  { name: "French Fries", category: ProductCategory.FOOD, priceAmount: "120.00" },
  { name: "Cigarette", category: ProductCategory.CIGARETTES, priceAmount: "20.00" }
];

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function seedTheNine(
  db: DatabaseClient,
  options: {
    password?: string;
    storePassword?: string;
    adminEmail?: string;
    storeEmail?: string;
    adminName?: string;
    storeName?: string;
    includeSampleSales?: boolean;
  } = {}
) {
  const store = await db.business.upsert({
    where: { id: THE_NINE_STORE.id },
    update: {
      organizationId: null,
      franchiseeId: null,
      slug: THE_NINE_STORE.slug,
      name: THE_NINE_STORE.name,
      phone: THE_NINE_STORE.phone,
      email: THE_NINE_STORE.email
    },
    create: {
      id: THE_NINE_STORE.id,
      slug: THE_NINE_STORE.slug,
      name: THE_NINE_STORE.name,
      phone: THE_NINE_STORE.phone,
      email: THE_NINE_STORE.email
    }
  });

  await db.businessSettings.upsert({
    where: { businessId: store.id },
    update: {
      appName: THE_NINE_STORE.appName,
      logoInitials: THE_NINE_STORE.logoInitials,
      brandColor: THE_NINE_STORE.brandColor,
      accentColor: THE_NINE_STORE.accentColor,
      bookingEnabled: false
    },
    create: {
      businessId: store.id,
      appName: THE_NINE_STORE.appName,
      logoInitials: THE_NINE_STORE.logoInitials,
      brandColor: THE_NINE_STORE.brandColor,
      accentColor: THE_NINE_STORE.accentColor,
      bookingEnabled: false
    }
  });

  const permissionKeys = [...new Set([...adminPermissionKeys, ...storePermissionKeys])];
  for (const key of permissionKeys) {
    await db.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  const permissions = await db.permission.findMany({ where: { key: { in: permissionKeys } } });
  const roleByName = new Map<string, string>();
  for (const roleInput of [
    { name: "Admin", description: "The Nine administration and reporting", keys: adminPermissionKeys },
    { name: "Store", description: "The Nine floor and billing operations", keys: storePermissionKeys }
  ]) {
    const role = await db.role.upsert({
      where: { businessId_name: { businessId: store.id, name: roleInput.name } },
      update: { description: roleInput.description },
      create: { businessId: store.id, name: roleInput.name, description: roleInput.description }
    });
    roleByName.set(roleInput.name, role.id);
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    const selectedPermissions = permissions.filter((permission) => roleInput.keys.includes(permission.key));
    if (selectedPermissions.length > 0) {
      await db.rolePermission.createMany({
        data: selectedPermissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
        skipDuplicates: true
      });
    }
  }

  const passwordHash = hashPassword(options.password ?? THE_NINE_DEFAULT_PASSWORD);
  const accounts = THE_NINE_ACCOUNTS.map((account) => ({
    ...account,
    email: account.accountType === "STORE_OWNER" ? options.adminEmail ?? account.email : options.storeEmail ?? account.email,
    name: account.accountType === "STORE_OWNER" ? options.adminName ?? account.name : options.storeName ?? account.name
  }));
  for (const account of accounts) {
    const accountPassword = account.accountType === "STORE_USER" ? options.storePassword ?? options.password : options.password;
    const employee = await db.employee.upsert({
      where: { id: account.id },
      update: {
        businessId: store.id,
        organizationId: null,
        franchiseeId: null,
        name: account.name,
        email: account.email,
        passwordHash: accountPassword ? hashPassword(accountPassword) : passwordHash,
        accountType: account.accountType,
        active: true,
        mustChangePassword: false
      },
      create: {
        id: account.id,
        businessId: store.id,
        name: account.name,
        email: account.email,
        passwordHash: accountPassword ? hashPassword(accountPassword) : passwordHash,
        accountType: account.accountType,
        active: true,
        mustChangePassword: false
      }
    });
    const roleId = roleByName.get(account.roleName);
    if (!roleId) throw new Error(`Missing The Nine role: ${account.roleName}`);
    await db.employeeRole.deleteMany({ where: { employeeId: employee.id } });
    await db.employeeRole.create({ data: { employeeId: employee.id, roleId } });
  }

  await db.tablePricing.deleteMany({ where: { businessId: store.id } });
  await db.tablePricing.createMany({ data: pricing.map((rule) => ({ businessId: store.id, ...rule })) });

  await db.clubTable.deleteMany({ where: { businessId: store.id } });
  await db.clubTable.createMany({ data: tables.map((table) => ({ businessId: store.id, ...table })) });

  await db.product.deleteMany({ where: { businessId: store.id } });
  await db.product.createMany({ data: products.map((product) => ({ businessId: store.id, ...product })) });

  if (options.includeSampleSales ?? true) {
    await seedSampleSales(db, store.id);
  }

  return store;
}

async function seedSampleSales(db: DatabaseClient, businessId: string) {
  await db.billItem.deleteMany({ where: { businessId } });
  await db.bill.deleteMany({ where: { businessId } });
  const samples = [
    { total: 650, table: 350, items: 300 },
    { total: 480, table: 200, items: 280 },
    { total: 920, table: 700, items: 220 }
  ];
  for (const [index, sample] of samples.entries()) {
    const bill = await db.bill.create({
      data: {
        businessId,
        kind: index === 1 ? "COUNTER" : "SESSION",
        status: "CLOSED",
        openedAt: new Date(Date.now() - (index + 1) * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - (index + 1) * 45 * 60 * 1000),
        tableAmountSnapshot: sample.table,
        itemTotalAmountSnapshot: sample.items,
        totalAmountSnapshot: sample.total
      }
    });
    await db.billItem.create({
      data: {
        businessId,
        billId: bill.id,
        category: index === 1 ? ProductCategory.BEVERAGES : ProductCategory.FOOD,
        nameSnapshot: index === 1 ? "Cold Drink" : "Snack",
        unitPriceAmount: sample.items,
        quantity: 1,
        lineTotalAmount: sample.items
      }
    });
  }
}

export async function clearAllData(db: DatabaseClient) {
  await db.billItem.deleteMany();
  await db.sessionItem.deleteMany();
  await db.sessionPause.deleteMany();
  await db.sessionExtension.deleteMany();
  await db.payment.deleteMany();
  await db.invoice.deleteMany();
  await db.bill.deleteMany();
  await db.session.deleteMany();
  await db.booking.deleteMany();
  await db.customer.deleteMany();
  await db.clubTable.deleteMany();
  await db.product.deleteMany();
  await db.tablePricing.deleteMany();
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.businessSettings.deleteMany();
  await db.employeeRole.deleteMany();
  await db.rolePermission.deleteMany();
  await db.employee.deleteMany();
  await db.role.deleteMany();
  await db.permission.deleteMany();
  await db.royaltyInvoice.deleteMany();
  await db.royaltyRule.deleteMany();
  await db.subscription.deleteMany();
  await db.subscriptionPlan.deleteMany();
  await db.business.deleteMany();
  await db.franchisee.deleteMany();
  await db.organization.deleteMany();
}

export async function resetTheNine(
  db: PrismaClient,
  options: { confirmation?: string; password?: string } = {}
) {
  if (options.confirmation !== "true") {
    throw new Error("RESET_THE_NINE=true is required before resetting the database");
  }
  return db.$transaction(async (tx) => {
    await clearAllData(tx);
    return seedTheNine(tx, { password: options.password });
  });
}

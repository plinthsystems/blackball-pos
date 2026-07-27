import { GameType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissionKeys = [
  "tables.read",
  "tables.update_status",
  "sessions.start",
  "sessions.pause",
  "sessions.resume",
  "sessions.extend",
  "sessions.end",
  "settings.update"
];

async function main() {
  const business = await prisma.business.upsert({
    where: { id: "seed-business" },
    update: {},
    create: {
      id: "seed-business",
      name: "Cue Club",
      phone: "+91 90000 00000",
      email: "operations@cueclub.example",
      settings: {
        create: {
          taxRateBasisPoints: 1800,
          bookingBufferMinutes: 10
        }
      }
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

  const owner = await prisma.employee.upsert({
    where: { email: "owner@cueclub.example" },
    update: { businessId: business.id, name: "Aarav Manager", active: true },
    create: {
      businessId: business.id,
      name: "Aarav Manager",
      email: "owner@cueclub.example",
      roles: { create: { roleId: ownerRole.id } }
    }
  });

  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: owner.id, roleId: ownerRole.id } },
    update: {},
    create: { employeeId: owner.id, roleId: ownerRole.id }
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

  const pricing = [
    { gameType: GameType.POOL, durationMinutes: 30, priceAmount: "250.00" },
    { gameType: GameType.POOL, durationMinutes: 60, priceAmount: "450.00" },
    { gameType: GameType.SNOOKER, durationMinutes: 30, priceAmount: "350.00" },
    { gameType: GameType.SNOOKER, durationMinutes: 60, priceAmount: "650.00" }
  ];

  for (const rule of pricing) {
    await prisma.tablePricing.upsert({
      where: {
        businessId_gameType_pricingGroup_durationMinutes: {
          businessId: business.id,
          gameType: rule.gameType,
          pricingGroup: "standard",
          durationMinutes: rule.durationMinutes
        }
      },
      update: { priceAmount: rule.priceAmount },
      create: { businessId: business.id, pricingGroup: "standard", ...rule }
    });
  }

  for (let number = 1; number <= 8; number += 1) {
    await prisma.clubTable.upsert({
      where: { businessId_number: { businessId: business.id, number: `P${number}` } },
      update: {},
      create: { businessId: business.id, number: `P${number}`, gameType: GameType.POOL }
    });
  }

  for (let number = 1; number <= 4; number += 1) {
    await prisma.clubTable.upsert({
      where: { businessId_number: { businessId: business.id, number: `S${number}` } },
      update: {},
      create: { businessId: business.id, number: `S${number}`, gameType: GameType.SNOOKER }
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

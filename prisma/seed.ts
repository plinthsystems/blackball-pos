import { PrismaClient } from "@prisma/client";
import { buildDatabaseUrl } from "../src/server/db/connection";
import { seedTheNine } from "../src/server/provisioning/the-nine";

const isProduction = process.env.NODE_ENV === "production";
const isSeedAllowed = process.env.SEED_ALLOWED === "true";

if (isProduction && !isSeedAllowed) {
  throw new Error(
    "Refusing to seed in production. Set SEED_ALLOWED=true only when you intentionally want to initialize The Nine."
  );
}

const prisma = new PrismaClient({ datasourceUrl: buildDatabaseUrl() });

async function main() {
  await seedTheNine(prisma);
  console.log("Seeded The Nine with one Admin account, one Store account, tables, rates, menu, and sample sales.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

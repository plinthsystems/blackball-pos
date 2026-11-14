import { PrismaClient } from "@prisma/client";
import { buildDatabaseUrl } from "../src/server/db/connection";
import { resetTheNine } from "../src/server/provisioning/the-nine";

const confirmation = process.env.RESET_THE_NINE;
if (confirmation !== "true") {
  throw new Error("Refusing to reset. Set RESET_THE_NINE=true to clear the database and seed The Nine.");
}

if (process.env.NODE_ENV === "production" && process.env.RESET_THE_NINE_PRODUCTION !== "true") {
  throw new Error(
    "Refusing to reset a production database. Set RESET_THE_NINE_PRODUCTION=true as a second explicit confirmation."
  );
}

const prisma = new PrismaClient({ datasourceUrl: buildDatabaseUrl() });

resetTheNine(prisma, {
  confirmation,
  password: process.env.THE_NINE_DEFAULT_PASSWORD
})
  .then(() => {
    console.log("Reset complete. The Nine is ready for local testing.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

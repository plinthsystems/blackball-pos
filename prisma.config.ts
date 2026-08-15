import { defineConfig } from "prisma/config";
import { buildDatabaseUrl } from "./src/server/db/connection";

const databaseUrl = buildDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: databaseUrl
  }
});

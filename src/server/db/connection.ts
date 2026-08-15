import "dotenv/config";

const DATABASE_PARTS = [
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD"
] as const;

export type DatabaseParts = Record<(typeof DATABASE_PARTS)[number], string>;

export function getDatabaseParts(): DatabaseParts {
  const missing = DATABASE_PARTS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing database env: ${missing.join(", ")}. Set the DATABASE_* variables or a single DATABASE_URL override.`
    );
  }
  return {
    DATABASE_HOST: process.env.DATABASE_HOST!,
    DATABASE_PORT: process.env.DATABASE_PORT!,
    DATABASE_NAME: process.env.DATABASE_NAME!,
    DATABASE_USER: process.env.DATABASE_USER!,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD!
  };
}

export function buildDatabaseUrl(): string {
  const override = process.env.DATABASE_URL;
  if (override) {
    return override;
  }
  const { DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD } =
    getDatabaseParts();
  return [
    "postgresql://",
    encodeURIComponent(DATABASE_USER),
    ":",
    encodeURIComponent(DATABASE_PASSWORD),
    "@",
    DATABASE_HOST,
    ":",
    DATABASE_PORT,
    "/",
    DATABASE_NAME,
    "?schema=public"
  ].join("");
}

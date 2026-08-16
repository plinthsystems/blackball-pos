import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDatabaseUrl, getDatabaseParts } from "@/server/db/connection";

const DB_KEYS = [
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_URL"
] as const;

function clearDbEnv() {
  for (const key of DB_KEYS) {
    vi.stubEnv(key, "");
  }
}

describe("database connection helpers", () => {
  beforeEach(() => {
    clearDbEnv();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getDatabaseParts", () => {
    it("returns all parts when every variable is set", () => {
      vi.stubEnv("DATABASE_HOST", "db.example.com");
      vi.stubEnv("DATABASE_PORT", "5432");
      vi.stubEnv("DATABASE_NAME", "blackball");
      vi.stubEnv("DATABASE_USER", "owner");
      vi.stubEnv("DATABASE_PASSWORD", "s3cret");

      expect(getDatabaseParts()).toEqual({
        DATABASE_HOST: "db.example.com",
        DATABASE_PORT: "5432",
        DATABASE_NAME: "blackball",
        DATABASE_USER: "owner",
        DATABASE_PASSWORD: "s3cret"
      });
    });

    it("throws listing all missing keys", () => {
      expect(() => getDatabaseParts()).toThrowError(
        "Missing database env: DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD"
      );
    });

    it("throws listing only the missing subset", () => {
      vi.stubEnv("DATABASE_HOST", "db.example.com");
      vi.stubEnv("DATABASE_PORT", "5432");
      vi.stubEnv("DATABASE_NAME", "blackball");
      vi.stubEnv("DATABASE_USER", "owner");
      expect(() => getDatabaseParts()).toThrowError("Missing database env: DATABASE_PASSWORD");
    });

    it("treats an empty-string variable as missing", () => {
      vi.stubEnv("DATABASE_HOST", "db.example.com");
      vi.stubEnv("DATABASE_PORT", "");
      vi.stubEnv("DATABASE_NAME", "blackball");
      vi.stubEnv("DATABASE_USER", "owner");
      vi.stubEnv("DATABASE_PASSWORD", "s3cret");
      expect(() => getDatabaseParts()).toThrowError("Missing database env: DATABASE_PORT");
    });
  });

  describe("buildDatabaseUrl", () => {
    it("returns the DATABASE_URL override as-is (no re-encoding / no secret leak)", () => {
      vi.stubEnv(
        "DATABASE_URL",
        "postgresql://user:real-password@host:5432/db?sslmode=require"
      );
      expect(buildDatabaseUrl()).toBe(
        "postgresql://user:real-password@host:5432/db?sslmode=require"
      );
    });

    it("builds a URL from parts with schema=public", () => {
      vi.stubEnv("DATABASE_HOST", "db.example.com");
      vi.stubEnv("DATABASE_PORT", "5432");
      vi.stubEnv("DATABASE_NAME", "blackball");
      vi.stubEnv("DATABASE_USER", "owner");
      vi.stubEnv("DATABASE_PASSWORD", "s3cret");

      expect(buildDatabaseUrl()).toBe(
        "postgresql://owner:s3cret@db.example.com:5432/blackball?schema=public"
      );
    });

    it("URL-encodes special characters in user and password", () => {
      vi.stubEnv("DATABASE_HOST", "db.example.com");
      vi.stubEnv("DATABASE_PORT", "5432");
      vi.stubEnv("DATABASE_NAME", "blackball");
      vi.stubEnv("DATABASE_USER", "app user");
      vi.stubEnv("DATABASE_PASSWORD", "p@ss:w/rd");

      expect(buildDatabaseUrl()).toBe(
        "postgresql://app%20user:p%40ss%3Aw%2Frd@db.example.com:5432/blackball?schema=public"
      );
    });

    it("throws through getDatabaseParts when parts are missing and no override", () => {
      vi.stubEnv("DATABASE_HOST", "db.example.com");
      vi.stubEnv("DATABASE_PORT", "5432");
      vi.stubEnv("DATABASE_NAME", "blackball");
      vi.stubEnv("DATABASE_USER", "owner");
      expect(() => buildDatabaseUrl()).toThrowError("Missing database env: DATABASE_PASSWORD");
    });
  });
});

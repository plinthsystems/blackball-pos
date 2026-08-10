import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Prisma schema", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  it("models the Phase 1 live table domain", () => {
    expect(schema).toContain("model ClubTable");
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Booking");
    expect(schema).toContain("model Invoice");
    expect(schema).toContain("model Product");
    expect(schema).toContain("model SessionItem");
    expect(schema).toContain("model Bill");
    expect(schema).toContain("model BillItem");
    expect(schema).toContain("enum BillKind");
    expect(schema).toContain("enum BillStatus");
    expect(schema).toContain("enum TableStatus");
    expect(schema).toContain("enum SessionStatus");
    expect(schema).toContain("enum ProductCategory");
  });

  it("stores product price snapshots on bill items", () => {
    expect(schema).toMatch(/model BillItem[\s\S]*nameSnapshot\s+String/);
    expect(schema).toMatch(/model BillItem[\s\S]*unitPriceAmount\s+Decimal\s+@db\.Decimal\(12, 2\)/);
    expect(schema).toMatch(/model BillItem[\s\S]*lineTotalAmount\s+Decimal\s+@db\.Decimal\(12, 2\)/);
  });

  it("models PS5 as a rentable station type", () => {
    expect(schema).toMatch(/enum GameType\s+\{[\s\S]*POOL[\s\S]*SNOOKER[\s\S]*PS5[\s\S]*\}/);
  });

  it("models multi-tenancy organization and account types", () => {
    expect(schema).toContain("model Organization");
    expect(schema).toContain("enum OrganizationType");
    expect(schema).toMatch(/enum AccountType\s+\{[\s\S]*HQ_ADMIN[\s\S]*STORE_OWNER[\s\S]*MANAGER[\s\S]*STORE_USER[\s\S]*\}/);
    expect(schema).toMatch(/model Business[\s\S]*organizationId\s+String\?/);
    expect(schema).toMatch(/model BusinessSettings[\s\S]*appName\s+String\s+@default\("Black Ball"\)/);
  });

  it("models franchisees, subscriptions, and royalty billing for the platform business model", () => {
    expect(schema).toContain("model Franchisee");
    expect(schema).toMatch(/model Business[\s\S]*franchiseeId\s+String\?/);
    expect(schema).toMatch(/model Employee[\s\S]*franchiseeId\s+String\?/);
    expect(schema).toContain("model SubscriptionPlan");
    expect(schema).toContain("model Subscription");
    expect(schema).toContain("enum SubscriptionStatus");
    expect(schema).toContain("model RoyaltyRule");
    expect(schema).toContain("model RoyaltyInvoice");
    expect(schema).toMatch(/model RoyaltyInvoice[\s\S]*grossSalesAmount\s+Decimal\s+@db\.Decimal\(12, 2\)/);
    expect(schema).toMatch(/model RoyaltyInvoice[\s\S]*royaltyAmount\s+Decimal\s+@db\.Decimal\(12, 2\)/);
  });

  it("stores session billing snapshots for member-based PS5 pricing", () => {
    expect(schema).toMatch(/model Session[\s\S]*ps5MemberCount\s+Int\?/);
    expect(schema).toMatch(/model Session[\s\S]*hourlyRateSnapshot\s+Decimal\s+@default\(0\)\s+@db\.Decimal\(12, 2\)/);
  });

  it("keeps mutable operational records versioned", () => {
    expect(schema).toMatch(/model ClubTable[\s\S]*version\s+Int\s+@default\(1\)/);
    expect(schema).toMatch(/model Session[\s\S]*version\s+Int\s+@default\(1\)/);
  });
});

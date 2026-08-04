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

  it("keeps mutable operational records versioned", () => {
    expect(schema).toMatch(/model ClubTable[\s\S]*version\s+Int\s+@default\(1\)/);
    expect(schema).toMatch(/model Session[\s\S]*version\s+Int\s+@default\(1\)/);
  });
});

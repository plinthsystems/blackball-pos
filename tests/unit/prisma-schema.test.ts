import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Prisma schema", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  it("models the Phase 1 live table domain", () => {
    expect(schema).toContain("model ClubTable");
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Booking");
    expect(schema).toContain("model Invoice");
    expect(schema).toContain("enum TableStatus");
    expect(schema).toContain("enum SessionStatus");
  });

  it("keeps mutable operational records versioned", () => {
    expect(schema).toMatch(/model ClubTable[\s\S]*version\s+Int\s+@default\(1\)/);
    expect(schema).toMatch(/model Session[\s\S]*version\s+Int\s+@default\(1\)/);
  });
});

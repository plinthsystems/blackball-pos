import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";

describe("session lifecycle integration", () => {
  it("seeded database has live tables and pricing", async () => {
    const tables = await prisma.clubTable.findMany({ where: { businessId: "seed-business" } });
    const pricing = await prisma.tablePricing.findMany({ where: { businessId: "seed-business" } });

    expect(tables.length).toBeGreaterThanOrEqual(12);
    expect(pricing.length).toBe(4);
  });
});

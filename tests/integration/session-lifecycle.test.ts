import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

describe("session lifecycle integration", () => {
  it("seeded database has the real five table setup and pricing", async () => {
    const tables = await prisma.clubTable.findMany({ where: { businessId: "seed-business" } });
    const pricing = await prisma.tablePricing.findMany({ where: { businessId: "seed-business" } });
    const products = await prisma.product.findMany({ where: { businessId: "seed-business", active: true } });

    expect(tables.map((table) => table.number).sort()).toEqual([
      "Mini Snooker 1",
      "Mini Snooker 2",
      "PS5 1",
      "PS5 2",
      "Pool Table 1",
      "Royal Snooker 1",
      "Royal Snooker 2"
    ]);
    expect(pricing.map((rule) => `${rule.gameType}:${rule.pricingGroup}:${Number(rule.priceAmount)}`).sort()).toEqual([
      "POOL:standard:160",
      "PS5:standard:200",
      "SNOOKER:mini:330",
      "SNOOKER:royal:350"
    ]);
    expect(new Set(products.map((product) => product.category))).toEqual(new Set(["FOOD", "CIGARETTES", "BEVERAGES"]));
    expect(products.map((product) => product.name)).toContain("Water Bottle");
  });

  it("uses an employee id that exists in the seeded database", async () => {
    const context = await getCurrentEmployeeContext();
    const employee = await prisma.employee.findUnique({ where: { id: context.employeeId } });

    expect(employee?.email).toBe("owner@cueclub.example");
    expect(context.permissions).toContain("sessions.add_items");
  });
});

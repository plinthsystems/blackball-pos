import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

describe("session lifecycle integration", () => {
  it("seeded database has the real five table setup and pricing", async () => {
    const tables = await prisma.clubTable.findMany({
      where: {
        businessId: "the-nine-store",
        number: { in: ["Royal Snooker 1", "Royal Snooker 2", "Mini Snooker 1", "Mini Snooker 2", "Pool"] }
      }
    });
    const pricing = await prisma.tablePricing.findMany({ where: { businessId: "the-nine-store" } });
    const products = await prisma.product.findMany({ where: { businessId: "the-nine-store", active: true } });

    expect(tables.map((table) => table.number).sort()).toEqual([
      "Mini Snooker 1",
      "Mini Snooker 2",
      "Pool",
      "Royal Snooker 1",
      "Royal Snooker 2"
    ]);
    expect(pricing.map((rule) => `${rule.gameType}:${rule.pricingGroup}:${Number(rule.priceAmount)}`).sort()).toEqual([
      "POOL:standard:180",
      "SNOOKER:mini:250",
      "SNOOKER:royal:400"
    ]);
    expect(new Set(products.map((product) => product.category))).toEqual(new Set(["FOOD", "CAFE", "CIGARETTES", "BEVERAGES"]));
    expect(products.map((product) => product.name)).toContain("Water Bottle");
  });

  it("uses an employee id that exists in the seeded database", async () => {
    const context = await getCurrentEmployeeContext();
    const employee = await prisma.employee.findUnique({ where: { id: context.employeeId } });

    expect(employee?.email).toBe("admin@thenine.local");
    expect(context.permissions).toContain("sessions.add_items");
  });
});

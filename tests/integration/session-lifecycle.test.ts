import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

describe("session lifecycle integration", () => {
  it("seeded database has the real five table setup and pricing", async () => {
    const tables = await prisma.clubTable.findMany({ where: { businessId: "seed-business" } });
    const pricing = await prisma.tablePricing.findMany({ where: { businessId: "seed-business" } });

    expect(tables.map((table) => table.number).sort()).toEqual([
      "King Snooker 1",
      "King Snooker 2",
      "Medium Snooker 1",
      "Medium Snooker 2",
      "Pool Table 1"
    ]);
    expect(pricing.length).toBe(4);
  });

  it("uses an employee id that exists in the seeded database", async () => {
    const context = await getCurrentEmployeeContext();
    const employee = await prisma.employee.findUnique({ where: { id: context.employeeId } });

    expect(employee?.email).toBe("owner@cueclub.example");
  });
});

import { prisma } from "@/server/db/prisma";

export type CurrentEmployeeContext = {
  businessId: string;
  employeeId: string;
  permissions: string[];
};

export async function getCurrentEmployeeContext(): Promise<CurrentEmployeeContext> {
  const employee = await prisma.employee.findUnique({
    where: { email: "owner@cueclub.example" },
    select: { id: true, businessId: true }
  });

  return {
    businessId: employee?.businessId ?? "seed-business",
    employeeId: employee?.id ?? "seed-employee",
    permissions: [
      "tables.read",
      "tables.update_status",
      "sessions.start",
      "sessions.pause",
      "sessions.resume",
      "sessions.extend",
      "sessions.end",
      "sessions.add_items",
      "bills.manage",
      "products.manage",
      "settings.update"
    ]
  };
}

import { describe, expect, it } from "vitest";
import { buildCurrentEmployeeContext } from "@/server/auth/current-employee";

describe("buildCurrentEmployeeContext", () => {
  it("returns tenant branding, account type, and role permissions for the current employee", () => {
    const context = buildCurrentEmployeeContext({
      id: "emp_1",
      businessId: "business_1",
      name: "Ravi Manager",
      email: "ravi@example.com",
      accountType: "MANAGER",
      business: {
        id: "business_1",
        name: "Cue City Sports",
        slug: "cue-city",
        settings: {
          appName: "Cue City POS",
          logoInitials: "CC",
          brandColor: "#14532d",
          accentColor: "#b98922"
        }
      },
      roles: [
        {
          role: {
            permissions: [
              { permission: { key: "tables.read" } },
              { permission: { key: "rates.manage" } }
            ]
          }
        }
      ]
    });

    expect(context).toEqual({
      businessId: "business_1",
      employeeId: "emp_1",
      employeeName: "Ravi Manager",
      accountType: "MANAGER",
      permissions: ["tables.read", "rates.manage"],
      tenantBranding: {
        appName: "Cue City POS",
        logoInitials: "CC",
        businessName: "Cue City Sports",
        brandColor: "#14532d",
        accentColor: "#b98922"
      }
    });
  });
});

import { describe, expect, it } from "vitest";
import { buildCurrentEmployeeContext } from "@/server/auth/current-employee";

describe("buildCurrentEmployeeContext", () => {
  it("returns tenant branding, account type, and role permissions for the current employee", () => {
    const context = buildCurrentEmployeeContext({
      id: "emp_1",
      businessId: "business_1",
      organizationId: null,
      franchiseeId: null,
      name: "Ravi Manager",
      email: "ravi@example.com",
      accountType: "MANAGER",
      organization: null,
      franchisee: null,
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
      employeeEmail: "ravi@example.com",
      accountType: "MANAGER",
      permissions: ["tables.read", "rates.manage", "dashboard.read", "products.manage", "settings.update"],
      tenantBranding: {
        appName: "Cue City POS",
        logoInitials: "CC",
        businessName: "Cue City Sports",
        brandColor: "#14532d",
        accentColor: "#b98922"
      },
      organization: undefined,
      scope: {
        organizationId: null,
        franchiseeId: null,
        businessIds: ["business_1"],
        selectedBusinessId: "business_1"
      }
    });
  });

  it("limits a franchisee owner to the businesses assigned to their franchisee", () => {
    const context = buildCurrentEmployeeContext({
      id: "emp_franchisee",
      businessId: null,
      organizationId: "org_blackball",
      franchiseeId: "franchisee_bangalore",
      name: "Bangalore Franchise Owner",
      email: "franchisee@example.com",
      accountType: "STORE_OWNER",
      organization: {
        id: "org_blackball",
        name: "BlackBall Franchise",
        type: "FRANCHISE",
        businesses: [
          { id: "outlet_1", name: "Koramangala", slug: "koramangala", franchiseeId: "franchisee_bangalore", settings: null },
          { id: "outlet_2", name: "MG Road", slug: "mg-road", franchiseeId: "franchisee_bangalore", settings: null },
          { id: "outlet_3", name: "Indiranagar", slug: "indiranagar", franchiseeId: "other_franchisee", settings: null }
        ]
      },
      franchisee: {
        id: "franchisee_bangalore",
        name: "Bangalore Franchisee",
        businesses: [
          { id: "outlet_1", name: "Koramangala", slug: "koramangala", settings: null },
          { id: "outlet_2", name: "MG Road", slug: "mg-road", settings: null }
        ]
      },
      business: null,
      roles: []
    });

    expect(context.businessId).toBe("outlet_1");
    expect(context.organization?.businesses.map((business) => business.id)).toEqual(["outlet_1", "outlet_2"]);
    expect(context.scope).toEqual({
      organizationId: "org_blackball",
      franchiseeId: "franchisee_bangalore",
      businessIds: ["outlet_1", "outlet_2"],
      selectedBusinessId: "outlet_1"
    });
  });

  it("lets an HQ admin see every business in the organization", () => {
    const context = buildCurrentEmployeeContext({
      id: "emp_hq",
      businessId: null,
      organizationId: "org_blackball",
      franchiseeId: null,
      name: "HQ Director",
      email: "hq@example.com",
      accountType: "HQ_ADMIN",
      organization: {
        id: "org_blackball",
        name: "BlackBall Franchise",
        type: "FRANCHISE",
        businesses: [
          { id: "outlet_1", name: "Koramangala", slug: "koramangala", franchiseeId: "franchisee_bangalore", settings: null },
          { id: "outlet_2", name: "MG Road", slug: "mg-road", franchiseeId: "franchisee_bangalore", settings: null },
          { id: "outlet_3", name: "Indiranagar", slug: "indiranagar", franchiseeId: "other_franchisee", settings: null }
        ]
      },
      franchisee: null,
      business: null,
      roles: []
    }, "indiranagar");

    expect(context.businessId).toBe("outlet_3");
    expect(context.organization?.businesses.map((business) => business.id)).toEqual(["outlet_1", "outlet_2", "outlet_3"]);
    expect(context.scope.businessIds).toEqual(["outlet_1", "outlet_2", "outlet_3"]);
    expect(context.permissions).toContain("hq.dashboard.read");
  });
});

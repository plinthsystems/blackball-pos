import type { CurrentEmployeeContext } from "@/server/auth/current-employee";

/**
 * Builds a fully-populated CurrentEmployeeContext for action tests.
 * `getCurrentEmployeeContext` itself is mocked per test file
 * (see the vi.mock("@/server/auth/current-employee") pattern), this helper
 * only shapes the resolved value. Pure helper — no mocks, no DB.
 */
export const DEFAULT_PERMISSIONS = [
  "dashboard.read",
  "tables.read",
  "tables.manage",
  "tables.update_status",
  "sessions.start",
  "sessions.extend",
  "sessions.end",
  "sessions.add_items",
  "bills.manage",
  "bookings.manage",
  "products.manage",
  "rates.manage",
  "settings.update"
];

export function makeEmployeeContext(
  overrides: Partial<CurrentEmployeeContext> = {}
): CurrentEmployeeContext {
  const base: CurrentEmployeeContext = {
    businessId: "biz-1",
    employeeId: "emp-1",
    employeeName: "Test Manager",
    employeeEmail: "manager@cueclub.example",
    accountType: "MANAGER",
    permissions: [...DEFAULT_PERMISSIONS],
    tenantBranding: {
      appName: "Test Club",
      logoInitials: "TC",
      businessName: "Test Club",
      brandColor: "#16a34a",
      accentColor: "#22d3ee"
    },
    scope: {
      organizationId: "org-1",
      franchiseeId: null,
      businessIds: ["biz-1"],
      selectedBusinessId: "biz-1"
    },
    mustChangePassword: false
  };

  return {
    ...base,
    ...overrides,
    tenantBranding: { ...base.tenantBranding, ...overrides.tenantBranding },
    scope: { ...base.scope, ...overrides.scope }
  };
}

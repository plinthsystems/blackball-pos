import { describe, expect, it, vi } from "vitest";
import { AuthorizationError, requireAuth, requireHqAdmin, requirePermission } from "@/server/auth/authorization";
import * as currentEmployeeModule from "@/server/auth/current-employee";

const defaultScope = {
  organizationId: null,
  franchiseeId: null,
  businessIds: ["biz_1"],
  selectedBusinessId: "biz_1"
};

describe("authorization helpers", () => {
  it("allows HQ_ADMIN through requireHqAdmin", async () => {
    vi.spyOn(currentEmployeeModule, "getCurrentEmployeeContext").mockResolvedValueOnce({
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Vikram Malhotra",
      employeeEmail: "hq.blackball@example.com",
      accountType: "HQ_ADMIN",
      permissions: ["dashboard.read"],
      tenantBranding: {} as any,
      scope: defaultScope
    });

    const context = await requireHqAdmin();
    expect(context.accountType).toBe("HQ_ADMIN");
  });

  it("blocks non-HQ_ADMIN from requireHqAdmin", async () => {
    vi.spyOn(currentEmployeeModule, "getCurrentEmployeeContext").mockResolvedValueOnce({
      businessId: "biz_2",
      employeeId: "emp_2",
      employeeName: "Rahul Sharma",
      employeeEmail: "owner@cueclub.example",
      accountType: "STORE_OWNER",
      permissions: ["tables.read"],
      tenantBranding: {} as any,
      scope: { ...defaultScope, businessIds: ["biz_2"], selectedBusinessId: "biz_2" }
    });

    await expect(requireHqAdmin()).rejects.toThrow("Access denied: Requires HQ Admin permissions.");
  });

  it("enforces granular permission check for store users", async () => {
    vi.spyOn(currentEmployeeModule, "getCurrentEmployeeContext").mockResolvedValueOnce({
      businessId: "biz_3",
      employeeId: "emp_3",
      employeeName: "Staff Member",
      employeeEmail: "staff@cueclub.example",
      accountType: "STORE_USER",
      permissions: ["tables.read"],
      tenantBranding: {} as any,
      scope: { ...defaultScope, businessIds: ["biz_3"], selectedBusinessId: "biz_3" }
    });

    // Should pass for allowed permission
    const allowed = await requirePermission("tables.read");
    expect(allowed.employeeEmail).toBe("staff@cueclub.example");

    vi.spyOn(currentEmployeeModule, "getCurrentEmployeeContext").mockResolvedValueOnce({
      businessId: "biz_3",
      employeeId: "emp_3",
      employeeName: "Staff Member",
      employeeEmail: "staff@cueclub.example",
      accountType: "STORE_USER",
      permissions: ["tables.read"],
      tenantBranding: {} as any,
      scope: { ...defaultScope, businessIds: ["biz_3"], selectedBusinessId: "biz_3" }
    });

    // Should throw 403 for missing permission
    await expect(requirePermission("rates.manage")).rejects.toThrow("Access denied: Required permission 'rates.manage' missing.");
  });
});

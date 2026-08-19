import { describe, expect, it } from "vitest";
import { requirePermission } from "@/server/auth/permissions";
import { DomainError } from "@/server/domain/errors";
import type { CurrentEmployeeContext } from "@/server/auth/current-employee";

function makeContext(overrides: Partial<CurrentEmployeeContext> = {}): CurrentEmployeeContext {
  return {
    businessId: "biz-1",
    employeeId: "emp-1",
    employeeName: "Owner",
    employeeEmail: "owner@example.com",
    accountType: "STORE_OWNER",
    permissions: ["tables.manage", "tables.read"],
    tenantBranding: {
      appName: "Black Ball",
      logoInitials: "BB",
      businessName: "Pool & Snooker Cafe",
      brandColor: "#12613d",
      accentColor: "#b98922"
    },
    scope: {
      organizationId: null,
      franchiseeId: null,
      businessIds: ["biz-1"],
      selectedBusinessId: "biz-1"
    },
    mustChangePassword: false,
    ...overrides
  };
}

describe("requirePermission", () => {
  it("passes when the permission is present", () => {
    expect(() => requirePermission(makeContext(), "tables.manage")).not.toThrow();
  });

  it("throws DomainError UNAUTHORIZED when the permission is missing", () => {
    try {
      requirePermission(makeContext(), "settings.update");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({
        code: "UNAUTHORIZED",
        message: "You do not have permission to perform this action.",
        metadata: { permission: "settings.update" }
      });
    }
  });

  it("throws PASSWORD_CHANGE_REQUIRED when mustChangePassword and no allowance, even with permission", () => {
    try {
      requirePermission(makeContext({ mustChangePassword: true }), "tables.manage");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({
        code: "PASSWORD_CHANGE_REQUIRED",
        metadata: { permission: "tables.manage" }
      });
    }
  });

  it("passes with mustChangePassword when allowPasswordChange is set", () => {
    expect(() =>
      requirePermission(makeContext({ mustChangePassword: true }), "tables.manage", {
        allowPasswordChange: true
      })
    ).not.toThrow();
  });

  it("still enforces the permission when allowPasswordChange bypasses the password guard", () => {
    try {
      requirePermission(makeContext({ mustChangePassword: true }), "settings.update", {
        allowPasswordChange: true
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        code: "UNAUTHORIZED",
        metadata: { permission: "settings.update" }
      });
    }
  });

  it("uses default options (no allowPasswordChange) when omitted", () => {
    expect(() => requirePermission(makeContext({ mustChangePassword: true }), "tables.manage")).toThrow(
      DomainError
    );
  });
});

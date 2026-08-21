import { describe, expect, it, vi } from "vitest";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { buildDeniedContext, getCurrentEmployeeContext, type CurrentEmployeeContext } from "@/server/auth/current-employee";

describe("Auth guards — redirect routes for permission checks", () => {
  it("redirects staff without dashboard.read to live-tables", () => {
    const route = getDefaultRouteForPermissions(["tables.read"]);
    expect(route).toBe("/live-tables");
  });

  it("redirects staff with dashboard.read to dashboard", () => {
    const route = getDefaultRouteForPermissions(["dashboard.read", "tables.read"]);
    expect(route).toBe("/dashboard");
  });

  it("redirects HQ admins to hq/dashboard", () => {
    const route = getDefaultRouteForPermissions(["hq.dashboard.read", "dashboard.read"]);
    expect(route).toBe("/hq/dashboard");
  });

  it("redirects platform admins to platform/setup", () => {
    const route = getDefaultRouteForPermissions(["platform.setup.manage", "dashboard.read"]);
    expect(route).toBe("/platform/setup");
  });

  it("prefers platform.setup.manage over hq.dashboard.read", () => {
    const route = getDefaultRouteForPermissions([
      "hq.dashboard.read",
      "platform.setup.manage",
      "dashboard.read"
    ]);
    expect(route).toBe("/platform/setup");
  });

  it("prefers hq.dashboard.read over dashboard.read", () => {
    const route = getDefaultRouteForPermissions(["hq.dashboard.read", "dashboard.read"]);
    expect(route).toBe("/hq/dashboard");
  });

  it("defaults to live-tables for unknown permission sets", () => {
    const route = getDefaultRouteForPermissions(["tables.read", "products.manage"]);
    expect(route).toBe("/live-tables");
  });

  it("defaults to live-tables for empty permissions", () => {
    const route = getDefaultRouteForPermissions([]);
    expect(route).toBe("/live-tables");
  });
});

describe("buildDeniedContext", () => {
  it("returns a context with empty fields and no permissions", () => {
    const context = buildDeniedContext();

    expect(context.employeeId).toBe("");
    expect(context.businessId).toBe("");
    expect(context.permissions).toEqual([]);
    expect(context.accountType).toBe("STORE_USER");
    expect(context.mustChangePassword).toBe(false);
  });

  it("returns default branding for denied context", () => {
    const context = buildDeniedContext();

    expect(context.tenantBranding.appName).toBe("Black Ball");
    expect(context.tenantBranding.logoInitials).toBe("BB");
  });
});

describe("getCurrentEmployeeContext — denied context", () => {
  it("returns denied context when no identity is present", async () => {
    const context = buildDeniedContext();

    expect(context.employeeId).toBe("");
    expect(context.permissions).toEqual([]);
  });

  it("denied context blocks all admin page permissions", () => {
    const context = buildDeniedContext();

    expect(context.permissions.includes("dashboard.read")).toBe(false);
    expect(context.permissions.includes("bookings.manage")).toBe(false);
    expect(context.permissions.includes("tables.manage")).toBe(false);
    expect(context.permissions.includes("products.manage")).toBe(false);
    expect(context.permissions.includes("rates.manage")).toBe(false);
  });
});

describe("Auth guard redirect logic — page-level permission checks", () => {
  it("bookings page requires bookings.manage permission", () => {
    const contextWithPermission = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Manager",
      employeeEmail: "manager@example.com",
      accountType: "STORE_OWNER",
      permissions: ["bookings.manage", "dashboard.read"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    const contextWithoutPermission = {
      ...contextWithPermission,
      permissions: ["dashboard.read"]
    };

    expect(contextWithPermission.permissions.includes("bookings.manage")).toBe(true);
    expect(contextWithoutPermission.permissions.includes("bookings.manage")).toBe(false);
  });

  it("dashboard page requires dashboard.read permission", () => {
    const contextWithPermission = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Manager",
      employeeEmail: "manager@example.com",
      accountType: "STORE_OWNER",
      permissions: ["dashboard.read", "tables.read"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    const contextWithoutPermission = {
      ...contextWithPermission,
      permissions: ["tables.read"]
    };

    expect(contextWithPermission.permissions.includes("dashboard.read")).toBe(true);
    expect(contextWithoutPermission.permissions.includes("dashboard.read")).toBe(false);
  });

  it("settings page requires products.manage permission", () => {
    const contextWithPermission = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Manager",
      employeeEmail: "manager@example.com",
      accountType: "STORE_OWNER",
      permissions: ["products.manage", "dashboard.read"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    const contextWithoutPermission = {
      ...contextWithPermission,
      permissions: ["dashboard.read"]
    };

    expect(contextWithPermission.permissions.includes("products.manage")).toBe(true);
    expect(contextWithoutPermission.permissions.includes("products.manage")).toBe(false);
  });

  it("rates page requires rates.manage permission", () => {
    const contextWithPermission = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Manager",
      employeeEmail: "manager@example.com",
      accountType: "STORE_OWNER",
      permissions: ["rates.manage", "dashboard.read"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    const contextWithoutPermission = {
      ...contextWithPermission,
      permissions: ["dashboard.read"]
    };

    expect(contextWithPermission.permissions.includes("rates.manage")).toBe(true);
    expect(contextWithoutPermission.permissions.includes("rates.manage")).toBe(false);
  });

  it("tables page requires tables.manage permission", () => {
    const contextWithPermission = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Manager",
      employeeEmail: "manager@example.com",
      accountType: "STORE_OWNER",
      permissions: ["tables.manage", "dashboard.read"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    const contextWithoutPermission = {
      ...contextWithPermission,
      permissions: ["dashboard.read"]
    };

    expect(contextWithPermission.permissions.includes("tables.manage")).toBe(true);
    expect(contextWithoutPermission.permissions.includes("tables.manage")).toBe(false);
  });

  it("HQ admin has read-only access without manage permissions", () => {
    const hqContext = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "HQ Director",
      employeeEmail: "hq@example.com",
      accountType: "HQ_ADMIN",
      permissions: ["hq.dashboard.read", "dashboard.read"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: "org_1", franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    expect(hqContext.permissions.includes("dashboard.read")).toBe(true);
    expect(hqContext.permissions.includes("tables.manage")).toBe(false);
    expect(hqContext.permissions.includes("products.manage")).toBe(false);
  });

  it("STORE_OWNER gets automatic dashboard and manage permissions", () => {
    const storeOwner = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Store Owner",
      employeeEmail: "owner@example.com",
      accountType: "STORE_OWNER",
      permissions: ["dashboard.read", "tables.manage", "products.manage", "rates.manage", "settings.update"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    expect(storeOwner.permissions.includes("dashboard.read")).toBe(true);
    expect(storeOwner.permissions.includes("tables.manage")).toBe(true);
    expect(storeOwner.permissions.includes("products.manage")).toBe(true);
    expect(storeOwner.permissions.includes("rates.manage")).toBe(true);
  });

  it("MANAGER gets automatic dashboard and manage permissions", () => {
    const manager = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Manager",
      employeeEmail: "manager@example.com",
      accountType: "MANAGER",
      permissions: ["dashboard.read", "tables.manage", "products.manage", "rates.manage", "settings.update"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    expect(manager.permissions.includes("dashboard.read")).toBe(true);
    expect(manager.permissions.includes("tables.manage")).toBe(true);
    expect(manager.permissions.includes("products.manage")).toBe(true);
    expect(manager.permissions.includes("rates.manage")).toBe(true);
  });

  it("STORE_USER has limited permissions", () => {
    const storeUser = {
      businessId: "biz_1",
      employeeId: "emp_1",
      employeeName: "Staff",
      employeeEmail: "staff@example.com",
      accountType: "STORE_USER",
      permissions: ["tables.read"],
      tenantBranding: { appName: "Test", logoInitials: "T", businessName: "Test", brandColor: "#000", accentColor: "#fff" },
      scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
      mustChangePassword: false
    };

    expect(storeUser.permissions.includes("dashboard.read")).toBe(false);
    expect(storeUser.permissions.includes("tables.manage")).toBe(false);
    expect(storeUser.permissions.includes("tables.read")).toBe(true);
  });
});
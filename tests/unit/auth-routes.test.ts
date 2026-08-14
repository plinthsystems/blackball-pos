import { describe, expect, it } from "vitest";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";

describe("getDefaultRouteForPermissions", () => {
  it("sends platform admins to setup, managers to dashboard, and store users to live floor", () => {
    expect(getDefaultRouteForPermissions(["platform.setup.manage", "dashboard.read"])).toBe("/platform/setup");
    expect(getDefaultRouteForPermissions(["dashboard.read", "tables.read"])).toBe("/dashboard");
    expect(getDefaultRouteForPermissions(["tables.read"])).toBe("/live-tables");
  });
});

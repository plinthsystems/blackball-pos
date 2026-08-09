import { describe, expect, it } from "vitest";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";

describe("getDefaultRouteForPermissions", () => {
  it("sends managers to dashboard and store users to live floor", () => {
    expect(getDefaultRouteForPermissions(["dashboard.read", "tables.read"])).toBe("/dashboard");
    expect(getDefaultRouteForPermissions(["tables.read"])).toBe("/live-tables");
  });
});

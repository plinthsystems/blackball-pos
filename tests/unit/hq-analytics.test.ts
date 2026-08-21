import { describe, expect, it, vi } from "vitest";

// Mock prisma before importing the service
const mockOrg = {
  id: "org-blackball-franchise",
  name: "BlackBall Franchise Group",
  businesses: [
    { id: "biz_1", name: "Outlet A", slug: "outlet-a", tables: [{ id: "t1", status: "OCCUPIED" }, { id: "t2", status: "AVAILABLE" }] },
    { id: "biz_2", name: "Outlet B", slug: "outlet-b", tables: [{ id: "t3", status: "OCCUPIED" }, { id: "t4", status: "AVAILABLE" }] },
    { id: "biz_3", name: "Outlet C", slug: "outlet-c", tables: [{ id: "t5", status: "AVAILABLE" }] }
  ]
};

const mockBills = [
  { businessId: "biz_1", totalAmountSnapshot: 15000, openedAt: new Date("2026-07-23T12:00:00"), sessionId: "s1" },
  { businessId: "biz_2", totalAmountSnapshot: 12000, openedAt: new Date("2026-07-23T18:00:00"), sessionId: "s2" }
];

const mockSessions = [
  { businessId: "biz_1", startedAt: new Date("2026-07-23T12:00:00"), status: "ACTIVE" },
  { businessId: "biz_2", startedAt: new Date("2026-07-23T18:00:00"), status: "ACTIVE" },
  { businessId: "biz_3", startedAt: new Date("2026-07-23T14:00:00"), status: "COMPLETED" }
];

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    organization: { findUnique: vi.fn().mockResolvedValue(mockOrg) },
    bill: { findMany: vi.fn().mockResolvedValue(mockBills) },
    session: { findMany: vi.fn().mockResolvedValue(mockSessions) }
  }
}));

describe("HQ Analytics Service", () => {
  it("mock: fetches aggregated multi-store metrics for a Franchise Organization", async () => {
    const { getHqMasterDashboardData } = await import("@/server/services/hq-analytics-service");

    const data = await getHqMasterDashboardData("org-blackball-franchise");

    expect(data.organizationId).toBe("org-blackball-franchise");
    expect(data.organizationName).toBe("BlackBall Franchise Group");
    expect(data.totalOutlets).toBe(3);
    expect(data.outletSummaries).toHaveLength(3);
    expect(data.peakHoursBreakdown).toHaveLength(24);
  });
});
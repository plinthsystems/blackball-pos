import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/server/db/prisma";
import { getHqMasterDashboardData } from "@/server/services/hq-analytics-service";

// The real @/server/db/prisma module is never loaded (no PrismaClient instantiation,
// no DB connection). The service is a pure aggregation over three prisma calls, so
// in-memory fixtures stand in for the seeded Neon `org-blackball-franchise` org.
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    organization: { findUnique: vi.fn() },
    bill: { findMany: vi.fn() },
    session: { findMany: vi.fn() }
  }
}));

const ORG_FIXTURE = {
  id: "org-blackball-franchise",
  name: "BlackBall Franchise Group",
  businesses: [
    {
      id: "biz-andheri",
      name: "BlackBall Andheri",
      slug: "blackball-andheri",
      tables: [
        { id: "t1", status: "OCCUPIED" },
        { id: "t2", status: "OCCUPIED" },
        { id: "t3", status: "FREE" }
      ]
    },
    {
      id: "biz-bandra",
      name: "BlackBall Bandra",
      slug: "blackball-bandra",
      tables: [{ id: "t4", status: "FREE" }]
    },
    {
      id: "biz-powai",
      name: "BlackBall Powai",
      slug: "blackball-powai",
      tables: []
    }
  ]
};

// Minute offsets are kept ≤ 14 so bills and sessions share the same local hour
// in every timezone (worst-case offset :45, e.g. Nepal), keeping the peak-hour
// assertion TZ-proof.
const BILLS_FIXTURE = [
  { businessId: "biz-andheri", totalAmountSnapshot: 300, openedAt: new Date("2026-08-04T21:05:00.000Z"), sessionId: "s1" },
  { businessId: "biz-andheri", totalAmountSnapshot: 200, openedAt: new Date("2026-08-04T21:10:00.000Z"), sessionId: "s2" },
  { businessId: "biz-bandra", totalAmountSnapshot: 100, openedAt: new Date("2026-08-04T13:15:00.000Z"), sessionId: "s3" }
];

const SESSIONS_FIXTURE = [
  { businessId: "biz-andheri", startedAt: new Date("2026-08-04T21:10:00.000Z"), status: "ACTIVE" },
  { businessId: "biz-andheri", startedAt: new Date("2026-08-04T08:00:00.000Z"), status: "CLOSED" },
  { businessId: "biz-bandra", startedAt: new Date("2026-08-04T13:00:00.000Z"), status: "CLOSED" },
  { businessId: "biz-bandra", startedAt: new Date("2026-08-04T21:05:00.000Z"), status: "ACTIVE" }
];

const ORG_BUSINESS_IDS = ["biz-andheri", "biz-bandra", "biz-powai"];

describe("HQ Analytics Service (getHqMasterDashboardData)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(ORG_FIXTURE as any);
    vi.mocked(prisma.bill.findMany).mockResolvedValue(BILLS_FIXTURE as any);
    vi.mocked(prisma.session.findMany).mockResolvedValue(SESSIONS_FIXTURE as any);
  });

  it("fetches aggregated multi-store metrics for a Franchise Organization", async () => {
    const data = await getHqMasterDashboardData("org-blackball-franchise");

    expect(data.organizationId).toBe("org-blackball-franchise");
    expect(data.organizationName).toBe("BlackBall Franchise Group");
    expect(data.totalOutlets).toBe(3);
    expect(data.outletSummaries).toHaveLength(3);

    expect(data.outletSummaries[0]).toEqual({
      businessId: "biz-andheri",
      businessName: "BlackBall Andheri",
      slug: "blackball-andheri",
      activeTablesCount: 2,
      totalTablesCount: 3,
      todaySales: 500,
      todaySessionCount: 2,
      occupancyPercentage: 67
    });

    // Outlet with zero tables: no divide-by-zero, flat zeros.
    expect(data.outletSummaries[2]).toMatchObject({
      businessId: "biz-powai",
      activeTablesCount: 0,
      totalTablesCount: 0,
      todaySales: 0,
      todaySessionCount: 0,
      occupancyPercentage: 0
    });

    expect(data.totalSalesToday).toBe(600);
    expect(data.totalActiveTablesNow).toBe(2);
    expect(data.totalTablesAcrossOutlets).toBe(4);
    expect(data.overallOccupancyPercentage).toBe(50);

    // 24 hourly buckets; the peak hour is derived from the fixture times and
    // asserted TZ-proof via the same getHours() the service uses.
    expect(data.peakHoursBreakdown).toHaveLength(24);
    const peakHourLabel = `${new Date("2026-08-04T21:10:00.000Z")
      .getHours()
      .toString()
      .padStart(2, "0")}:00`;
    expect(data.peakHoursBreakdown.find((b) => b.hourLabel === peakHourLabel)).toEqual({
      hourLabel: peakHourLabel,
      sessionCount: 2,
      revenue: 500
    });
    // No data lost in bucketing.
    expect(data.peakHoursBreakdown.reduce((acc, b) => acc + b.sessionCount, 0)).toBe(4);
    expect(data.peakHoursBreakdown.reduce((acc, b) => acc + b.revenue, 0)).toBe(600);
  });

  it("scopes the queries to the organization's business ids within today's window", async () => {
    await getHqMasterDashboardData("org-blackball-franchise");

    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org-blackball-franchise" },
      include: {
        businesses: {
          include: {
            tables: { select: { id: true, status: true } }
          }
        }
      }
    });

    expect(prisma.bill.findMany).toHaveBeenCalledWith({
      where: {
        businessId: { in: ORG_BUSINESS_IDS },
        openedAt: { gte: expect.any(Date), lte: expect.any(Date) }
      },
      select: {
        businessId: true,
        totalAmountSnapshot: true,
        openedAt: true,
        sessionId: true
      }
    });

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: {
        businessId: { in: ORG_BUSINESS_IDS },
        startedAt: { gte: expect.any(Date), lte: expect.any(Date) }
      },
      select: {
        businessId: true,
        startedAt: true,
        status: true
      }
    });
  });

  it("throws when the organization does not exist", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    await expect(getHqMasterDashboardData("org-missing")).rejects.toThrow(
      "Organization with ID org-missing not found"
    );
    expect(prisma.bill.findMany).not.toHaveBeenCalled();
    expect(prisma.session.findMany).not.toHaveBeenCalled();
  });

  it("returns zeroed metrics when the organization has no bills or sessions yet", async () => {
    vi.mocked(prisma.bill.findMany).mockResolvedValue([]);
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);

    const data = await getHqMasterDashboardData("org-blackball-franchise");

    expect(data.totalSalesToday).toBe(0);
    expect(data.totalActiveTablesNow).toBe(2);
    expect(data.outletSummaries.every((o) => o.todaySales === 0 && o.todaySessionCount === 0)).toBe(
      true
    );
    expect(data.peakHoursBreakdown.every((b) => b.sessionCount === 0 && b.revenue === 0)).toBe(
      true
    );
  });
});

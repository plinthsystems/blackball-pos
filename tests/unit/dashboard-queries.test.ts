import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getOwnerDashboardData } from "@/features/dashboard/queries";

const mocks = vi.hoisted(() => {
  const model = (): Record<string, ReturnType<typeof vi.fn>> => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn()
  });
  return { prisma: { bill: model(), session: model() } };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));

/** Day-boundary math is timezone-sensitive; pin UTC. */
beforeAll(() => {
  process.env.TZ = "UTC";
});
afterAll(() => {
  delete process.env.TZ;
});

describe("getOwnerDashboardData", () => {
  beforeEach(() => {
    mocks.prisma.bill.findMany.mockReset();
    mocks.prisma.session.findMany.mockReset();
    mocks.prisma.bill.count.mockReset();
  });

  it("fetches today's closed bills, completed sessions and open-bill count", async () => {
    mocks.prisma.bill.findMany.mockResolvedValue([]);
    mocks.prisma.session.findMany.mockResolvedValue([]);
    mocks.prisma.bill.count.mockResolvedValue(0);

    const now = new Date("2026-08-17T10:00:00.000Z");
    await getOwnerDashboardData("biz-1", now);

    expect(mocks.prisma.bill.findMany).toHaveBeenCalledWith({
      where: {
        businessId: "biz-1",
        status: "CLOSED",
        closedAt: { gte: new Date("2026-08-17T00:00:00.000Z"), lt: new Date("2026-08-18T00:00:00.000Z") }
      },
      include: { items: true, session: { include: { table: true } } }
    });
    expect(mocks.prisma.session.findMany).toHaveBeenCalledWith({
      where: {
        businessId: "biz-1",
        status: "COMPLETED",
        actualEndAt: { gte: new Date("2026-08-17T00:00:00.000Z"), lt: new Date("2026-08-18T00:00:00.000Z") }
      },
      include: { table: true }
    });
    expect(mocks.prisma.bill.count).toHaveBeenCalledWith({
      where: { businessId: "biz-1", status: "OPEN" }
    });
  });

  it("composes the DB rows through buildOwnerDashboardData", async () => {
    mocks.prisma.bill.findMany.mockResolvedValue([
      {
        id: "bill_1",
        kind: "SESSION",
        status: "CLOSED",
        closedAt: new Date("2026-08-17T10:30:00.000Z"),
        tableAmountSnapshot: 175,
        itemTotalAmountSnapshot: 60,
        totalAmountSnapshot: 235,
        session: { table: { gameType: "SNOOKER", pricingGroup: "royal", number: "Royal 1" } },
        items: [
          { category: "FOOD", lineTotalAmount: 40 },
          { category: "BEVERAGES", lineTotalAmount: 20 }
        ]
      },
      {
        id: "bill_2",
        kind: "COUNTER",
        status: "CLOSED",
        closedAt: new Date("2026-08-17T12:00:00.000Z"),
        tableAmountSnapshot: 0,
        itemTotalAmountSnapshot: 80,
        totalAmountSnapshot: 80,
        session: null,
        items: [{ category: "CIGARETTES", lineTotalAmount: 80 }]
      }
    ]);
    mocks.prisma.session.findMany.mockResolvedValue([
      {
        id: "s1",
        startedAt: new Date("2026-08-17T09:00:00.000Z"),
        actualEndAt: new Date("2026-08-17T10:30:00.000Z"),
        table: { number: "Royal 1", gameType: "SNOOKER", pricingGroup: "royal" }
      }
    ]);
    mocks.prisma.bill.count.mockResolvedValue(2);

    const data = await getOwnerDashboardData("biz-1", new Date("2026-08-17T15:00:00.000Z"));

    expect(data.totalRevenue).toBe(315);
    expect(data.revenue).toEqual({ stationTime: 175, ps5Time: 0, food: 40, beverages: 20, cigarettes: 80 });
    expect(data.closedBillCount).toBe(2);
    expect(data.openBillCount).toBe(2);
    expect(data.busyHours).toEqual([
      { label: "Royal Snooker", hours: 1.5 },
      { label: "Mini Snooker", hours: 0 },
      { label: "Pool", hours: 0 },
      { label: "PS5", hours: 0 }
    ]);
  });

  it("returns an all-zeros dashboard for an empty day", async () => {
    mocks.prisma.bill.findMany.mockResolvedValue([]);
    mocks.prisma.session.findMany.mockResolvedValue([]);
    mocks.prisma.bill.count.mockResolvedValue(0);

    const data = await getOwnerDashboardData("biz-1", new Date("2026-08-17T15:00:00.000Z"));

    expect(data).toEqual({
      totalRevenue: 0,
      revenue: { stationTime: 0, ps5Time: 0, food: 0, cigarettes: 0, beverages: 0 },
      busyHours: [
        { label: "Royal Snooker", hours: 0 },
        { label: "Mini Snooker", hours: 0 },
        { label: "Pool", hours: 0 },
        { label: "PS5", hours: 0 }
      ],
      closedBillCount: 0,
      openBillCount: 0
    });
  });
});

import { describe, expect, it } from "vitest";
import { buildOwnerDashboardData } from "@/features/dashboard/queries";

describe("buildOwnerDashboardData", () => {
  it("summarizes today's closed bill revenue by station and product category", () => {
    const data = buildOwnerDashboardData({
      now: new Date("2026-08-04T15:00:00.000Z"),
      bills: [
        {
          id: "bill_snooker",
          kind: "SESSION",
          status: "CLOSED",
          closedAt: new Date("2026-08-04T10:30:00.000Z"),
          tableAmountSnapshot: 175,
          itemTotalAmountSnapshot: 60,
          totalAmountSnapshot: 235,
          session: { table: { gameType: "SNOOKER", pricingGroup: "royal", number: "Royal Snooker 1" } },
          items: [
            { category: "FOOD", lineTotalAmount: 40 },
            { category: "BEVERAGES", lineTotalAmount: 20 }
          ]
        },
        {
          id: "bill_ps5",
          kind: "SESSION",
          status: "CLOSED",
          closedAt: new Date("2026-08-04T12:00:00.000Z"),
          tableAmountSnapshot: 100,
          itemTotalAmountSnapshot: 20,
          totalAmountSnapshot: 120,
          session: { table: { gameType: "PS5", pricingGroup: "standard", number: "PS5 1" } },
          items: [{ category: "CIGARETTES", lineTotalAmount: 20 }]
        },
        {
          id: "bill_counter",
          kind: "COUNTER",
          status: "CLOSED",
          closedAt: new Date("2026-08-04T13:00:00.000Z"),
          tableAmountSnapshot: 0,
          itemTotalAmountSnapshot: 80,
          totalAmountSnapshot: 80,
          session: null,
          items: [{ category: "FOOD", lineTotalAmount: 80 }]
        }
      ],
      sessions: [],
      openBillCount: 2
    });

    expect(data.totalRevenue).toBe(435);
    expect(data.revenue.stationTime).toBe(175);
    expect(data.revenue.ps5Time).toBe(100);
    expect(data.revenue.food).toBe(120);
    expect(data.revenue.cigarettes).toBe(20);
    expect(data.revenue.beverages).toBe(20);
    expect(data.closedBillCount).toBe(3);
    expect(data.openBillCount).toBe(2);
  });

  it("summarizes completed busy hours by station group", () => {
    const data = buildOwnerDashboardData({
      now: new Date("2026-08-04T15:00:00.000Z"),
      bills: [],
      openBillCount: 0,
      sessions: [
        {
          id: "s1",
          startedAt: new Date("2026-08-04T09:00:00.000Z"),
          actualEndAt: new Date("2026-08-04T10:30:00.000Z"),
          table: { number: "Royal Snooker 1", gameType: "SNOOKER", pricingGroup: "royal" }
        },
        {
          id: "s2",
          startedAt: new Date("2026-08-04T10:00:00.000Z"),
          actualEndAt: new Date("2026-08-04T12:00:00.000Z"),
          table: { number: "PS5 1", gameType: "PS5", pricingGroup: "standard" }
        }
      ]
    });

    expect(data.busyHours).toEqual([
      { label: "Royal Snooker", hours: 1.5 },
      { label: "Mini Snooker", hours: 0 },
      { label: "Pool", hours: 0 },
      { label: "PS5", hours: 2 }
    ]);
  });
});

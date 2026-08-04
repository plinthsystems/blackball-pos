import { prisma } from "@/server/db/prisma";
import type { OwnerDashboardData } from "./types";

type DashboardBill = {
  id: string;
  kind: "SESSION" | "COUNTER";
  status: string;
  closedAt: Date | null;
  tableAmountSnapshot: unknown;
  itemTotalAmountSnapshot: unknown;
  totalAmountSnapshot: unknown;
  session: null | { table: { gameType: "POOL" | "SNOOKER" | "PS5"; pricingGroup: string; number: string } };
  items: Array<{ category: "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES"; lineTotalAmount: unknown }>;
};

type DashboardSession = {
  id: string;
  startedAt: Date;
  actualEndAt: Date | null;
  table: { number: string; gameType: "POOL" | "SNOOKER" | "PS5"; pricingGroup: string };
};

export type BuildOwnerDashboardInput = {
  now: Date;
  bills: DashboardBill[];
  sessions: DashboardSession[];
  openBillCount: number;
};

export function buildOwnerDashboardData(input: BuildOwnerDashboardInput): OwnerDashboardData {
  const revenue = { stationTime: 0, ps5Time: 0, food: 0, cigarettes: 0, beverages: 0 };
  for (const bill of input.bills) {
    const tableAmount = roundMoney(Number(bill.tableAmountSnapshot));
    if (bill.session?.table.gameType === "PS5") {
      revenue.ps5Time = roundMoney(revenue.ps5Time + tableAmount);
    } else {
      revenue.stationTime = roundMoney(revenue.stationTime + tableAmount);
    }
    for (const item of bill.items) {
      const amount = Number(item.lineTotalAmount);
      if (item.category === "FOOD" || item.category === "CAFE") {
        revenue.food = roundMoney(revenue.food + amount);
      }
      if (item.category === "CIGARETTES") {
        revenue.cigarettes = roundMoney(revenue.cigarettes + amount);
      }
      if (item.category === "BEVERAGES") {
        revenue.beverages = roundMoney(revenue.beverages + amount);
      }
    }
  }

  const busy = new Map<string, number>([
    ["Royal Snooker", 0],
    ["Mini Snooker", 0],
    ["Pool", 0],
    ["PS5", 0]
  ]);
  for (const session of input.sessions) {
    if (!session.actualEndAt) {
      continue;
    }
    const label = stationGroupLabel(session.table.gameType, session.table.pricingGroup);
    const hours = Math.max(0, session.actualEndAt.getTime() - session.startedAt.getTime()) / 3_600_000;
    busy.set(label, roundMoney((busy.get(label) ?? 0) + hours));
  }

  return {
    totalRevenue: roundMoney(revenue.stationTime + revenue.ps5Time + revenue.food + revenue.cigarettes + revenue.beverages),
    revenue,
    busyHours: [
      { label: "Royal Snooker", hours: busy.get("Royal Snooker") ?? 0 },
      { label: "Mini Snooker", hours: busy.get("Mini Snooker") ?? 0 },
      { label: "Pool", hours: busy.get("Pool") ?? 0 },
      { label: "PS5", hours: busy.get("PS5") ?? 0 }
    ],
    closedBillCount: input.bills.length,
    openBillCount: input.openBillCount
  };
}

export async function getOwnerDashboardData(businessId: string, now = new Date()): Promise<OwnerDashboardData> {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [bills, sessions, openBillCount] = await Promise.all([
    prisma.bill.findMany({
      where: { businessId, status: "CLOSED", closedAt: { gte: startOfDay, lt: endOfDay } },
      include: { items: true, session: { include: { table: true } } }
    }),
    prisma.session.findMany({
      where: { businessId, status: "COMPLETED", actualEndAt: { gte: startOfDay, lt: endOfDay } },
      include: { table: true }
    }),
    prisma.bill.count({ where: { businessId, status: "OPEN" } })
  ]);

  return buildOwnerDashboardData({ now, bills, sessions, openBillCount });
}

function stationGroupLabel(gameType: "POOL" | "SNOOKER" | "PS5", pricingGroup: string) {
  if (gameType === "PS5") {
    return "PS5";
  }
  if (gameType === "POOL") {
    return "Pool";
  }
  if (pricingGroup === "royal") {
    return "Royal Snooker";
  }
  return "Mini Snooker";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

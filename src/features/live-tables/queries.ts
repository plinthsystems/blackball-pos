import { prisma } from "@/server/db/prisma";
import { calculateBillSegmentTableAmount, summarizeBill } from "@/server/domain/bill-summary";
import { calculateBillableSeconds, calculateMinuteBasedTableCharge } from "@/server/domain/session-calculations";
import type { BillLineItem, CounterBillData, LiveBillData, LiveTableCardData, ProductOption } from "./types";

export async function getLiveTableBoard(businessId: string): Promise<LiveTableCardData[]> {
  const [tables, pricingRules] = await Promise.all([
    prisma.clubTable.findMany({
      where: { businessId },
      orderBy: [{ gameType: "asc" }, { number: "asc" }],
      include: {
        sessions: {
          where: { status: { in: ["ACTIVE", "PAUSED"] } },
          orderBy: { startedAt: "desc" },
          take: 1,
          include: {
            customer: true,
            assignedEmployee: true,
            bills: {
              where: { status: "OPEN" },
              orderBy: { openedAt: "desc" },
              take: 1,
              include: { items: { orderBy: { createdAt: "asc" } } }
            }
          }
        }
      }
    }),
    prisma.tablePricing.findMany({ where: { businessId, durationMinutes: 60 } })
  ]);
  const recentBills = await prisma.bill.findMany({
    where: { businessId, status: "CLOSED", kind: "SESSION", sessionId: { not: null } },
    orderBy: { closedAt: "desc" },
    include: { items: { orderBy: { createdAt: "asc" } }, session: { select: { tableId: true } } },
    take: 25
  });
  const recentBillByTableId = new Map<string, LiveBillData>();
  for (const bill of recentBills) {
    const tableId = bill.session?.tableId;
    if (tableId && !recentBillByTableId.has(tableId)) {
      recentBillByTableId.set(tableId, mapClosedBill(bill));
    }
  }

  const hourlyRateByTableType = new Map(
    pricingRules.map((rule) => [`${rule.gameType}:${rule.pricingGroup}`, Number(rule.priceAmount)])
  );
  const now = new Date();

  return tables.map((table) => {
    const session = table.sessions[0];
    const elapsedSeconds = session ? calculateBillableSeconds({ startedAt: session.startedAt, endedAt: now, pauses: [] }) : 0;
    const hourlyRate = hourlyRateByTableType.get(`${table.gameType}:${table.pricingGroup}`) ?? 0;
    const currentCharge = calculateMinuteBasedTableCharge({ billableSeconds: elapsedSeconds, hourlyRate });
    const currentBill = session?.bills[0] ? mapOpenBill(session.bills[0], currentBillTableAmount(session.bills[0].openedAt, now, hourlyRate)) : null;
    const billSummary = currentBill?.summary ?? summarizeBill({ tableAmount: currentCharge, items: [] });
    return {
      id: table.id,
      number: table.number,
      gameType: table.gameType,
      status: table.status,
      currentSession: session
        ? {
            id: session.id,
            status: session.status,
            customerName: session.customer?.name ?? null,
            startedAt: session.startedAt.toISOString(),
            plannedEndAt: session.plannedEndAt.toISOString(),
            elapsedSeconds,
            billEstimate: Number(session.billableSecondsSnapshot) || currentCharge,
            billSummary,
            currentBill,
            assignedStaffName: session.assignedEmployee?.name ?? null
          }
        : null,
      recentBill: recentBillByTableId.get(table.id) ?? null
    };
  });
}

export async function getOpenCounterBills(businessId: string): Promise<CounterBillData[]> {
  const bills = await prisma.bill.findMany({
    where: { businessId, kind: "COUNTER", status: "OPEN" },
    orderBy: { openedAt: "desc" },
    include: { items: { orderBy: { createdAt: "asc" } } }
  });
  return bills.map((bill) => mapOpenBill(bill, 0));
}

export async function getProductOptions(businessId: string): Promise<ProductOption[]> {
  const products = await prisma.product.findMany({
    where: { businessId, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    priceAmount: Number(product.priceAmount)
  }));
}

function mapOpenBill(
  bill: {
    id: string;
    label: string | null;
    openedAt: Date;
    items: Array<{ id: string; nameSnapshot: string; category: "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES"; quantity: number; unitPriceAmount: unknown; lineTotalAmount: unknown }>;
  },
  tableAmount: number
): LiveBillData {
  const items = mapBillItems(bill.items);
  return {
    id: bill.id,
    label: bill.label ?? "Bill",
    openedAt: bill.openedAt.toISOString(),
    closedAt: null,
    summary: summarizeBill({ tableAmount, items: items.map((item) => ({ category: item.category, lineTotalAmount: item.lineTotalAmount })) }),
    items
  };
}

function mapClosedBill(bill: {
  id: string;
  label: string | null;
  openedAt: Date;
  closedAt: Date | null;
  tableAmountSnapshot: unknown;
  itemTotalAmountSnapshot: unknown;
  totalAmountSnapshot: unknown;
  items: Array<{ id: string; nameSnapshot: string; category: "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES"; quantity: number; unitPriceAmount: unknown; lineTotalAmount: unknown }>;
}): LiveBillData {
  return {
    id: bill.id,
    label: bill.label ?? "Bill",
    openedAt: bill.openedAt.toISOString(),
    closedAt: bill.closedAt?.toISOString() ?? null,
    summary: {
      tableAmount: Number(bill.tableAmountSnapshot),
      categoryTotals: summarizeBill({
        tableAmount: 0,
        items: bill.items.map((item) => ({ category: item.category, lineTotalAmount: Number(item.lineTotalAmount) }))
      }).categoryTotals,
      itemTotal: Number(bill.itemTotalAmountSnapshot),
      grandTotal: Number(bill.totalAmountSnapshot)
    },
    items: mapBillItems(bill.items)
  };
}

function mapBillItems(
  items: Array<{ id: string; nameSnapshot: string; category: "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES"; quantity: number; unitPriceAmount: unknown; lineTotalAmount: unknown }>
): BillLineItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.nameSnapshot,
    category: item.category,
    quantity: item.quantity,
    unitPriceAmount: Number(item.unitPriceAmount),
    lineTotalAmount: Number(item.lineTotalAmount)
  }));
}

function currentBillTableAmount(openedAt: Date, now: Date, hourlyRate: number) {
  return calculateBillSegmentTableAmount({ startedAt: openedAt, endedAt: now, hourlyRate });
}

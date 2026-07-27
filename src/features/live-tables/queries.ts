import { prisma } from "@/server/db/prisma";
import { summarizeSessionBill } from "@/server/domain/bill-summary";
import { calculateBillableSeconds, calculateMinuteBasedTableCharge } from "@/server/domain/session-calculations";
import type { LiveTableCardData, ProductOption } from "./types";

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
          include: { customer: true, assignedEmployee: true, items: true }
        }
      }
    }),
    prisma.tablePricing.findMany({ where: { businessId, durationMinutes: 60 } })
  ]);

  const hourlyRateByTableType = new Map(
    pricingRules.map((rule) => [`${rule.gameType}:${rule.pricingGroup}`, Number(rule.priceAmount)])
  );
  const now = new Date();

  return tables.map((table) => {
    const session = table.sessions[0];
    const elapsedSeconds = session ? calculateBillableSeconds({ startedAt: session.startedAt, endedAt: now, pauses: [] }) : 0;
    const hourlyRate = hourlyRateByTableType.get(`${table.gameType}:${table.pricingGroup}`) ?? 0;
    const currentCharge = calculateMinuteBasedTableCharge({ billableSeconds: elapsedSeconds, hourlyRate });
    const billSummary = summarizeSessionBill({
      tableAmount: currentCharge,
      items: session?.items.map((item) => ({ category: item.category, lineTotalAmount: Number(item.lineTotalAmount) })) ?? []
    });
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
            billEstimate: Number(session.billableSecondsSnapshot) || currentCharge,
            billSummary,
            assignedStaffName: session.assignedEmployee?.name ?? null
          }
        : null
    };
  });
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

import { prisma } from "@/server/db/prisma";
import type { LiveTableCardData } from "./types";

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
          include: { customer: true, assignedEmployee: true }
        }
      }
    }),
    prisma.tablePricing.findMany({ where: { businessId, pricingGroup: "standard" } })
  ]);

  const priceByGameAndDuration = new Map(
    pricingRules.map((rule) => [`${rule.gameType}:${rule.durationMinutes}`, Number(rule.priceAmount)])
  );

  return tables.map((table) => {
    const session = table.sessions[0];
    const plannedMinutes = session ? Math.round((session.plannedEndAt.getTime() - session.startedAt.getTime()) / 60_000) : 0;
    const plannedCharge = priceByGameAndDuration.get(`${table.gameType}:${plannedMinutes}`) ?? Number(session?.billableSecondsSnapshot ?? 0);
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
            billEstimate: Number(session.billableSecondsSnapshot) || plannedCharge,
            assignedStaffName: session.assignedEmployee?.name ?? null
          }
        : null
    };
  });
}

import { prisma } from "@/server/db/prisma";
import { calculateBillableSeconds, calculateMinuteBasedTableCharge } from "@/server/domain/session-calculations";
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
            assignedStaffName: session.assignedEmployee?.name ?? null
          }
        : null
    };
  });
}

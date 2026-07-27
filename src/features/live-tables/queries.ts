import { prisma } from "@/server/db/prisma";
import type { LiveTableCardData } from "./types";

export async function getLiveTableBoard(businessId: string): Promise<LiveTableCardData[]> {
  const tables = await prisma.clubTable.findMany({
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
  });

  return tables.map((table) => {
    const session = table.sessions[0];
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
            plannedEndAt: session.plannedEndAt.toISOString(),
            billEstimate: Number(session.billableSecondsSnapshot),
            assignedStaffName: session.assignedEmployee?.name ?? null
          }
        : null
    };
  });
}

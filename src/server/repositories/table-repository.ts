import type { TableStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { LiveTableRecord, TableRecord, TransactionClient } from "./types";

export type TableRepository = {
  findBoardTables(businessId: string): Promise<LiveTableRecord[]>;
  findByIdForUpdate(input: { businessId: string; tableId: string; tx: TransactionClient }): Promise<TableRecord | null>;
  updateStatus(input: { businessId: string; tableId: string; status: TableStatus; tx: TransactionClient }): Promise<void>;
};

export const prismaTableRepository: TableRepository = {
  async findBoardTables(businessId) {
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
        businessId: table.businessId,
        number: table.number,
        gameType: table.gameType,
        status: table.status,
        pricingGroup: table.pricingGroup,
        currentSession: session
          ? {
              id: session.id,
              status: session.status,
              customerName: session.customer?.name ?? null,
              plannedEndAt: session.plannedEndAt,
              billEstimate: Number(session.billableSecondsSnapshot),
              assignedStaffName: session.assignedEmployee?.name ?? null
            }
          : null
      };
    });
  },

  async findByIdForUpdate({ businessId, tableId, tx }) {
    const client = tx as typeof prisma;
    return client.clubTable.findFirst({
      where: { id: tableId, businessId },
      select: {
        id: true,
        businessId: true,
        number: true,
        gameType: true,
        status: true,
        pricingGroup: true
      }
    });
  },

  async updateStatus({ businessId, tableId, status, tx }) {
    const client = tx as typeof prisma;
    await client.clubTable.update({
      where: { id: tableId, businessId },
      data: { status, version: { increment: 1 } }
    });
  }
};

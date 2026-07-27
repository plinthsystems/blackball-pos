import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { TransactionClient } from "./types";

export type AuditLogRepository = {
  record(input: {
    businessId: string;
    employeeId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
    tx: TransactionClient;
  }): Promise<void>;
};

export const prismaAuditLogRepository: AuditLogRepository = {
  async record({ businessId, employeeId, action, entityType, entityId, metadata, tx }) {
    const client = tx as typeof prisma;
    await client.auditLog.create({
      data: { businessId, employeeId, action, entityType, entityId, metadata: metadata as Prisma.InputJsonValue }
    });
  }
};

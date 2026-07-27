import type { TableStatus } from "@prisma/client";
import { DomainError } from "@/server/domain/errors";
import type { DomainEventPublisher } from "@/server/domain/events";
import { canTransitionTableStatus } from "@/server/domain/table-transitions";
import type { AuditLogRepository } from "@/server/repositories/audit-log-repository";
import type { TableRepository } from "@/server/repositories/table-repository";
import type { TransactionClient } from "@/server/repositories/types";

type TransactionRunner = <T>(callback: (tx: TransactionClient) => Promise<T>) => Promise<T>;

export class TableService {
  constructor(
    private readonly tables: TableRepository,
    private readonly auditLogs: AuditLogRepository,
    private readonly events: DomainEventPublisher,
    private readonly transaction: TransactionRunner
  ) {}

  async updateOperationalStatus(input: {
    businessId: string;
    employeeId: string;
    tableId: string;
    status: Extract<TableStatus, "AVAILABLE" | "CLEANING" | "MAINTENANCE" | "BLOCKED">;
  }) {
    return this.transaction(async (tx) => {
      const table = await this.tables.findByIdForUpdate({ businessId: input.businessId, tableId: input.tableId, tx });
      if (!table || !canTransitionTableStatus(table.status, input.status)) {
        throw new DomainError("INVALID_STATUS_TRANSITION", "This table cannot move to the requested status.", {
          tableId: input.tableId,
          requestedStatus: input.status
        });
      }

      await this.tables.updateStatus({ businessId: input.businessId, tableId: input.tableId, status: input.status, tx });
      await this.auditLogs.record({
        businessId: input.businessId,
        employeeId: input.employeeId,
        action: "table.status_changed",
        entityType: "ClubTable",
        entityId: input.tableId,
        metadata: { previousStatus: table.status, newStatus: input.status },
        tx
      });
      await this.events.publish({
        name: "table.status_changed",
        businessId: input.businessId,
        entityId: input.tableId,
        payload: { previousStatus: table.status, newStatus: input.status }
      });
    });
  }
}

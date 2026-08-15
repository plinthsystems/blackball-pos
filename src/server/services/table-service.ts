import type { TableStatus } from "@prisma/client";
import { DomainError } from "@/server/domain/errors";
import type { DomainEventPublisher } from "@/server/domain/events";
import { canManuallySetStatus } from "@/server/domain/table-transitions";
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

  /**
   * Manual status override for staff (fix table statuses that drifted from reality,
   * e.g. stuck OCCUPIED with no session, or maintenance). Real transitions still use
   * the canonical flow; manual changes are refused while an ACTIVE session exists.
   */
  async updateOperationalStatus(input: {
    businessId: string;
    employeeId: string;
    tableId: string;
    status: Extract<TableStatus, "AVAILABLE" | "RESERVED" | "CLEANING" | "MAINTENANCE" | "BLOCKED">;
  }) {
    return this.transaction(async (tx) => {
      const table = await this.tables.findByIdForUpdate({ businessId: input.businessId, tableId: input.tableId, tx });
      if (!table) {
        throw new DomainError("TABLE_NOT_AVAILABLE", "Table not found.", { tableId: input.tableId });
      }

      const activeSession = await tx.session.findFirst({
        where: { businessId: input.businessId, tableId: table.id, status: "ACTIVE" },
        select: { id: true }
      });

      if (!canManuallySetStatus(table.status, input.status, Boolean(activeSession))) {
        if (activeSession) {
          throw new DomainError(
            "INVALID_STATUS_TRANSITION",
            "This table has an active session — end the session first.",
            { tableId: input.tableId, requestedStatus: input.status }
          );
        }
        throw new DomainError("INVALID_STATUS_TRANSITION", "This table cannot move to the requested status.", {
          tableId: input.tableId,
          requestedStatus: input.status
        });
      }

      await this.tables.updateStatus({ businessId: input.businessId, tableId: input.tableId, status: input.status, tx });
      await this.auditLogs.record({
        businessId: input.businessId,
        employeeId: input.employeeId,
        action: "table.status.manual_override",
        entityType: "ClubTable",
        entityId: input.tableId,
        metadata: { previousStatus: table.status, newStatus: input.status, manual: true },
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

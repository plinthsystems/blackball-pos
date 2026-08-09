import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/server/domain/errors";
import type { DomainEventPublisher } from "@/server/domain/events";
import { calculateBillableSeconds } from "@/server/domain/session-calculations";
import { addMinutes } from "@/lib/time";
import type { AuditLogRepository } from "@/server/repositories/audit-log-repository";
import type { SessionRepository } from "@/server/repositories/session-repository";
import type { TableRepository } from "@/server/repositories/table-repository";
import type { TransactionClient } from "@/server/repositories/types";

type TransactionRunner = <T>(callback: (tx: TransactionClient) => Promise<T>) => Promise<T>;

export class SessionService {
  constructor(
    private readonly tables: TableRepository,
    private readonly sessions: SessionRepository,
    private readonly auditLogs: AuditLogRepository,
    private readonly events: DomainEventPublisher,
    private readonly transaction: TransactionRunner = (callback) => prisma.$transaction((tx) => callback(tx))
  ) {}

  async startWalkInSession(input: {
    businessId: string;
    employeeId: string;
    tableId: string;
    durationMinutes: 30 | 60;
    now: Date;
    ps5MemberCount?: number | null;
    hourlyRateSnapshot: number;
    customerId?: string | null;
    assignedEmployeeId?: string | null;
  }): Promise<{ sessionId: string }> {
    return this.transaction(async (tx) => {
      const table = await this.tables.findByIdForUpdate({ businessId: input.businessId, tableId: input.tableId, tx });
      if (!table || table.status !== "AVAILABLE") {
        throw new DomainError("TABLE_NOT_AVAILABLE", "This table is not available for a new session.");
      }

      const activeSession = await this.sessions.findActiveByTable({ businessId: input.businessId, tableId: input.tableId, tx });
      if (activeSession) {
        throw new DomainError("OVERLAPPING_SESSION", "This table already has an active session.");
      }

      const startedAt = input.now;
      const plannedEndAt = addMinutes(startedAt, input.durationMinutes);
      const session = await this.sessions.createWalkInSession({
        businessId: input.businessId,
        employeeId: input.employeeId,
        tableId: input.tableId,
        customerId: input.customerId ?? null,
        assignedEmployeeId: input.assignedEmployeeId ?? input.employeeId,
        ps5MemberCount: input.ps5MemberCount ?? null,
        hourlyRateSnapshot: input.hourlyRateSnapshot,
        startedAt,
        plannedEndAt,
        tx
      });

      await this.tables.updateStatus({ businessId: input.businessId, tableId: input.tableId, status: "OCCUPIED", tx });
      await this.auditLogs.record({
        businessId: input.businessId,
        employeeId: input.employeeId,
        action: "session.started",
        entityType: "Session",
        entityId: session.sessionId,
        metadata: { tableId: input.tableId, plannedEndAt, ps5MemberCount: input.ps5MemberCount ?? null, hourlyRateSnapshot: input.hourlyRateSnapshot },
        tx
      });
      await this.events.publish({
        name: "session.started",
        businessId: input.businessId,
        entityId: session.sessionId,
        payload: { tableId: input.tableId }
      });

      return session;
    });
  }

  async extendSession(input: {
    businessId: string;
    employeeId: string;
    sessionId: string;
    addedMinutes: 30 | 60;
    now: Date;
  }) {
    return this.transaction(async (tx) => {
      const session = await this.sessions.findByIdForUpdate({ businessId: input.businessId, sessionId: input.sessionId, tx });
      if (!session || session.status !== "ACTIVE") {
        throw new DomainError("SESSION_NOT_ACTIVE", "Only an active session can be extended.");
      }

      const newPlannedEndAt = addMinutes(session.plannedEndAt, input.addedMinutes);
      const conflicts = await this.sessions.findConflicts({
        businessId: input.businessId,
        tableId: session.tableId,
        startsAt: session.plannedEndAt,
        endsAt: newPlannedEndAt,
        tx
      });
      if (conflicts.length > 0) {
        throw new DomainError("EXTENSION_CONFLICT", "A future booking prevents this extension.", {
          conflictId: conflicts[0]?.id
        });
      }

      await this.sessions.extend({
        sessionId: session.id,
        previousPlannedEndAt: session.plannedEndAt,
        newPlannedEndAt,
        addedMinutes: input.addedMinutes,
        tx
      });
      await this.auditLogs.record({
        businessId: input.businessId,
        employeeId: input.employeeId,
        action: "session.extended",
        entityType: "Session",
        entityId: session.id,
        metadata: { newPlannedEndAt },
        tx
      });
      await this.events.publish({
        name: "session.extended",
        businessId: input.businessId,
        entityId: session.id,
        payload: { newPlannedEndAt }
      });
    });
  }

  async pauseSession(input: { businessId: string; employeeId: string; sessionId: string; now: Date }) {
    return this.transaction(async (tx) => {
      const session = await this.sessions.findByIdForUpdate({ businessId: input.businessId, sessionId: input.sessionId, tx });
      if (!session || session.status !== "ACTIVE") {
        throw new DomainError("SESSION_NOT_ACTIVE", "Only an active session can be paused.");
      }
      await this.sessions.updateStatus({ businessId: input.businessId, sessionId: input.sessionId, status: "PAUSED", pausedAt: input.now, tx });
      await this.events.publish({ name: "session.paused", businessId: input.businessId, entityId: input.sessionId, payload: {} });
    });
  }

  async resumeSession(input: { businessId: string; employeeId: string; sessionId: string; now: Date }) {
    return this.transaction(async (tx) => {
      const session = await this.sessions.findByIdForUpdate({ businessId: input.businessId, sessionId: input.sessionId, tx });
      if (!session || session.status !== "PAUSED") {
        throw new DomainError("SESSION_NOT_PAUSED", "Only a paused session can be resumed.");
      }
      await this.sessions.updateStatus({ businessId: input.businessId, sessionId: input.sessionId, status: "ACTIVE", pausedAt: null, tx });
      await this.events.publish({ name: "session.resumed", businessId: input.businessId, entityId: input.sessionId, payload: {} });
    });
  }

  async endSession(input: { businessId: string; employeeId: string; sessionId: string; now: Date }) {
    return this.transaction(async (tx) => {
      const session = await this.sessions.findByIdForUpdate({ businessId: input.businessId, sessionId: input.sessionId, tx });
      if (!session || !["ACTIVE", "PAUSED"].includes(session.status)) {
        throw new DomainError("SESSION_NOT_ACTIVE", "Only an active or paused session can be ended.");
      }

      const billableSeconds = calculateBillableSeconds({
        startedAt: session.startedAt,
        endedAt: input.now,
        pauses: []
      });
      await this.sessions.end({ businessId: input.businessId, sessionId: input.sessionId, actualEndAt: input.now, billableSeconds, tx });
      await this.tables.updateStatus({ businessId: input.businessId, tableId: session.tableId, status: "AVAILABLE", tx });
      await this.auditLogs.record({
        businessId: input.businessId,
        employeeId: input.employeeId,
        action: "session.ended",
        entityType: "Session",
        entityId: input.sessionId,
        metadata: { billableSeconds },
        tx
      });
      await this.events.publish({ name: "session.ended", businessId: input.businessId, entityId: input.sessionId, payload: { billableSeconds } });
    });
  }
}

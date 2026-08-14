import type { SessionStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { ConflictRecord, SessionRecord, TransactionClient } from "./types";

export type CreateSessionInput = {
  businessId: string;
  employeeId: string;
  tableId: string;
  customerId?: string | null;
  assignedEmployeeId?: string | null;
  ps5MemberCount?: number | null;
  hourlyRateSnapshot: number;
  startedAt: Date;
  plannedEndAt: Date;
  tx: TransactionClient;
};

export type ExtendSessionRecordInput = {
  sessionId: string;
  previousPlannedEndAt: Date;
  newPlannedEndAt: Date;
  addedMinutes: number;
  tx: TransactionClient;
};

export type EndSessionRecordInput = {
  businessId: string;
  sessionId: string;
  actualEndAt: Date;
  billableSeconds: number;
  tx: TransactionClient;
};

export type SessionRepository = {
  createWalkInSession(input: CreateSessionInput): Promise<{ sessionId: string }>;
  findActiveByTable(input: { businessId: string; tableId: string; tx: TransactionClient }): Promise<SessionRecord | null>;
  findByIdForUpdate(input: { businessId: string; sessionId: string; tx: TransactionClient }): Promise<SessionRecord | null>;
  findConflicts(input: { businessId: string; tableId: string; startsAt: Date; endsAt: Date; tx: TransactionClient }): Promise<ConflictRecord[]>;
  updateStatus(input: { businessId: string; sessionId: string; status: SessionStatus; pausedAt?: Date | null; tx: TransactionClient }): Promise<void>;
  extend(input: ExtendSessionRecordInput): Promise<void>;
  end(input: EndSessionRecordInput): Promise<void>;
};

export const prismaSessionRepository: SessionRepository = {
  async createWalkInSession(input) {
    const client = input.tx as typeof prisma;
    const session = await client.session.create({
      data: {
        businessId: input.businessId,
        tableId: input.tableId,
        customerId: input.customerId ?? null,
        assignedEmployeeId: input.assignedEmployeeId ?? input.employeeId,
        createdByEmployeeId: input.employeeId,
        ps5MemberCount: input.ps5MemberCount ?? null,
        hourlyRateSnapshot: input.hourlyRateSnapshot,
        startedAt: input.startedAt,
        plannedEndAt: input.plannedEndAt
      },
      select: { id: true }
    });

    return { sessionId: session.id };
  },

  async findActiveByTable({ businessId, tableId, tx }) {
    const client = tx as typeof prisma;
    const session = await client.session.findFirst({
      where: { businessId, tableId, status: { in: ["ACTIVE", "PAUSED"] } },
      select: { id: true, businessId: true, tableId: true, status: true, startedAt: true, plannedEndAt: true, ps5MemberCount: true, hourlyRateSnapshot: true }
    });
    return session ? mapSessionRecord(session) : null;
  },

  async findByIdForUpdate({ businessId, sessionId, tx }) {
    const client = tx as typeof prisma;
    const session = await client.session.findFirst({
      where: { id: sessionId, businessId },
      select: { id: true, businessId: true, tableId: true, status: true, startedAt: true, plannedEndAt: true, ps5MemberCount: true, hourlyRateSnapshot: true }
    });
    return session ? mapSessionRecord(session) : null;
  },

  async findConflicts({ businessId, tableId, startsAt, endsAt, tx }) {
    const client = tx as typeof prisma;
    const [bookings, sessions] = await Promise.all([
      client.booking.findMany({
        where: {
          businessId,
          tableId,
          status: { in: ["CONFIRMED", "CHECKED_IN", "PLAYING"] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt }
        },
        select: { id: true, startsAt: true, endsAt: true }
      }),
      client.session.findMany({
        where: {
          businessId,
          tableId,
          status: { in: ["ACTIVE", "PAUSED"] },
          startedAt: { lt: endsAt },
          plannedEndAt: { gt: startsAt }
        },
        select: { id: true, startedAt: true, plannedEndAt: true }
      })
    ]);

    return [
      ...bookings.map((booking) => ({ id: booking.id, kind: "booking" as const, startsAt: booking.startsAt, endsAt: booking.endsAt })),
      ...sessions.map((session) => ({ id: session.id, kind: "session" as const, startsAt: session.startedAt, endsAt: session.plannedEndAt }))
    ];
  },

  async updateStatus({ businessId, sessionId, status, pausedAt, tx }) {
    const client = tx as typeof prisma;
    await client.session.update({
      where: { id: sessionId, businessId },
      data: { status, pausedAt, version: { increment: 1 } }
    });
  },

  async extend({ sessionId, previousPlannedEndAt, newPlannedEndAt, addedMinutes, tx }) {
    const client = tx as typeof prisma;
    await client.session.update({
      where: { id: sessionId },
      data: {
        plannedEndAt: newPlannedEndAt,
        version: { increment: 1 },
        extensions: { create: { previousPlannedEndAt, newPlannedEndAt, addedMinutes } }
      }
    });
  },

  async end({ businessId, sessionId, actualEndAt, billableSeconds, tx }) {
    const client = tx as typeof prisma;
    await client.session.update({
      where: { id: sessionId, businessId },
      data: {
        status: "COMPLETED",
        actualEndAt,
        billableSecondsSnapshot: billableSeconds,
        version: { increment: 1 }
      }
    });
  }
};

function mapSessionRecord(session: {
  id: string;
  businessId: string;
  tableId: string;
  status: SessionStatus;
  startedAt: Date;
  plannedEndAt: Date;
  ps5MemberCount: number | null;
  hourlyRateSnapshot: unknown;
}): SessionRecord {
  return {
    ...session,
    hourlyRateSnapshot: Number(session.hourlyRateSnapshot)
  };
}

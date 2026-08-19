import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  tablePricing: { findMany: vi.fn() },
  clubTable: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  session: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  booking: { findMany: vi.fn() },
  auditLog: { create: vi.fn() }
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockDb }));

import type { TransactionClient } from "@/server/repositories/types";
import { prismaAuditLogRepository } from "@/server/repositories/audit-log-repository";
import { prismaPricingRepository } from "@/server/repositories/pricing-repository";
import { prismaSessionRepository } from "@/server/repositories/session-repository";
import { prismaTableRepository } from "@/server/repositories/table-repository";

const TX = mockDb as unknown as TransactionClient;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("prismaPricingRepository.findRules", () => {
  it("queries by business, gameType and pricingGroup and converts Decimal amounts", async () => {
    mockDb.tablePricing.findMany.mockResolvedValue([
      { durationMinutes: 30, priceAmount: new Prisma.Decimal("100.50") },
      { durationMinutes: 60, priceAmount: new Prisma.Decimal("180") }
    ]);

    const rules = await prismaPricingRepository.findRules({
      businessId: "biz-1",
      gameType: "POOL",
      pricingGroup: "peak"
    });

    expect(mockDb.tablePricing.findMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1", gameType: "POOL", pricingGroup: "peak" },
      select: { durationMinutes: true, priceAmount: true }
    });
    expect(rules).toEqual([
      { durationMinutes: 30, priceAmount: 100.5 },
      { durationMinutes: 60, priceAmount: 180 }
    ]);
  });

  it("returns an empty list when no rules match", async () => {
    mockDb.tablePricing.findMany.mockResolvedValue([]);
    expect(
      await prismaPricingRepository.findRules({ businessId: "biz-1", gameType: "PS5", pricingGroup: "off-peak" })
    ).toEqual([]);
  });
});

describe("prismaTableRepository.findBoardTables", () => {
  const tableRow = (sessions: unknown[]) => ({
    id: "table-1",
    businessId: "biz-1",
    number: "5",
    gameType: "POOL",
    status: "OCCUPIED",
    pricingGroup: "peak",
    sessions
  });

  it("queries active/paused sessions ordered by start, newest first", async () => {
    mockDb.clubTable.findMany.mockResolvedValue([tableRow([])]);

    await prismaTableRepository.findBoardTables("biz-1");

    expect(mockDb.clubTable.findMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1" },
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
  });

  it("maps the newest session to currentSession with names and numeric estimate", async () => {
    mockDb.clubTable.findMany.mockResolvedValue([
      tableRow([
        {
          id: "session-1",
          status: "ACTIVE",
          plannedEndAt: new Date("2026-08-17T19:00:00Z"),
          billableSecondsSnapshot: new Prisma.Decimal("2700"),
          customer: { name: "Rahul" },
          assignedEmployee: { name: "Amit" }
        }
      ])
    ]);

    const tables = await prismaTableRepository.findBoardTables("biz-1");

    expect(tables[0].currentSession).toEqual({
      id: "session-1",
      status: "ACTIVE",
      customerName: "Rahul",
      plannedEndAt: new Date("2026-08-17T19:00:00Z"),
      billEstimate: 2700,
      assignedStaffName: "Amit"
    });
  });

  it("maps null names when customer/employee are absent", async () => {
    mockDb.clubTable.findMany.mockResolvedValue([
      tableRow([
        {
          id: "session-1",
          status: "PAUSED",
          plannedEndAt: new Date(),
          billableSecondsSnapshot: 300,
          customer: null,
          assignedEmployee: null
        }
      ])
    ]);

    const tables = await prismaTableRepository.findBoardTables("biz-1");
    expect(tables[0].currentSession).toMatchObject({
      customerName: null,
      assignedStaffName: null,
      billEstimate: 300
    });
  });

  it("sets currentSession to null when a table has no active session", async () => {
    mockDb.clubTable.findMany.mockResolvedValue([tableRow([])]);
    const tables = await prismaTableRepository.findBoardTables("biz-1");
    expect(tables[0].currentSession).toBeNull();
  });
});

describe("prismaTableRepository.findByIdForUpdate / updateStatus", () => {
  it("finds a table by id scoped to the business", async () => {
    const row = {
      id: "table-1",
      businessId: "biz-1",
      number: "5",
      gameType: "POOL",
      status: "AVAILABLE",
      pricingGroup: "peak"
    };
    mockDb.clubTable.findFirst.mockResolvedValue(row);

    const result = await prismaTableRepository.findByIdForUpdate({
      businessId: "biz-1",
      tableId: "table-1",
      tx: TX
    });

    expect(result).toEqual(row);
    expect(mockDb.clubTable.findFirst).toHaveBeenCalledWith({
      where: { id: "table-1", businessId: "biz-1" },
      select: expect.objectContaining({ id: true, status: true, pricingGroup: true })
    });
  });

  it("returns null when the table is not found", async () => {
    mockDb.clubTable.findFirst.mockResolvedValue(null);
    const result = await prismaTableRepository.findByIdForUpdate({
      businessId: "biz-1",
      tableId: "nope",
      tx: TX
    });
    expect(result).toBeNull();
  });

  it("updates status with an optimistic-concurrency version increment", async () => {
    await prismaTableRepository.updateStatus({
      businessId: "biz-1",
      tableId: "table-1",
      status: "OCCUPIED",
      tx: TX
    });
    expect(mockDb.clubTable.update).toHaveBeenCalledWith({
      where: { id: "table-1", businessId: "biz-1" },
      data: { status: "OCCUPIED", version: { increment: 1 } }
    });
  });
});

describe("prismaSessionRepository", () => {
  const sessionRow = (overrides: Record<string, unknown> = {}) => ({
    id: "session-1",
    businessId: "biz-1",
    tableId: "table-1",
    status: "ACTIVE",
    startedAt: new Date("2026-08-17T10:00:00Z"),
    plannedEndAt: new Date("2026-08-17T11:00:00Z"),
    ps5MemberCount: null,
    hourlyRateSnapshot: new Prisma.Decimal("350"),
    ...overrides
  });

  describe("createWalkInSession", () => {
    it("creates the session mapping optional inputs to defaults", async () => {
      mockDb.session.create.mockResolvedValue({ id: "session-new" });

      const result = await prismaSessionRepository.createWalkInSession({
        businessId: "biz-1",
        employeeId: "emp-1",
        tableId: "table-1",
        hourlyRateSnapshot: 350,
        startedAt: new Date("2026-08-17T10:00:00Z"),
        plannedEndAt: new Date("2026-08-17T11:00:00Z"),
        tx: TX
      });

      expect(result).toEqual({ sessionId: "session-new" });
      expect(mockDb.session.create).toHaveBeenCalledWith({
        data: {
          businessId: "biz-1",
          tableId: "table-1",
          customerId: null,
          assignedEmployeeId: "emp-1", // defaults to employeeId
          createdByEmployeeId: "emp-1",
          ps5MemberCount: null,
          hourlyRateSnapshot: 350,
          startedAt: new Date("2026-08-17T10:00:00Z"),
          plannedEndAt: new Date("2026-08-17T11:00:00Z")
        },
        select: { id: true }
      });
    });

    it("passes explicit customer/assignee/ps5 member count through", async () => {
      mockDb.session.create.mockResolvedValue({ id: "session-new" });

      await prismaSessionRepository.createWalkInSession({
        businessId: "biz-1",
        employeeId: "emp-1",
        tableId: "table-1",
        customerId: "cust-1",
        assignedEmployeeId: "emp-2",
        ps5MemberCount: 3,
        hourlyRateSnapshot: 400,
        startedAt: new Date("2026-08-17T10:00:00Z"),
        plannedEndAt: new Date("2026-08-17T11:00:00Z"),
        tx: TX
      });

      expect(mockDb.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: "cust-1",
            assignedEmployeeId: "emp-2",
            ps5MemberCount: 3
          })
        })
      );
    });
  });

  describe("findActiveByTable / findByIdForUpdate", () => {
    it("converts the Decimal hourly rate snapshot to a number", async () => {
      mockDb.session.findFirst.mockResolvedValue(sessionRow({ ps5MemberCount: 2 }));
      const session = await prismaSessionRepository.findActiveByTable({
        businessId: "biz-1",
        tableId: "table-1",
        tx: TX
      });
      expect(session).toEqual({
        id: "session-1",
        businessId: "biz-1",
        tableId: "table-1",
        status: "ACTIVE",
        startedAt: new Date("2026-08-17T10:00:00Z"),
        plannedEndAt: new Date("2026-08-17T11:00:00Z"),
        ps5MemberCount: 2,
        hourlyRateSnapshot: 350
      });
    });

    it("returns null when no active session exists", async () => {
      mockDb.session.findFirst.mockResolvedValue(null);
      expect(
        await prismaSessionRepository.findActiveByTable({ businessId: "biz-1", tableId: "table-1", tx: TX })
      ).toBeNull();
    });

    it("scopes findByIdForUpdate to the business", async () => {
      mockDb.session.findFirst.mockResolvedValue(sessionRow());
      await prismaSessionRepository.findByIdForUpdate({
        businessId: "biz-1",
        sessionId: "session-1",
        tx: TX
      });
      expect(mockDb.session.findFirst).toHaveBeenCalledWith({
        where: { id: "session-1", businessId: "biz-1" },
        select: expect.objectContaining({ hourlyRateSnapshot: true })
      });
    });
  });

  describe("findConflicts", () => {
    it("merges overlapping bookings and sessions with their kind", async () => {
      mockDb.booking.findMany.mockResolvedValue([
        { id: "booking-1", startsAt: new Date("2026-08-17T10:00:00Z"), endsAt: new Date("2026-08-17T11:00:00Z") }
      ]);
      mockDb.session.findMany.mockResolvedValue([
        { id: "session-1", startedAt: new Date("2026-08-17T10:30:00Z"), plannedEndAt: new Date("2026-08-17T11:30:00Z") }
      ]);

      const conflicts = await prismaSessionRepository.findConflicts({
        businessId: "biz-1",
        tableId: "table-1",
        startsAt: new Date("2026-08-17T10:00:00Z"),
        endsAt: new Date("2026-08-17T12:00:00Z"),
        tx: TX
      });

      expect(mockDb.booking.findMany).toHaveBeenCalledWith({
        where: {
          businessId: "biz-1",
          tableId: "table-1",
          status: { in: ["CONFIRMED", "CHECKED_IN", "PLAYING"] },
          startsAt: { lt: new Date("2026-08-17T12:00:00Z") },
          endsAt: { gt: new Date("2026-08-17T10:00:00Z") }
        },
        select: { id: true, startsAt: true, endsAt: true }
      });
      expect(conflicts).toEqual([
        { id: "booking-1", kind: "booking", startsAt: new Date("2026-08-17T10:00:00Z"), endsAt: new Date("2026-08-17T11:00:00Z") },
        { id: "session-1", kind: "session", startsAt: new Date("2026-08-17T10:30:00Z"), endsAt: new Date("2026-08-17T11:30:00Z") }
      ]);
    });

    it("returns an empty list when nothing overlaps", async () => {
      mockDb.booking.findMany.mockResolvedValue([]);
      mockDb.session.findMany.mockResolvedValue([]);
      const conflicts = await prismaSessionRepository.findConflicts({
        businessId: "biz-1",
        tableId: "table-1",
        startsAt: new Date("2026-08-17T10:00:00Z"),
        endsAt: new Date("2026-08-17T11:00:00Z"),
        tx: TX
      });
      expect(conflicts).toEqual([]);
    });
  });

  describe("updateStatus / extend / end", () => {
    it("updates status with pausedAt and a version increment", async () => {
      const pausedAt = new Date("2026-08-17T10:15:00Z");
      await prismaSessionRepository.updateStatus({
        businessId: "biz-1",
        sessionId: "session-1",
        status: "PAUSED",
        pausedAt,
        tx: TX
      });
      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: "session-1", businessId: "biz-1" },
        data: { status: "PAUSED", pausedAt, version: { increment: 1 } }
      });
    });

    it("resumes without pausedAt", async () => {
      await prismaSessionRepository.updateStatus({
        businessId: "biz-1",
        sessionId: "session-1",
        status: "ACTIVE",
        tx: TX
      });
      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: "session-1", businessId: "biz-1" },
        data: { status: "ACTIVE", pausedAt: undefined, version: { increment: 1 } }
      });
    });

    it("extends with a nested extension record", async () => {
      const previousPlannedEndAt = new Date("2026-08-17T11:00:00Z");
      const newPlannedEndAt = new Date("2026-08-17T12:00:00Z");
      await prismaSessionRepository.extend({
        sessionId: "session-1",
        previousPlannedEndAt,
        newPlannedEndAt,
        addedMinutes: 60,
        tx: TX
      });
      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: {
          plannedEndAt: newPlannedEndAt,
          version: { increment: 1 },
          extensions: { create: { previousPlannedEndAt, newPlannedEndAt, addedMinutes: 60 } }
        }
      });
    });

    it("ends with COMPLETED status and a billable seconds snapshot", async () => {
      const actualEndAt = new Date("2026-08-17T12:30:00Z");
      await prismaSessionRepository.end({
        businessId: "biz-1",
        sessionId: "session-1",
        actualEndAt,
        billableSeconds: 8100,
        tx: TX
      });
      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: "session-1", businessId: "biz-1" },
        data: {
          status: "COMPLETED",
          actualEndAt,
          billableSecondsSnapshot: 8100,
          version: { increment: 1 }
        }
      });
    });
  });
});

describe("prismaAuditLogRepository.record", () => {
  it("creates an audit log entry with metadata", async () => {
    await prismaAuditLogRepository.record({
      businessId: "biz-1",
      employeeId: "emp-1",
      action: "session.started",
      entityType: "Session",
      entityId: "session-1",
      metadata: { tableNumber: "5" },
      tx: TX
    });

    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz-1",
        employeeId: "emp-1",
        action: "session.started",
        entityType: "Session",
        entityId: "session-1",
        metadata: { tableNumber: "5" }
      }
    });
  });
});

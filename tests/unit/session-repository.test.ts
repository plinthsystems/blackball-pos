import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Prisma, SessionStatus } from "@prisma/client";
import { prismaSessionRepository } from "@/server/repositories/session-repository";

const mockSessionCreate = vi.fn();
const mockSessionFindFirst = vi.fn();
const mockSessionUpdate = vi.fn();
const mockSessionFindMany = vi.fn();
const mockBookingFindMany = vi.fn();

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    session: {
      create: mockSessionCreate,
      findFirst: mockSessionFindFirst,
      update: mockSessionUpdate,
      findMany: mockSessionFindMany
    },
    booking: {
      findMany: mockBookingFindMany
    }
  }
}));

const { prisma } = await import("@/server/db/prisma");

function makeTx() {
  return {
    session: {
      create: prisma.session.create,
      findFirst: prisma.session.findFirst,
      update: prisma.session.update,
      findMany: prisma.session.findMany
    },
    booking: {
      findMany: prisma.booking.findMany
    }
  } as unknown as Prisma.TransactionClient;
}

describe("prismaSessionRepository.createWalkInSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session with all required fields", async () => {
    const mockSession = { id: "session_1" };
    mockSessionCreate.mockResolvedValue(mockSession);

    const tx = makeTx();
    const now = new Date("2026-01-01T10:00:00Z");
    const plannedEnd = new Date("2026-01-01T11:00:00Z");

    const result = await prismaSessionRepository.createWalkInSession({
      businessId: "biz_1",
      employeeId: "emp_1",
      tableId: "table_1",
      hourlyRateSnapshot: 180,
      startedAt: now,
      plannedEndAt: plannedEnd,
      tx
    });

    expect(mockSessionCreate).toHaveBeenCalledWith({
      data: {
        businessId: "biz_1",
        tableId: "table_1",
        customerId: null,
        assignedEmployeeId: "emp_1",
        createdByEmployeeId: "emp_1",
        ps5MemberCount: null,
        hourlyRateSnapshot: 180,
        startedAt: now,
        plannedEndAt: plannedEnd
      },
      select: { id: true }
    });

    expect(result).toEqual({ sessionId: "session_1" });
  });

  it("sets customerId when provided", async () => {
    mockSessionCreate.mockResolvedValue({ id: "session_1" });

    const tx = makeTx();
    const now = new Date("2026-01-01T10:00:00Z");
    const plannedEnd = new Date("2026-01-01T11:00:00Z");

    await prismaSessionRepository.createWalkInSession({
      businessId: "biz_1",
      employeeId: "emp_1",
      tableId: "table_1",
      customerId: "cust_1",
      hourlyRateSnapshot: 100,
      startedAt: now,
      plannedEndAt: plannedEnd,
      tx
    });

    const callData = mockSessionCreate.mock.calls[0][0].data as { customerId: string | null };
    expect(callData.customerId).toBe("cust_1");
  });

  it("sets assignedEmployeeId from input when provided", async () => {
    mockSessionCreate.mockResolvedValue({ id: "session_1" });

    const tx = makeTx();
    const now = new Date("2026-01-01T10:00:00Z");
    const plannedEnd = new Date("2026-01-01T11:00:00Z");

    await prismaSessionRepository.createWalkInSession({
      businessId: "biz_1",
      employeeId: "emp_1",
      tableId: "table_1",
      assignedEmployeeId: "emp_2",
      hourlyRateSnapshot: 180,
      startedAt: now,
      plannedEndAt: plannedEnd,
      tx
    });

    const callData = mockSessionCreate.mock.calls[0][0].data as { assignedEmployeeId: string };
    expect(callData.assignedEmployeeId).toBe("emp_2");
  });

  it("sets ps5MemberCount when provided", async () => {
    mockSessionCreate.mockResolvedValue({ id: "session_1" });

    const tx = makeTx();
    const now = new Date("2026-01-01T10:00:00Z");
    const plannedEnd = new Date("2026-01-01T11:00:00Z");

    await prismaSessionRepository.createWalkInSession({
      businessId: "biz_1",
      employeeId: "emp_1",
      tableId: "table_1",
      ps5MemberCount: 3,
      hourlyRateSnapshot: 200,
      startedAt: now,
      plannedEndAt: plannedEnd,
      tx
    });

    const callData = mockSessionCreate.mock.calls[0][0].data as { ps5MemberCount: number | null };
    expect(callData.ps5MemberCount).toBe(3);
  });

  it("uses employeeId as assignedEmployeeId when not provided", async () => {
    mockSessionCreate.mockResolvedValue({ id: "session_1" });

    const tx = makeTx();
    const now = new Date("2026-01-01T10:00:00Z");
    const plannedEnd = new Date("2026-01-01T11:00:00Z");

    await prismaSessionRepository.createWalkInSession({
      businessId: "biz_1",
      employeeId: "emp_3",
      tableId: "table_1",
      hourlyRateSnapshot: 180,
      startedAt: now,
      plannedEndAt: plannedEnd,
      tx
    });

    const callData = mockSessionCreate.mock.calls[0][0].data as { assignedEmployeeId: string; createdByEmployeeId: string };
    expect(callData.assignedEmployeeId).toBe("emp_3");
    expect(callData.createdByEmployeeId).toBe("emp_3");
  });
});

describe("prismaSessionRepository.findActiveByTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active session for a table", async () => {
    mockSessionFindFirst.mockResolvedValue({
      id: "session_1",
      businessId: "biz_1",
      tableId: "table_1",
      status: "ACTIVE" as SessionStatus,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      plannedEndAt: new Date("2026-01-01T11:00:00Z"),
      ps5MemberCount: null,
      hourlyRateSnapshot: BigInt(180)
    });

    const tx = makeTx();
    const result = await prismaSessionRepository.findActiveByTable({
      businessId: "biz_1",
      tableId: "table_1",
      tx
    });

    expect(result).toEqual({
      id: "session_1",
      businessId: "biz_1",
      tableId: "table_1",
      status: "ACTIVE",
      startedAt: expect.any(Date),
      plannedEndAt: expect.any(Date),
      ps5MemberCount: null,
      hourlyRateSnapshot: 180
    });
  });

  it("returns paused session for a table", async () => {
    mockSessionFindFirst.mockResolvedValue({
      id: "session_2",
      businessId: "biz_1",
      tableId: "table_1",
      status: "PAUSED" as SessionStatus,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      plannedEndAt: new Date("2026-01-01T11:00:00Z"),
      ps5MemberCount: null,
      hourlyRateSnapshot: BigInt(200)
    });

    const tx = makeTx();
    const result = await prismaSessionRepository.findActiveByTable({
      businessId: "biz_1",
      tableId: "table_1",
      tx
    });

    expect(result?.status).toBe("PAUSED");
  });

  it("returns null when no active session exists", async () => {
    mockSessionFindFirst.mockResolvedValue(null);

    const tx = makeTx();
    const result = await prismaSessionRepository.findActiveByTable({
      businessId: "biz_1",
      tableId: "table_999",
      tx
    });

    expect(result).toBeNull();
  });

  it("excludes COMPLETED sessions", async () => {
    mockSessionFindFirst.mockResolvedValue({
      id: "session_completed",
      businessId: "biz_1",
      tableId: "table_1",
      status: "COMPLETED" as SessionStatus,
      startedAt: new Date("2026-01-01T09:00:00Z"),
      plannedEndAt: new Date("2026-01-01T10:00:00Z"),
      ps5MemberCount: null,
      hourlyRateSnapshot: BigInt(180)
    });

    const tx = makeTx();
    const result = await prismaSessionRepository.findActiveByTable({
      businessId: "biz_1",
      tableId: "table_1",
      tx
    });

    expect(mockSessionFindFirst).toHaveBeenCalledWith({
      where: { businessId: "biz_1", tableId: "table_1", status: { in: ["ACTIVE", "PAUSED"] } },
      select: expect.any(Object)
    });
  });

  it("converts hourlyRateSnapshot to number", async () => {
    mockSessionFindFirst.mockResolvedValue({
      id: "session_1",
      businessId: "biz_1",
      tableId: "table_1",
      status: "ACTIVE" as SessionStatus,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      plannedEndAt: new Date("2026-01-01T11:00:00Z"),
      ps5MemberCount: null,
      hourlyRateSnapshot: BigInt(180)
    });

    const tx = makeTx();
    const result = await prismaSessionRepository.findActiveByTable({
      businessId: "biz_1",
      tableId: "table_1",
      tx
    });

    expect(result?.hourlyRateSnapshot).toBe(180);
    expect(typeof result?.hourlyRateSnapshot).toBe("number");
  });
});

describe("prismaSessionRepository.findByIdForUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session when found", async () => {
    mockSessionFindFirst.mockResolvedValue({
      id: "session_1",
      businessId: "biz_1",
      tableId: "table_1",
      status: "ACTIVE" as SessionStatus,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      plannedEndAt: new Date("2026-01-01T11:00:00Z"),
      ps5MemberCount: null,
      hourlyRateSnapshot: BigInt(180)
    });

    const tx = makeTx();
    const result = await prismaSessionRepository.findByIdForUpdate({
      businessId: "biz_1",
      sessionId: "session_1",
      tx
    });

    expect(result?.id).toBe("session_1");
    expect(result?.businessId).toBe("biz_1");
  });

  it("returns null when session not found", async () => {
    mockSessionFindFirst.mockResolvedValue(null);

    const tx = makeTx();
    const result = await prismaSessionRepository.findByIdForUpdate({
      businessId: "biz_1",
      sessionId: "nonexistent",
      tx
    });

    expect(result).toBeNull();
  });

  it("returns null when session belongs to different business", async () => {
    mockSessionFindFirst.mockResolvedValue(null);

    const tx = makeTx();
    const result = await prismaSessionRepository.findByIdForUpdate({
      businessId: "biz_2",
      sessionId: "session_1",
      tx
    });

    expect(result).toBeNull();
  });
});

describe("prismaSessionRepository.findConflicts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no conflicts exist", async () => {
    mockBookingFindMany.mockResolvedValue([]);
    mockSessionFindMany.mockResolvedValue([]);

    const tx = makeTx();
    const result = await prismaSessionRepository.findConflicts({
      businessId: "biz_1",
      tableId: "table_1",
      startsAt: new Date("2026-01-01T12:00:00Z"),
      endsAt: new Date("2026-01-01T13:00:00Z"),
      tx
    });

    expect(result).toEqual([]);
  });

  it("returns conflicting bookings", async () => {
    const mockBookings = [
      { id: "booking_1", startsAt: new Date("2026-01-01T11:00:00Z"), endsAt: new Date("2026-01-01T12:30:00Z") }
    ];
    mockBookingFindMany.mockResolvedValue(mockBookings);
    mockSessionFindMany.mockResolvedValue([]);

    const tx = makeTx();
    const result = await prismaSessionRepository.findConflicts({
      businessId: "biz_1",
      tableId: "table_1",
      startsAt: new Date("2026-01-01T12:00:00Z"),
      endsAt: new Date("2026-01-01T13:00:00Z"),
      tx
    });

    expect(result).toEqual([
      {
        id: "booking_1",
        kind: "booking",
        startsAt: expect.any(Date),
        endsAt: expect.any(Date)
      }
    ]);
  });

  it("returns conflicting sessions", async () => {
    mockBookingFindMany.mockResolvedValue([]);
    const mockSessions = [
      { id: "session_1", startedAt: new Date("2026-01-01T11:00:00Z"), plannedEndAt: new Date("2026-01-01T12:30:00Z") }
    ];
    mockSessionFindMany.mockResolvedValue(mockSessions);

    const tx = makeTx();
    const result = await prismaSessionRepository.findConflicts({
      businessId: "biz_1",
      tableId: "table_1",
      startsAt: new Date("2026-01-01T12:00:00Z"),
      endsAt: new Date("2026-01-01T13:00:00Z"),
      tx
    });

    expect(result.some((r) => r.kind === "session")).toBe(true);
  });

  it("queries with correct businessId and tableId", async () => {
    mockBookingFindMany.mockResolvedValue([]);
    mockSessionFindMany.mockResolvedValue([]);

    const tx = makeTx();
    await prismaSessionRepository.findConflicts({
      businessId: "biz_999",
      tableId: "table_42",
      startsAt: new Date("2026-01-01T12:00:00Z"),
      endsAt: new Date("2026-01-01T13:00:00Z"),
      tx
    });

    expect(mockBookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: "biz_999",
          tableId: "table_42"
        })
      })
    );
  });
});

describe("prismaSessionRepository.updateStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates session status", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    await prismaSessionRepository.updateStatus({
      businessId: "biz_1",
      sessionId: "session_1",
      status: "PAUSED" as SessionStatus,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith({
      where: { id: "session_1", businessId: "biz_1" },
      data: { status: "PAUSED", version: { increment: 1 } }
    });
  });

  it("sets pausedAt when provided", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    const pausedAt = new Date("2026-01-01T10:30:00Z");

    await prismaSessionRepository.updateStatus({
      businessId: "biz_1",
      sessionId: "session_1",
      status: "PAUSED" as SessionStatus,
      pausedAt,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith({
      where: { id: "session_1", businessId: "biz_1" },
      data: { status: "PAUSED", pausedAt, version: { increment: 1 } }
    });
  });

  it("sets pausedAt to null when explicitly provided", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();

    await prismaSessionRepository.updateStatus({
      businessId: "biz_1",
      sessionId: "session_1",
      status: "ACTIVE" as SessionStatus,
      pausedAt: null,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith({
      where: { id: "session_1", businessId: "biz_1" },
      data: { status: "ACTIVE", pausedAt: null, version: { increment: 1 } }
    });
  });

  it("increments version on every status update", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    await prismaSessionRepository.updateStatus({
      businessId: "biz_1",
      sessionId: "session_1",
      status: "ACTIVE" as SessionStatus,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session_1", businessId: "biz_1" },
        data: expect.objectContaining({
          version: { increment: 1 }
        })
      })
    );
  });

  it("works with all session statuses", async () => {
    const tx = makeTx();
    const statuses: SessionStatus[] = ["ACTIVE", "PAUSED", "COMPLETED"];

    for (const status of statuses) {
      vi.clearAllMocks();
      mockSessionUpdate.mockResolvedValue({} as any);

      await prismaSessionRepository.updateStatus({
        businessId: "biz_1",
        sessionId: "session_1",
        status,
        tx
      });

      expect(mockSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "session_1", businessId: "biz_1" },
          data: expect.objectContaining({ status })
        })
      );
    }
  });
});

describe("prismaSessionRepository.extend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extends session and creates extension record", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    const previousEnd = new Date("2026-01-01T11:00:00Z");
    const newEnd = new Date("2026-01-01T12:00:00Z");

    await prismaSessionRepository.extend({
      sessionId: "session_1",
      previousPlannedEndAt: previousEnd,
      newPlannedEndAt: newEnd,
      addedMinutes: 60,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith({
      where: { id: "session_1" },
      data: {
        plannedEndAt: newEnd,
        version: { increment: 1 },
        extensions: {
          create: {
            previousPlannedEndAt: previousEnd,
            newPlannedEndAt: newEnd,
            addedMinutes: 60
          }
        }
      }
    });
  });

  it("handles 0 added minutes", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    const now = new Date("2026-01-01T11:00:00Z");

    await prismaSessionRepository.extend({
      sessionId: "session_1",
      previousPlannedEndAt: now,
      newPlannedEndAt: now,
      addedMinutes: 0,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session_1" },
        data: expect.objectContaining({
          extensions: {
            create: expect.objectContaining({ addedMinutes: 0 })
          }
        })
      })
    );
  });

  it("handles large extension", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    const previousEnd = new Date("2026-01-01T11:00:00Z");
    const newEnd = new Date("2026-01-02T11:00:00Z");

    await prismaSessionRepository.extend({
      sessionId: "session_1",
      previousPlannedEndAt: previousEnd,
      newPlannedEndAt: newEnd,
      addedMinutes: 1440,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session_1" },
        data: expect.objectContaining({
          extensions: {
            create: expect.objectContaining({ addedMinutes: 1440 })
          }
        })
      })
    );
  });
});

describe("prismaSessionRepository.end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ends session with actual end time and billable seconds", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    const actualEnd = new Date("2026-01-01T11:30:00Z");

    await prismaSessionRepository.end({
      businessId: "biz_1",
      sessionId: "session_1",
      actualEndAt: actualEnd,
      billableSeconds: 5400,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith({
      where: { id: "session_1", businessId: "biz_1" },
      data: {
        status: "COMPLETED",
        actualEndAt: actualEnd,
        billableSecondsSnapshot: 5400,
        version: { increment: 1 }
      }
    });
  });

  it("handles zero billable seconds", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    const actualEnd = new Date("2026-01-01T11:00:00Z");

    await prismaSessionRepository.end({
      businessId: "biz_1",
      sessionId: "session_1",
      actualEndAt: actualEnd,
      billableSeconds: 0,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session_1", businessId: "biz_1" },
        data: expect.objectContaining({
          billableSecondsSnapshot: 0
        })
      })
    );
  });

  it("handles large billable seconds", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    const actualEnd = new Date("2026-01-01T11:00:00Z");

    await prismaSessionRepository.end({
      businessId: "biz_1",
      sessionId: "session_1",
      actualEndAt: actualEnd,
      billableSeconds: 7200,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session_1", businessId: "biz_1" },
        data: expect.objectContaining({
          billableSecondsSnapshot: 7200
        })
      })
    );
  });

  it("verifies businessId in where clause", async () => {
    mockSessionUpdate.mockResolvedValue({} as any);

    const tx = makeTx();
    const actualEnd = new Date("2026-01-01T11:00:00Z");

    await prismaSessionRepository.end({
      businessId: "biz_999",
      sessionId: "session_1",
      actualEndAt: actualEnd,
      billableSeconds: 100,
      tx
    });

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session_1", businessId: "biz_999" }
      })
    );
  });
});
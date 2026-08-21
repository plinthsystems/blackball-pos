import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Prisma, TableStatus } from "@prisma/client";

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    clubTable: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      update: mockUpdate
    }
  }
}));

async function makeTx() {
  const { prisma } = await import("@/server/db/prisma");
  return {
    clubTable: {
      findFirst: prisma.clubTable.findFirst,
      update: prisma.clubTable.update
    }
  } as unknown as Prisma.TransactionClient;
}

describe("prismaTableRepository.findBoardTables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tables with current session data", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    const mockTables = [
      {
        id: "table_1",
        businessId: "biz_1",
        number: "P1",
        gameType: "POOL" as const,
        status: "OCCUPIED" as TableStatus,
        pricingGroup: "standard",
        sessions: [
          {
            id: "session_1",
            status: "ACTIVE" as const,
            customer: { name: "John Doe" },
            assignedEmployee: { name: "Staff One" },
            plannedEndAt: new Date("2026-01-01T11:00:00Z"),
            billableSecondsSnapshot: BigInt(3600)
          }
        ]
      }
    ];

    mockFindMany.mockResolvedValue(mockTables);

    const result = await prismaTableRepository.findBoardTables("biz_1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "table_1",
      businessId: "biz_1",
      number: "P1",
      gameType: "POOL",
      status: "OCCUPIED",
      pricingGroup: "standard",
      currentSession: {
        id: "session_1",
        status: "ACTIVE",
        customerName: "John Doe",
        plannedEndAt: expect.any(Date),
        billEstimate: 3600,
        assignedStaffName: "Staff One"
      }
    });
  });

  it("returns tables without current session", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    const mockTables = [
      {
        id: "table_2",
        businessId: "biz_1",
        number: "S1",
        gameType: "SNOOKER" as const,
        status: "AVAILABLE" as TableStatus,
        pricingGroup: "royal",
        sessions: []
      }
    ];

    mockFindMany.mockResolvedValue(mockTables);

    const result = await prismaTableRepository.findBoardTables("biz_1");

    expect(result).toHaveLength(1);
    expect(result[0].currentSession).toBeNull();
  });

  it("handles null customer and employee names", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    const mockTables = [
      {
        id: "table_3",
        businessId: "biz_1",
        number: "PS5 1",
        gameType: "PS5" as const,
        status: "OCCUPIED" as TableStatus,
        pricingGroup: "players-2",
        sessions: [
          {
            id: "session_2",
            status: "PAUSED" as const,
            customer: null,
            assignedEmployee: null,
            plannedEndAt: new Date("2026-01-01T12:00:00Z"),
            billableSecondsSnapshot: BigInt(1800)
          }
        ]
      }
    ];

    mockFindMany.mockResolvedValue(mockTables);

    const result = await prismaTableRepository.findBoardTables("biz_1");

    expect(result[0].currentSession?.customerName).toBeNull();
    expect(result[0].currentSession?.assignedStaffName).toBeNull();
  });

  it("converts billableSecondsSnapshot to number", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    const mockTables = [
      {
        id: "table_1",
        businessId: "biz_1",
        number: "P1",
        gameType: "POOL" as const,
        status: "OCCUPIED" as TableStatus,
        pricingGroup: "standard",
        sessions: [
          {
            id: "session_1",
            status: "ACTIVE" as const,
            customer: { name: "Test" },
            assignedEmployee: { name: "Staff" },
            plannedEndAt: new Date("2026-01-01T11:00:00Z"),
            billableSecondsSnapshot: BigInt(9999)
          }
        ]
      }
    ];

    mockFindMany.mockResolvedValue(mockTables);

    const result = await prismaTableRepository.findBoardTables("biz_1");

    expect(result[0].currentSession?.billEstimate).toBe(9999);
    expect(typeof result[0].currentSession?.billEstimate).toBe("number");
  });

  it("returns empty array when no tables exist", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockFindMany.mockResolvedValue([]);

    const result = await prismaTableRepository.findBoardTables("biz_empty");

    expect(result).toEqual([]);
  });

  it("orders tables by gameType asc then number asc", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockFindMany.mockResolvedValue([]);

    await prismaTableRepository.findBoardTables("biz_1");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { businessId: "biz_1" },
      orderBy: [{ gameType: "asc" }, { number: "asc" }],
      include: expect.any(Object)
    });
  });

  it("filters sessions to ACTIVE or PAUSED only", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockFindMany.mockResolvedValue([]);

    await prismaTableRepository.findBoardTables("biz_1");

    const includeArg = mockFindMany.mock.calls[0][0].include;
    expect(includeArg.sessions.where.status.in).toEqual(["ACTIVE", "PAUSED"]);
  });

  it("takes only the most recent session per table", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockFindMany.mockResolvedValue([]);

    await prismaTableRepository.findBoardTables("biz_1");

    const includeArg = mockFindMany.mock.calls[0][0].include;
    expect(includeArg.sessions.take).toBe(1);
    expect(includeArg.sessions.orderBy).toEqual({ startedAt: "desc" });
  });
});

describe("prismaTableRepository.findByIdForUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns table when found", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    const mockTable = {
      id: "table_1",
      businessId: "biz_1",
      number: "P1",
      gameType: "POOL" as const,
      status: "AVAILABLE" as TableStatus,
      pricingGroup: "standard"
    };

    mockFindFirst.mockResolvedValue(mockTable);

    const tx = await makeTx();
    const result = await prismaTableRepository.findByIdForUpdate({
      businessId: "biz_1",
      tableId: "table_1",
      tx
    });

    expect(result).toEqual(mockTable);
  });

  it("returns null when table not found", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockFindFirst.mockResolvedValue(null);

    const tx = await makeTx();
    const result = await prismaTableRepository.findByIdForUpdate({
      businessId: "biz_1",
      tableId: "nonexistent",
      tx
    });

    expect(result).toBeNull();
  });

  it("returns null when table belongs to different business", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockFindFirst.mockResolvedValue(null);

    const tx = await makeTx();
    const result = await prismaTableRepository.findByIdForUpdate({
      businessId: "biz_2",
      tableId: "table_1",
      tx
    });

    expect(result).toBeNull();
  });

  it("queries with correct where clause", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockFindFirst.mockResolvedValue(null);

    const tx = await makeTx();
    await prismaTableRepository.findByIdForUpdate({
      businessId: "biz_999",
      tableId: "table_42",
      tx
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "table_42", businessId: "biz_999" },
      select: {
        id: true,
        businessId: true,
        number: true,
        gameType: true,
        status: true,
        pricingGroup: true
      }
    });
  });

  it("handles all game types", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    const gameTypes: Array<"POOL" | "SNOOKER" | "PS5"> = ["POOL", "SNOOKER", "PS5"];

    for (const gameType of gameTypes) {
      vi.clearAllMocks();
      mockFindFirst.mockResolvedValue({
        id: "table_1",
        businessId: "biz_1",
        number: "T1",
        gameType,
        status: "AVAILABLE" as TableStatus,
        pricingGroup: "standard"
      });

      const tx = await makeTx();
      const result = await prismaTableRepository.findByIdForUpdate({
        businessId: "biz_1",
        tableId: "table_1",
        tx
      });

      expect(result?.gameType).toBe(gameType);
    }
  });
});

describe("prismaTableRepository.updateStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates table status", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockUpdate.mockResolvedValue({} as any);

    const tx = await makeTx();
    await prismaTableRepository.updateStatus({
      businessId: "biz_1",
      tableId: "table_1",
      status: "OCCUPIED" as TableStatus,
      tx
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "table_1", businessId: "biz_1" },
      data: { status: "OCCUPIED", version: { increment: 1 } }
    });
  });

  it("increments version on every status update", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockUpdate.mockResolvedValue({} as any);

    const tx = await makeTx();
    await prismaTableRepository.updateStatus({
      businessId: "biz_1",
      tableId: "table_1",
      status: "AVAILABLE" as TableStatus,
      tx
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "table_1", businessId: "biz_1" },
        data: expect.objectContaining({
          version: { increment: 1 }
        })
      })
    );
  });

  it("works with all table statuses", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    const tx = await makeTx();
    const statuses: TableStatus[] = [
      "AVAILABLE", "RESERVED", "OCCUPIED", "CLEANING", "MAINTENANCE", "BLOCKED"
    ];

    for (const status of statuses) {
      vi.clearAllMocks();
      mockUpdate.mockResolvedValue({} as any);

      await prismaTableRepository.updateStatus({
        businessId: "biz_1",
        tableId: "table_1",
        status,
        tx
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "table_1", businessId: "biz_1" },
          data: expect.objectContaining({ status })
        })
      );
    }
  });

  it("verifies businessId in where clause", async () => {
    const { prismaTableRepository } = await import("@/server/repositories/table-repository");

    mockUpdate.mockResolvedValue({} as any);

    const tx = await makeTx();
    await prismaTableRepository.updateStatus({
      businessId: "biz_999",
      tableId: "table_42",
      status: "MAINTENANCE" as TableStatus,
      tx
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "table_42", businessId: "biz_999" }
      })
    );
  });
});
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";
import { prismaAuditLogRepository } from "@/server/repositories/audit-log-repository";

const mockAuditLogCreate = vi.fn();

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    auditLog: {
      create: mockAuditLogCreate
    }
  }
}));

const { prisma } = await import("@/server/db/prisma");

describe("prismaAuditLogRepository.record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogCreate.mockResolvedValue({ id: "log_1" });
  });

  it("creates an audit log entry with all fields", async () => {
    const tx = { auditLog: { create: prisma.auditLog.create } } as Prisma.TransactionClient;

    await prismaAuditLogRepository.record({
      businessId: "biz_1",
      employeeId: "emp_1",
      action: "session.end",
      entityType: "session",
      entityId: "session_123",
      metadata: { billableSeconds: 3600, tableNumber: "P1" },
      tx
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz_1",
        employeeId: "emp_1",
        action: "session.end",
        entityType: "session",
        entityId: "session_123",
        metadata: { billableSeconds: 3600, tableNumber: "P1" }
      }
    });
  });

  it("handles empty metadata object", async () => {
    const tx = { auditLog: { create: prisma.auditLog.create } } as Prisma.TransactionClient;

    await prismaAuditLogRepository.record({
      businessId: "biz_1",
      employeeId: "emp_1",
      action: "table.status_change",
      entityType: "table",
      entityId: "table_456",
      metadata: {},
      tx
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz_1",
        employeeId: "emp_1",
        action: "table.status_change",
        entityType: "table",
        entityId: "table_456",
        metadata: {}
      }
    });
  });

  it("handles metadata with nested objects", async () => {
    const tx = { auditLog: { create: prisma.auditLog.create } } as Prisma.TransactionClient;

    const metadata = {
      previousStatus: "AVAILABLE",
      newStatus: "OCCUPIED",
      changedBy: "staff_app"
    };

    await prismaAuditLogRepository.record({
      businessId: "biz_2",
      employeeId: "emp_2",
      action: "table.update",
      entityType: "club_table",
      entityId: "table_789",
      metadata,
      tx
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz_2",
        employeeId: "emp_2",
        action: "table.update",
        entityType: "club_table",
        entityId: "table_789",
        metadata
      }
    });
  });

  it("calls create on the transaction client, not the global prisma", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: "log_1" });
    const tx = { auditLog: { create: mockCreate } } as unknown as Prisma.TransactionClient;

    await prismaAuditLogRepository.record({
      businessId: "biz_1",
      employeeId: "emp_1",
      action: "test",
      entityType: "test",
      entityId: "test",
      metadata: {},
      tx
    });

    expect(mockCreate).toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("handles long action strings", async () => {
    const tx = { auditLog: { create: prisma.auditLog.create } } as Prisma.TransactionClient;

    const longAction = "a".repeat(500);
    await prismaAuditLogRepository.record({
      businessId: "biz_1",
      employeeId: "emp_1",
      action: longAction,
      entityType: "test",
      entityId: "test",
      metadata: {},
      tx
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: longAction
        })
      })
    );
  });

  it("handles long entity IDs", async () => {
    const tx = { auditLog: { create: prisma.auditLog.create } } as Prisma.TransactionClient;

    const longEntityId = "e".repeat(100);
    await prismaAuditLogRepository.record({
      businessId: "biz_1",
      employeeId: "emp_1",
      action: "test",
      entityType: "test",
      entityId: longEntityId,
      metadata: {},
      tx
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityId: longEntityId
        })
      })
    );
  });
});
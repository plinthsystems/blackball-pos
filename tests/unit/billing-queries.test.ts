import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";

const mockBillFindMany = vi.fn();
const mockBillCount = vi.fn();
const mockEmployeeFindMany = vi.fn();
const mockTableFindMany = vi.fn();

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    bill: {
      findMany: mockBillFindMany,
      count: mockBillCount
    },
    employee: {
      findMany: mockEmployeeFindMany
    },
    clubTable: {
      findMany: mockTableFindMany
    }
  }
}));

const { prisma } = await import("@/server/db/prisma");
const { getBillingPageData } = await import("@/features/billing/queries");

describe("getBillingPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContext = {
    businessId: "biz_1",
    employeeId: "emp_1",
    employeeName: "Aarav Manager",
    employeeEmail: "aarav@test.com",
    accountType: "MANAGER" as const,
    permissions: ["billing.read", "bills.manage"],
    tenantBranding: { appName: "BB", logoInitials: "BB", businessName: "Test", brandColor: "#12613d", accentColor: "#b98922" },
    scope: { organizationId: null, franchiseeId: null, businessIds: ["biz_1"], selectedBusinessId: "biz_1" },
    mustChangePassword: false
  };

  it("returns billing records with full details", async () => {
    mockBillFindMany.mockResolvedValue([
      {
        id: "bill_1",
        label: "Bill 1",
        kind: "SESSION",
        status: "CLOSED",
        openedAt: new Date("2026-01-15T10:00:00Z"),
        closedAt: new Date("2026-01-15T11:30:00Z"),
        tableAmountSnapshot: 175,
        itemTotalAmountSnapshot: 140,
        totalAmountSnapshot: 315,
        items: [
          { id: "item_1", nameSnapshot: "Tea", category: "FOOD", quantity: 2, unitPriceAmount: 30, lineTotalAmount: 60 },
          { id: "item_2", nameSnapshot: "Water Bottle", category: "BEVERAGES", quantity: 2, unitPriceAmount: 20, lineTotalAmount: 40 }
        ],
        session: {
          table: { number: "P1" },
          customer: { name: "Riya Shah", phone: "9876543210" },
          assignedEmployee: { name: "Aarav Manager" },
          startedAt: new Date("2026-01-15T10:00:00Z"),
          actualEndAt: new Date("2026-01-15T11:30:00Z"),
          plannedEndAt: new Date("2026-01-15T11:00:00Z"),
          status: "COMPLETED"
        }
      }
    ]);
    mockBillCount.mockResolvedValue(1);
    mockEmployeeFindMany.mockResolvedValue([]);
    mockTableFindMany.mockResolvedValue([]);

    const result = await getBillingPageData("biz_1", {}, mockContext);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe("bill_1");
    expect(result.records[0].totalAmount).toBe(315);
    expect(result.records[0].tableAmount).toBe(175);
    expect(result.records[0].itemTotal).toBe(140);
    expect(result.records[0].tableNumber).toBe("P1");
    expect(result.records[0].customerName).toBe("Riya Shah");
    expect(result.records[0].assignedStaffName).toBe("Aarav Manager");
    expect(result.records[0].items).toHaveLength(2);
    expect(result.records[0].items[0].name).toBe("Tea");
    expect(result.records[0].items[0].lineTotal).toBe(60);
    expect(result.total).toBe(1);
  });

  it("filters by status when provided", async () => {
    mockBillFindMany.mockResolvedValue([]);
    mockBillCount.mockResolvedValue(0);
    mockEmployeeFindMany.mockResolvedValue([]);
    mockTableFindMany.mockResolvedValue([]);

    await getBillingPageData("biz_1", { status: "OPEN" }, mockContext);

    expect(mockBillFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "OPEN" })
      })
    );
  });

  it("filters by kind when provided", async () => {
    mockBillFindMany.mockResolvedValue([]);
    mockBillCount.mockResolvedValue(0);
    mockEmployeeFindMany.mockResolvedValue([]);
    mockTableFindMany.mockResolvedValue([]);

    await getBillingPageData("biz_1", { kind: "COUNTER" }, mockContext);

    expect(mockBillFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ kind: "COUNTER" })
      })
    );
  });

  it("filters by category", async () => {
    mockBillFindMany.mockResolvedValue([]);
    mockBillCount.mockResolvedValue(0);
    mockEmployeeFindMany.mockResolvedValue([]);
    mockTableFindMany.mockResolvedValue([]);

    await getBillingPageData("biz_1", { category: "FOOD" }, mockContext);

    expect(mockBillFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          items: { some: { category: "FOOD" } }
        })
      })
    );
  });

  it("filters by date range", async () => {
    mockBillFindMany.mockResolvedValue([]);
    mockBillCount.mockResolvedValue(0);
    mockEmployeeFindMany.mockResolvedValue([]);
    mockTableFindMany.mockResolvedValue([]);

    await getBillingPageData("biz_1", { dateFrom: "2026-01-01", dateTo: "2026-01-31" }, mockContext);

    expect(mockBillFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          openedAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date)
          })
        })
      })
    );
  });

  it("restricts STORE_USER to their own closed bills only", async () => {
    mockBillFindMany.mockResolvedValue([]);
    mockBillCount.mockResolvedValue(0);
    mockEmployeeFindMany.mockResolvedValue([]);
    mockTableFindMany.mockResolvedValue([]);

    const userContext = {
      ...mockContext,
      accountType: "STORE_USER" as const,
      employeeId: "user_emp"
    };

    await getBillingPageData("biz_1", {}, userContext);

    expect(mockBillFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "CLOSED",
          session: {
            some: { assignedEmployeeId: "user_emp" }
          }
        })
      })
    );
  });

  it("returns staff and table options for filters", async () => {
    mockBillFindMany.mockResolvedValue([]);
    mockBillCount.mockResolvedValue(0);
    mockEmployeeFindMany.mockResolvedValue([
      { id: "emp_1", name: "Aarav" },
      { id: "emp_2", name: "Riya" }
    ]);
    mockTableFindMany.mockResolvedValue([
      { id: "tbl_1", number: "P1" },
      { id: "tbl_2", number: "S1" }
    ]);

    const result = await getBillingPageData("biz_1", {}, mockContext);

    expect(result.staffOptions).toEqual([
      { id: "emp_1", name: "Aarav" },
      { id: "emp_2", name: "Riya" }
    ]);
    expect(result.tables).toEqual([
      { id: "tbl_1", number: "P1" },
      { id: "tbl_2", number: "S1" }
    ]);
  });

  it("paginates results with skip and take", async () => {
    mockBillFindMany.mockResolvedValue([]);
    mockBillCount.mockResolvedValue(100);
    mockEmployeeFindMany.mockResolvedValue([]);
    mockTableFindMany.mockResolvedValue([]);

    await getBillingPageData("biz_1", { page: 2, pageSize: 10 }, mockContext);

    expect(mockBillFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10
      })
    );
  });
});
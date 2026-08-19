import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addBillItemAction,
  addSessionItemAction,
  closeBillAndContinueSessionAction,
  closeCounterBillAction,
  endSessionAction,
  extendSessionAction,
  removeBillItemAction,
  startCounterBillAction,
  startWalkInSessionAction,
  updateTableStatusAction
} from "@/features/live-tables/actions";
import { DomainError } from "@/server/domain/errors";
import { makeEmployeeContext } from "./support/employee-context";

const mocks = vi.hoisted(() => {
  const model = (): Record<string, ReturnType<typeof vi.fn>> => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn()
  });
  const sessionService = {
    startWalkInSession: vi.fn(),
    extendSession: vi.fn(),
    endSession: vi.fn()
  };
  const tableService = { updateOperationalStatus: vi.fn() };
  return {
    prisma: {
      $transaction: vi.fn(),
      $queryRaw: vi.fn(),
      clubTable: model(),
      tablePricing: model(),
      bill: model(),
      billItem: model(),
      product: model(),
      session: model(),
      business: model()
    },
    context: vi.fn(),
    revalidatePath: vi.fn(),
    SessionService: vi.fn(() => sessionService),
    TableService: vi.fn(() => tableService),
    sessionService,
    tableService,
    sendManualBookingShareMessage: vi.fn(),
    getBookingPageUrl: vi.fn(),
    getBookingQrPngUrl: vi.fn()
  };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/server/auth/current-employee", () => ({ getCurrentEmployeeContext: mocks.context }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/services/session-service", () => ({
  SessionService: mocks.SessionService
}));
vi.mock("@/server/services/table-service", () => ({
  TableService: mocks.TableService
}));
vi.mock("@/server/integrations/whatsapp", () => ({
  sendManualBookingShareMessage: mocks.sendManualBookingShareMessage
}));

function txThrough() {
  mocks.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback(mocks.prisma)
  );
}

describe("startWalkInSessionAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.sessionService.startWalkInSession.mockReset();
    mocks.sessionService.startWalkInSession.mockResolvedValue({ sessionId: "s1" });
    mocks.prisma.clubTable.findFirst.mockReset();
    mocks.prisma.tablePricing.findUnique.mockReset();
    mocks.prisma.bill.create.mockReset();
    mocks.prisma.business.findUnique.mockReset();
    mocks.sendManualBookingShareMessage.mockReset();
    mocks.sendManualBookingShareMessage.mockResolvedValue(true);
  });

  it("starts a session with the table's hourly rate and opens the first bill", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ gameType: "POOL", pricingGroup: "standard" });
    mocks.prisma.tablePricing.findUnique.mockResolvedValue({ priceAmount: 180 });

    const result = await startWalkInSessionAction({
      tableId: "t1",
      durationMinutes: 60,
      assignedEmployeeId: "emp-2"
    });

    expect(result).toEqual({ ok: true, message: "Session started." });
    expect(mocks.sessionService.startWalkInSession).toHaveBeenCalledWith({
      businessId: "biz-1",
      employeeId: "emp-1",
      tableId: "t1",
      durationMinutes: 60,
      ps5MemberCount: null,
      hourlyRateSnapshot: 180,
      assignedEmployeeId: "emp-2",
      now: expect.any(Date)
    });
    expect(mocks.prisma.bill.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz-1",
        sessionId: "s1",
        kind: "SESSION",
        status: "OPEN",
        label: "Bill 1"
      }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
  });

  it("resolves the PS5 pricing group from the member count", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ gameType: "PS5", pricingGroup: "players-1" });
    mocks.prisma.tablePricing.findUnique.mockResolvedValue({ priceAmount: 150 });

    await startWalkInSessionAction({ tableId: "t1", durationMinutes: 30, ps5MemberCount: 2 });

    expect(mocks.prisma.tablePricing.findUnique).toHaveBeenCalledWith({
      where: {
        businessId_gameType_pricingGroup_durationMinutes: {
          businessId: "biz-1",
          gameType: "PS5",
          pricingGroup: "players-2",
          durationMinutes: 60
        }
      },
      select: { priceAmount: true }
    });
    expect(mocks.sessionService.startWalkInSession).toHaveBeenCalledWith(
      expect.objectContaining({ ps5MemberCount: 2, hourlyRateSnapshot: 150 })
    );
  });

  it("shares a booking link when a customer phone is provided (best-effort)", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ gameType: "POOL", pricingGroup: "standard" });
    mocks.prisma.tablePricing.findUnique.mockResolvedValue({ priceAmount: 180 });
    mocks.prisma.business.findUnique.mockResolvedValue({ slug: "cue-club", name: "Cue Club" });

    await startWalkInSessionAction({
      tableId: "t1",
      durationMinutes: 60,
      customerPhone: "+919876543210"
    });

    await vi.waitFor(() => {
      expect(mocks.sendManualBookingShareMessage).toHaveBeenCalledWith(
        "+919876543210",
        "Cue Club",
        expect.objectContaining({ bookingLink: expect.stringContaining("cue-club") })
      );
    });
  });

  it("treats an unknown table as TABLE_NOT_AVAILABLE", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue(null);

    const result = await startWalkInSessionAction({ tableId: "t1", durationMinutes: 60 });

    expect(result).toEqual({
      ok: false,
      message: "This table is not available for a new session."
    });
    expect(mocks.sessionService.startWalkInSession).not.toHaveBeenCalled();
  });

  it("treats a missing hourly rate as PRICING_NOT_FOUND", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ gameType: "POOL", pricingGroup: "standard" });
    mocks.prisma.tablePricing.findUnique.mockResolvedValue(null);

    const result = await startWalkInSessionAction({ tableId: "t1", durationMinutes: 60 });

    expect(result).toEqual({ ok: false, message: "Hourly rate was not found for this station." });
  });

  it("maps a DomainError from the session service to ok:false", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ gameType: "POOL", pricingGroup: "standard" });
    mocks.prisma.tablePricing.findUnique.mockResolvedValue({ priceAmount: 180 });
    mocks.sessionService.startWalkInSession.mockRejectedValueOnce(
      new DomainError("TABLE_NOT_AVAILABLE", "Table is already occupied.")
    );

    const result = await startWalkInSessionAction({ tableId: "t1", durationMinutes: 60 });

    expect(result).toEqual({ ok: false, message: "Table is already occupied." });
  });

  it("rejects invalid input (invalid duration) with a generic failure", async () => {
    const result = await startWalkInSessionAction({ tableId: "t1", durationMinutes: 45 });

    expect(result).toEqual({
      ok: false,
      message: "The operation could not be completed. Please try again."
    });
    expect(mocks.sessionService.startWalkInSession).not.toHaveBeenCalled();
  });

  it("returns ok:false without sessions.start permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: ["tables.read"] }));

    const result = await startWalkInSessionAction({ tableId: "t1", durationMinutes: 60 });

    expect(result).toEqual({
      ok: false,
      message: "You do not have permission to perform this action."
    });
    expect(mocks.prisma.clubTable.findFirst).not.toHaveBeenCalled();
  });
});

describe("extendSessionAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.sessionService.extendSession.mockReset();
    mocks.sessionService.extendSession.mockResolvedValue({});
  });

  it("extends an active session", async () => {
    const result = await extendSessionAction({ sessionId: "s1", addedMinutes: 30 });

    expect(result).toEqual({ ok: true, message: "Session extended." });
    expect(mocks.sessionService.extendSession).toHaveBeenCalledWith({
      sessionId: "s1",
      addedMinutes: 30,
      businessId: "biz-1",
      employeeId: "emp-1",
      now: expect.any(Date)
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
  });

  it("rejects an invalid extension amount", async () => {
    const result = await extendSessionAction({ sessionId: "s1", addedMinutes: 45 });

    expect(result.ok).toBe(false);
    expect(mocks.sessionService.extendSession).not.toHaveBeenCalled();
  });

  it("maps a DomainError from the service (e.g. extension conflict)", async () => {
    mocks.sessionService.extendSession.mockRejectedValueOnce(
      new DomainError("EXTENSION_CONFLICT", "Later bookings overlap this extension.")
    );

    const result = await extendSessionAction({ sessionId: "s1", addedMinutes: 60 });

    expect(result).toEqual({ ok: false, message: "Later bookings overlap this extension." });
  });

  it("returns ok:false without sessions.extend permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await extendSessionAction({ sessionId: "s1", addedMinutes: 30 });

    expect(result.ok).toBe(false);
    expect(mocks.sessionService.extendSession).not.toHaveBeenCalled();
  });
});

describe("endSessionAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T11:00:00.000Z"));
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    txThrough();
    mocks.sessionService.endSession.mockReset();
    mocks.sessionService.endSession.mockResolvedValue({});
    mocks.prisma.session.findFirst.mockReset();
    mocks.prisma.session.findFirst.mockResolvedValue({
      id: "s1",
      status: "ACTIVE",
      hourlyRateSnapshot: 350,
      table: { number: "Royal 1" }
    });
    mocks.prisma.bill.findFirst.mockReset();
    mocks.prisma.bill.findFirst.mockResolvedValue({
      id: "b1",
      kind: "SESSION",
      openedAt: new Date("2026-08-17T10:00:00.000Z"),
      items: [{ lineTotalAmount: 100 }]
    });
    mocks.prisma.bill.update.mockReset();
    mocks.prisma.bill.update.mockResolvedValue({});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("closes the open bill (table time + items) and reports the final total", async () => {
    const result = await endSessionAction({ sessionId: "s1" });

    expect(result).toEqual({ ok: true, message: "Session ended. Final total ₹450.00." });
    // 1 hour of table time at ₹350 + ₹100 of items
    expect(mocks.prisma.bill.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: {
        status: "CLOSED",
        closedAt: new Date("2026-08-17T11:00:00.000Z"),
        tableAmountSnapshot: 350,
        itemTotalAmountSnapshot: 100,
        totalAmountSnapshot: 450
      }
    });
    expect(mocks.sessionService.endSession).toHaveBeenCalledWith({
      sessionId: "s1",
      businessId: "biz-1",
      employeeId: "emp-1",
      now: expect.any(Date)
    });
  });

  it("ends with a zero total when there is no open bill", async () => {
    mocks.prisma.bill.findFirst.mockResolvedValue(null);

    const result = await endSessionAction({ sessionId: "s1" });

    expect(result).toEqual({ ok: true, message: "Session ended. Final total ₹0.00." });
    expect(mocks.prisma.bill.update).not.toHaveBeenCalled();
  });

  it("rejects ending a session that is not active or paused", async () => {
    mocks.prisma.session.findFirst.mockResolvedValue(null);

    const result = await endSessionAction({ sessionId: "s1" });

    expect(result).toEqual({
      ok: false,
      message: "Only an active or paused session can be ended."
    });
    expect(mocks.sessionService.endSession).not.toHaveBeenCalled();
  });

  it("returns ok:false without sessions.end permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await endSessionAction({ sessionId: "s1" });

    expect(result.ok).toBe(false);
  });
});

describe("addBillItemAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    txThrough();
    mocks.prisma.bill.findFirst.mockReset();
    mocks.prisma.bill.findFirst.mockResolvedValue({ id: "b1" });
    mocks.prisma.product.findFirst.mockReset();
    mocks.prisma.product.findFirst.mockResolvedValue({
      id: "p1",
      name: "Cold Coffee",
      category: "BEVERAGES",
      priceAmount: "120"
    });
    mocks.prisma.billItem.create.mockReset();
    mocks.prisma.billItem.create.mockResolvedValue({});
  });

  it("adds a line item with computed line total", async () => {
    const result = await addBillItemAction({ billId: "b1", productId: "p1", quantity: 2 });

    expect(result).toEqual({ ok: true, message: "Item added to bill." });
    expect(mocks.prisma.billItem.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz-1",
        billId: "b1",
        productId: "p1",
        category: "BEVERAGES",
        nameSnapshot: "Cold Coffee",
        unitPriceAmount: "120",
        quantity: 2,
        lineTotalAmount: 240
      }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
  });

  it("rejects when the open bill or the product is not found", async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(null);

    const result = await addBillItemAction({ billId: "b1", productId: "p1", quantity: 1 });

    expect(result).toEqual({ ok: false, message: "Open bill or product was not found." });
    expect(mocks.prisma.billItem.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input (zero quantity)", async () => {
    const result = await addBillItemAction({ billId: "b1", productId: "p1", quantity: 0 });

    expect(result.ok).toBe(false);
    expect(mocks.prisma.billItem.create).not.toHaveBeenCalled();
  });

  it("returns ok:false without bills.manage permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await addBillItemAction({ billId: "b1", productId: "p1", quantity: 1 });

    expect(result.ok).toBe(false);
    expect(mocks.prisma.billItem.create).not.toHaveBeenCalled();
  });
});

describe("addSessionItemAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    txThrough();
    mocks.prisma.bill.findFirst.mockReset();
    mocks.prisma.product.findFirst.mockReset();
    mocks.prisma.billItem.create.mockReset();
  });

  it("adds the item to the newest open bill of the session", async () => {
    mocks.prisma.bill.findFirst.mockResolvedValue({ id: "b2" });
    mocks.prisma.product.findFirst.mockResolvedValue({
      id: "p1",
      name: "Fries",
      category: "FOOD",
      priceAmount: 110
    });
    mocks.prisma.billItem.create.mockResolvedValue({});

    const result = await addSessionItemAction({ sessionId: "s1", productId: "p1", quantity: 1 });

    expect(result).toEqual({ ok: true, message: "Item added to bill." });
    expect(mocks.prisma.bill.findFirst).toHaveBeenCalledWith({
      where: { businessId: "biz-1", sessionId: "s1", status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: { id: true }
    });
    expect(mocks.prisma.billItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ billId: "b2" }) })
    );
  });

  it("reports when the session has no open bill", async () => {
    mocks.prisma.bill.findFirst.mockResolvedValue(null);

    const result = await addSessionItemAction({ sessionId: "s1", productId: "p1", quantity: 1 });

    expect(result).toEqual({ ok: false, message: "Open bill was not found." });
    expect(mocks.prisma.billItem.create).not.toHaveBeenCalled();
  });

  it("delegates to the bill action when no sessionId is given", async () => {
    const result = await addSessionItemAction({ productId: "p1", quantity: 1 });

    // Delegates to addBillItemAction which requires a billId -> zod failure.
    expect(result.ok).toBe(false);
    expect(mocks.prisma.billItem.create).not.toHaveBeenCalled();
  });
});

describe("removeBillItemAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.billItem.findFirst.mockReset();
    mocks.prisma.billItem.findFirst.mockResolvedValue({
      id: "bi1",
      bill: { kind: "SESSION" }
    });
    mocks.prisma.billItem.delete.mockReset();
    mocks.prisma.billItem.delete.mockResolvedValue({});
  });

  it("deletes an item from an open bill", async () => {
    const result = await removeBillItemAction({ billItemId: "bi1" });

    expect(result).toEqual({ ok: true, message: "Item removed from bill." });
    expect(mocks.prisma.billItem.findFirst).toHaveBeenCalledWith({
      where: { id: "bi1", businessId: "biz-1", bill: { status: "OPEN" } },
      select: { id: true, bill: { select: { kind: true } } }
    });
    expect(mocks.prisma.billItem.delete).toHaveBeenCalledWith({ where: { id: "bi1" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("rejects when the open bill item is not found", async () => {
    mocks.prisma.billItem.findFirst.mockResolvedValue(null);

    const result = await removeBillItemAction({ billItemId: "bi1" });

    expect(result).toEqual({ ok: false, message: "Open bill item was not found." });
    expect(mocks.prisma.billItem.delete).not.toHaveBeenCalled();
  });

  it("returns ok:false without bills.manage permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await removeBillItemAction({ billItemId: "bi1" });

    expect(result.ok).toBe(false);
  });
});

describe("closeBillAndContinueSessionAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T11:00:00.000Z"));
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    txThrough();
    mocks.prisma.session.findFirst.mockReset();
    mocks.prisma.session.findFirst.mockResolvedValue({
      id: "s1",
      status: "ACTIVE",
      hourlyRateSnapshot: 350,
      bills: [
        {
          id: "b1",
          kind: "SESSION",
          openedAt: new Date("2026-08-17T10:00:00.000Z"),
          items: [{ lineTotalAmount: 90 }]
        }
      ]
    });
    mocks.prisma.bill.update.mockReset();
    mocks.prisma.bill.update.mockResolvedValue({});
    mocks.prisma.bill.count.mockReset();
    mocks.prisma.bill.count.mockResolvedValue(1);
    mocks.prisma.bill.create.mockReset();
    mocks.prisma.bill.create.mockResolvedValue({});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("closes the open bill (₹350 table + ₹90 items) and starts the next one", async () => {
    const result = await closeBillAndContinueSessionAction({ sessionId: "s1" });

    expect(result).toEqual({ ok: true, message: "Bill closed. New bill started." });
    expect(mocks.prisma.bill.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: expect.objectContaining({
        status: "CLOSED",
        tableAmountSnapshot: 350,
        itemTotalAmountSnapshot: 90,
        totalAmountSnapshot: 440
      })
    });
    expect(mocks.prisma.bill.count).toHaveBeenCalledWith({
      where: { businessId: "biz-1", sessionId: "s1" }
    });
    expect(mocks.prisma.bill.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz-1",
        sessionId: "s1",
        kind: "SESSION",
        status: "OPEN",
        label: "Bill 2",
        openedAt: new Date("2026-08-17T11:00:00.000Z")
      }
    });
  });

  it("rejects when the session has no open bill", async () => {
    mocks.prisma.session.findFirst.mockResolvedValue(null);

    const result = await closeBillAndContinueSessionAction({ sessionId: "s1" });

    expect(result).toEqual({ ok: false, message: "Open session bill was not found." });
    expect(mocks.prisma.bill.create).not.toHaveBeenCalled();
  });

  it("returns ok:false without bills.manage permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await closeBillAndContinueSessionAction({ sessionId: "s1" });

    expect(result.ok).toBe(false);
  });
});

describe("startCounterBillAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.bill.create.mockReset();
    mocks.prisma.bill.create.mockResolvedValue({});
  });

  it("starts a counter bill with the default label", async () => {
    const result = await startCounterBillAction({});

    expect(result).toEqual({ ok: true, message: "Counter bill started." });
    expect(mocks.prisma.bill.create).toHaveBeenCalledWith({
      data: { businessId: "biz-1", kind: "COUNTER", status: "OPEN", label: "Counter bill" }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
  });

  it("starts a counter bill with a custom label", async () => {
    const result = await startCounterBillAction({ label: "Billing Desk" });

    expect(result.ok).toBe(true);
    expect(mocks.prisma.bill.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ label: "Billing Desk" }) })
    );
  });

  it("returns ok:false without bills.manage permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await startCounterBillAction({});

    expect(result.ok).toBe(false);
    expect(mocks.prisma.bill.create).not.toHaveBeenCalled();
  });
});

describe("closeCounterBillAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T11:00:00.000Z"));
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.bill.findFirst.mockReset();
    mocks.prisma.bill.findFirst.mockResolvedValue({
      id: "cb1",
      kind: "COUNTER",
      status: "OPEN",
      items: [
        { lineTotalAmount: 80.5 },
        { lineTotalAmount: 20.25 }
      ]
    });
    mocks.prisma.bill.update.mockReset();
    mocks.prisma.bill.update.mockResolvedValue({});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("closes the counter bill with the item total", async () => {
    const result = await closeCounterBillAction({ billId: "cb1" });

    expect(result).toEqual({ ok: true, message: "Counter bill closed. Total ₹100.75." });
    expect(mocks.prisma.bill.update).toHaveBeenCalledWith({
      where: { id: "cb1" },
      data: {
        status: "CLOSED",
        closedAt: new Date("2026-08-17T11:00:00.000Z"),
        tableAmountSnapshot: 0,
        itemTotalAmountSnapshot: 100.75,
        totalAmountSnapshot: 100.75
      }
    });
  });

  it("rejects when the open counter bill is not found", async () => {
    mocks.prisma.bill.findFirst.mockResolvedValue(null);

    const result = await closeCounterBillAction({ billId: "cb1" });

    expect(result).toEqual({ ok: false, message: "Open counter bill was not found." });
    expect(mocks.prisma.bill.update).not.toHaveBeenCalled();
  });

  it("returns ok:false without bills.manage permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await closeCounterBillAction({ billId: "cb1" });

    expect(result.ok).toBe(false);
  });
});

describe("updateTableStatusAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.tableService.updateOperationalStatus.mockReset();
    mocks.tableService.updateOperationalStatus.mockResolvedValue({});
  });

  it("updates the operational status via the table service", async () => {
    const result = await updateTableStatusAction({ tableId: "t1", status: "RESERVED" });

    expect(result).toEqual({ ok: true, message: "Table status updated." });
    expect(mocks.tableService.updateOperationalStatus).toHaveBeenCalledWith({
      tableId: "t1",
      status: "RESERVED",
      businessId: "biz-1",
      employeeId: "emp-1"
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
  });

  it("rejects an invalid status", async () => {
    const result = await updateTableStatusAction({ tableId: "t1", status: "DANCING" });

    expect(result.ok).toBe(false);
    expect(mocks.tableService.updateOperationalStatus).not.toHaveBeenCalled();
  });

  it("maps a DomainError from the table service", async () => {
    mocks.tableService.updateOperationalStatus.mockRejectedValueOnce(
      new DomainError("INVALID_STATUS_TRANSITION", "Cannot block an occupied table.")
    );

    const result = await updateTableStatusAction({ tableId: "t1", status: "BLOCKED" });

    expect(result).toEqual({ ok: false, message: "Cannot block an occupied table." });
  });

  it("returns ok:false without tables.update_status permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: ["tables.read"] }));

    const result = await updateTableStatusAction({ tableId: "t1", status: "CLEANING" });

    expect(result.ok).toBe(false);
    expect(mocks.tableService.updateOperationalStatus).not.toHaveBeenCalled();
  });
});

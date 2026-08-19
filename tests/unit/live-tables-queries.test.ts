import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLiveTableBoard,
  getOpenCounterBills,
  getProductOptions
} from "@/features/live-tables/queries";

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
  return {
    prisma: {
      clubTable: model(),
      tablePricing: model(),
      bill: model(),
      businessSettings: model(),
      booking: model(),
      product: model()
    }
  };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));

const settings = {
  businessId: "biz-1",
  bookingEnabled: true,
  requireConfirmation: false,
  bookingBufferMinutes: 10,
  bookingMinLeadMinutes: 0,
  bookingOpenHour: 9,
  bookingCloseHour: 23,
  bookingCloseNextDay: false,
  paymentProvider: "NONE",
  bookingAdvanceAmount: 0
};

/** Board math is timezone- and clock-sensitive; pin UTC and a fixed "now". */
beforeAll(() => {
  process.env.TZ = "UTC";
});
afterAll(() => {
  delete process.env.TZ;
});

describe("getLiveTableBoard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));
    mocks.prisma.clubTable.findMany.mockReset();
    mocks.prisma.tablePricing.findMany.mockReset();
    mocks.prisma.tablePricing.findMany.mockResolvedValue([]);
    mocks.prisma.bill.findMany.mockReset();
    mocks.prisma.bill.findMany.mockResolvedValue([]);
    mocks.prisma.businessSettings.findUnique.mockReset();
    mocks.prisma.businessSettings.findUnique.mockResolvedValue(settings);
    mocks.prisma.booking.findMany.mockReset();
    mocks.prisma.booking.findMany.mockResolvedValue([]);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an empty board for a business without tables", async () => {
    mocks.prisma.clubTable.findMany.mockResolvedValue([]);

    const board = await getLiveTableBoard("biz-1");

    expect(board).toEqual([]);
    expect(mocks.prisma.clubTable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: "biz-1", active: true },
        orderBy: [{ gameType: "asc" }, { number: "asc" }]
      })
    );
    expect(mocks.prisma.bill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: "biz-1", status: "CLOSED", kind: "SESSION", sessionId: { not: null } },
        orderBy: { closedAt: "desc" },
        take: 25
      })
    );
  });

  it("maps an active session with its running bill and summary math", async () => {
    mocks.prisma.clubTable.findMany.mockResolvedValue([
      {
        id: "t1",
        number: "Royal 1",
        gameType: "SNOOKER",
        pricingGroup: "royal",
        status: "OCCUPIED",
        sessions: [
          {
            id: "s1",
            status: "ACTIVE",
            startedAt: new Date("2026-08-17T10:00:00.000Z"),
            plannedEndAt: new Date("2026-08-17T11:00:00.000Z"),
            hourlyRateSnapshot: 350,
            billableSecondsSnapshot: 0,
            ps5MemberCount: null,
            customer: { name: "Alice" },
            assignedEmployee: { name: "Ram" },
            bills: [
              {
                id: "b1",
                label: "Bill 1",
                openedAt: new Date("2026-08-17T10:00:00.000Z"),
                items: [
                  {
                    id: "bi1",
                    nameSnapshot: "Chai",
                    category: "FOOD",
                    quantity: 2,
                    unitPriceAmount: 30,
                    lineTotalAmount: 60
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);
    mocks.prisma.tablePricing.findMany.mockResolvedValue([
      { gameType: "SNOOKER", pricingGroup: "royal", priceAmount: 350 }
    ]);

    const board = await getLiveTableBoard("biz-1");

    expect(board).toHaveLength(1);
    const card = board[0];
    expect(card?.id).toBe("t1");
    expect(card?.hourlyRate).toBe(350);
    expect(card?.recentBill).toBeNull();
    expect(card?.upcomingBooking).toBeNull();
    expect(card?.currentSession).toMatchObject({
      id: "s1",
      status: "ACTIVE",
      customerName: "Alice",
      startedAt: "2026-08-17T10:00:00.000Z",
      plannedEndAt: "2026-08-17T11:00:00.000Z",
      elapsedSeconds: 7200,
      hourlyRateSnapshot: 350,
      billEstimate: 700,
      assignedStaffName: "Ram",
      billSummary: {
        tableAmount: 700,
        categoryTotals: { FOOD: 60, CIGARETTES: 0, BEVERAGES: 0 },
        itemTotal: 60,
        grandTotal: 760
      }
    });
    expect(card?.currentSession?.currentBill).toMatchObject({
      id: "b1",
      label: "Bill 1",
      summary: { tableAmount: 700, itemTotal: 60, grandTotal: 760 },
      items: [
        { id: "bi1", name: "Chai", category: "FOOD", quantity: 2, unitPriceAmount: 30, lineTotalAmount: 60 }
      ]
    });
  });

  it("falls back to PS5 member rates when no pricing rules exist", async () => {
    mocks.prisma.clubTable.findMany.mockResolvedValue([
      {
        id: "p1",
        number: "PS5 1",
        gameType: "PS5",
        pricingGroup: "players-1",
        status: "AVAILABLE",
        sessions: []
      }
    ]);
    mocks.prisma.tablePricing.findMany.mockResolvedValue([]);

    const board = await getLiveTableBoard("biz-1");

    const card = board[0];
    expect(card?.currentSession).toBeNull();
    expect(card?.hourlyRate).toBe(100);
    expect(card?.ps5MemberRates).toEqual({ 1: 100, 2: 150, 3: 200, 4: 250 });
  });

  it("attaches the most recent closed bill and upcoming booking badge per table", async () => {
    mocks.prisma.clubTable.findMany.mockResolvedValue([
      {
        id: "t2",
        number: "Pool 1",
        gameType: "POOL",
        pricingGroup: "standard",
        status: "AVAILABLE",
        sessions: []
      }
    ]);
    mocks.prisma.bill.findMany.mockResolvedValue([
      {
        id: "cb1",
        label: null,
        openedAt: new Date("2026-08-17T11:00:00.000Z"),
        closedAt: new Date("2026-08-17T11:30:00.000Z"),
        tableAmountSnapshot: 350,
        itemTotalAmountSnapshot: 60,
        totalAmountSnapshot: 410,
        session: { tableId: "t2" },
        items: [
          {
            id: "cbi1",
            nameSnapshot: "Fries",
            category: "FOOD",
            quantity: 1,
            unitPriceAmount: 60,
            lineTotalAmount: 60
          }
        ]
      }
    ]);
    mocks.prisma.booking.findMany.mockResolvedValue([
      {
        tableId: "t2",
        startsAt: new Date("2026-08-17T13:00:00.000Z"),
        endsAt: new Date("2026-08-17T14:00:00.000Z"),
        status: "CONFIRMED",
        customer: { name: "Bob" }
      }
    ]);

    const board = await getLiveTableBoard("biz-1");

    const card = board[0];
    expect(card?.recentBill).toMatchObject({
      id: "cb1",
      label: "Bill",
      openedAt: "2026-08-17T11:00:00.000Z",
      closedAt: "2026-08-17T11:30:00.000Z",
      summary: {
        tableAmount: 350,
        categoryTotals: { FOOD: 60, CIGARETTES: 0, BEVERAGES: 0 },
        itemTotal: 60,
        grandTotal: 410
      },
      items: [{ id: "cbi1", name: "Fries", quantity: 1, lineTotalAmount: 60 }]
    });
    expect(card?.upcomingBooking).toEqual({
      startsAt: "2026-08-17T13:00:00.000Z",
      endsAt: "2026-08-17T14:00:00.000Z",
      status: "CONFIRMED",
      customerName: "Bob"
    });
  });
});

describe("getOpenCounterBills", () => {
  beforeEach(() => {
    mocks.prisma.bill.findMany.mockReset();
  });

  it("maps open counter bills with item totals", async () => {
    mocks.prisma.bill.findMany.mockResolvedValue([
      {
        id: "cb1",
        label: "Billing Desk",
        openedAt: new Date("2026-08-17T10:00:00.000Z"),
        items: [
          {
            id: "i1",
            nameSnapshot: "Water",
            category: "BEVERAGES",
            quantity: 1,
            unitPriceAmount: 20,
            lineTotalAmount: 20
          },
          {
            id: "i2",
            nameSnapshot: "Fries",
            category: "FOOD",
            quantity: 1,
            unitPriceAmount: 110,
            lineTotalAmount: 110
          }
        ]
      }
    ]);

    const bills = await getOpenCounterBills("biz-1");

    expect(bills).toEqual([
      {
        id: "cb1",
        label: "Billing Desk",
        openedAt: "2026-08-17T10:00:00.000Z",
        closedAt: null,
        summary: {
          tableAmount: 0,
          categoryTotals: { FOOD: 110, CIGARETTES: 0, BEVERAGES: 20 },
          itemTotal: 130,
          grandTotal: 130
        },
        items: [
          { id: "i1", name: "Water", category: "BEVERAGES", quantity: 1, unitPriceAmount: 20, lineTotalAmount: 20 },
          { id: "i2", name: "Fries", category: "FOOD", quantity: 1, unitPriceAmount: 110, lineTotalAmount: 110 }
        ]
      }
    ]);
    expect(mocks.prisma.bill.findMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1", kind: "COUNTER", status: "OPEN" },
      orderBy: { openedAt: "desc" },
      include: { items: { orderBy: { createdAt: "asc" } } }
    });
  });

  it("returns an empty list when no counter bills are open", async () => {
    mocks.prisma.bill.findMany.mockResolvedValue([]);

    const bills = await getOpenCounterBills("biz-1");

    expect(bills).toEqual([]);
  });
});

describe("getProductOptions", () => {
  beforeEach(() => {
    mocks.prisma.product.findMany.mockReset();
  });

  it("maps active products ordered by category then name", async () => {
    mocks.prisma.product.findMany.mockResolvedValue([
      { id: "p1", name: "Cold Coffee", category: "BEVERAGES", priceAmount: "120" },
      { id: "p2", name: "Fries", category: "FOOD", priceAmount: 110 }
    ]);

    const options = await getProductOptions("biz-1");

    expect(options).toEqual([
      { id: "p1", name: "Cold Coffee", category: "BEVERAGES", priceAmount: 120 },
      { id: "p2", name: "Fries", category: "FOOD", priceAmount: 110 }
    ]);
    expect(mocks.prisma.product.findMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1", active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    });
  });

  it("returns an empty list when the business has no products", async () => {
    mocks.prisma.product.findMany.mockResolvedValue([]);

    const options = await getProductOptions("biz-1");

    expect(options).toEqual([]);
  });
});

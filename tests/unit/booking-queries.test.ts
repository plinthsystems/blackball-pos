import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureBookingSettingsFor,
  getPublicBookCatalog,
  getUpcomingBookingBadges,
  getUpcomingBookings,
  listBookableSlots
} from "@/features/booking/queries";

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
      business: model(),
      businessSettings: model(),
      clubTable: model(),
      booking: model(),
      session: model()
    },
    getActivePaymentProvider: vi.fn(),
    isWhatsAppConfigured: vi.fn()
  };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/server/integrations/payments", () => ({
  getActivePaymentProvider: mocks.getActivePaymentProvider
}));
vi.mock("@/server/integrations/whatsapp", () => ({
  isWhatsAppConfigured: mocks.isWhatsAppConfigured
}));

const settings = {
  businessId: "biz-1",
  bookingEnabled: true,
  requireConfirmation: false,
  bookingBufferMinutes: 0,
  bookingMinLeadMinutes: 0,
  bookingOpenHour: 9,
  bookingCloseHour: 23,
  bookingCloseNextDay: false,
  paymentProvider: "NONE",
  bookingAdvanceAmount: 0
};

/** Slot/date math is local-timezone-sensitive; pin UTC and a fixed clock. */
beforeAll(() => {
  process.env.TZ = "UTC";
});
afterAll(() => {
  delete process.env.TZ;
});

describe("ensureBookingSettingsFor", () => {
  beforeEach(() => {
    mocks.prisma.businessSettings.findUnique.mockReset();
    mocks.prisma.businessSettings.create.mockReset();
  });

  it("returns existing settings without creating a row", async () => {
    mocks.prisma.businessSettings.findUnique.mockResolvedValue({ ...settings });

    const result = await ensureBookingSettingsFor("biz-1");

    expect(result).toEqual(settings);
    expect(mocks.prisma.businessSettings.findUnique).toHaveBeenCalledWith({
      where: { businessId: "biz-1" }
    });
    expect(mocks.prisma.businessSettings.create).not.toHaveBeenCalled();
  });

  it("creates default settings when none exist", async () => {
    mocks.prisma.businessSettings.findUnique.mockResolvedValue(null);
    mocks.prisma.businessSettings.create.mockResolvedValue({ ...settings });

    const result = await ensureBookingSettingsFor("biz-1");

    expect(mocks.prisma.businessSettings.create).toHaveBeenCalledWith({
      data: { businessId: "biz-1" }
    });
    expect(result).toEqual(settings);
  });
});

describe("getPublicBookCatalog", () => {
  beforeEach(() => {
    mocks.prisma.business.findUnique.mockReset();
    mocks.prisma.businessSettings.findUnique.mockReset();
    mocks.getActivePaymentProvider.mockReset();
    mocks.isWhatsAppConfigured.mockReset();
  });

  it("returns null for an unknown business slug", async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(null);

    const catalog = await getPublicBookCatalog("unknown-slug");

    expect(catalog).toBeNull();
  });

  it("maps the business, settings and active tables into a public catalog", async () => {
    mocks.prisma.business.findUnique.mockResolvedValue({
      id: "biz-1",
      name: "Royal Cue",
      slug: "royal-cue",
      settings: null,
      tables: [
        { id: "t2", number: "Table 2", gameType: "SNOOKER", pricingGroup: "royal" },
        { id: "t1", number: "Table 1", gameType: "POOL", pricingGroup: "standard" }
      ]
    });
    mocks.prisma.businessSettings.findUnique.mockResolvedValue({
      ...settings,
      bookingAdvanceAmount: 199,
      paymentProvider: "RAZORPAY"
    });
    mocks.getActivePaymentProvider.mockReturnValue("razorpay");
    mocks.isWhatsAppConfigured.mockReturnValue(true);

    const catalog = await getPublicBookCatalog("royal-cue");

    expect(catalog).toEqual({
      businessId: "biz-1",
      businessName: "Royal Cue",
      slug: "royal-cue",
      bookingEnabled: true,
      requireConfirmation: false,
      bookingBufferMinutes: 0,
      bookingMinLeadMinutes: 0,
      bookingOpenHour: 9,
      bookingCloseHour: 23,
      bookingCloseNextDay: false,
      paymentProvider: "razorpay",
      advanceAmount: 199,
      whatsappConfigured: true,
      tables: [
        { id: "t2", number: "Table 2", gameType: "SNOOKER", pricingGroup: "royal" },
        { id: "t1", number: "Table 1", gameType: "POOL", pricingGroup: "standard" }
      ]
    });
    expect(mocks.prisma.business.findUnique).toHaveBeenCalledWith({
      where: { slug: "royal-cue" },
      include: {
        settings: true,
        tables: {
          where: { active: true },
          orderBy: [{ gameType: "asc" }, { number: "asc" }]
        }
      }
    });
  });

  it("maps an unconfigured payment provider to null", async () => {
    mocks.prisma.business.findUnique.mockResolvedValue({
      id: "biz-1",
      name: "Cue",
      slug: "cue",
      settings: null,
      tables: []
    });
    mocks.prisma.businessSettings.findUnique.mockResolvedValue(settings);
    mocks.getActivePaymentProvider.mockReturnValue(null);
    mocks.isWhatsAppConfigured.mockReturnValue(false);

    const catalog = await getPublicBookCatalog("cue");

    expect(catalog?.paymentProvider).toBeNull();
    expect(catalog?.advanceAmount).toBe(0);
    expect(catalog?.whatsappConfigured).toBe(false);
    expect(catalog?.tables).toEqual([]);
  });
});

describe("listBookableSlots", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T10:30:00.000Z"));
    mocks.prisma.businessSettings.findUnique.mockReset();
    mocks.prisma.businessSettings.findUnique.mockResolvedValue(settings);
    mocks.prisma.clubTable.findFirst.mockReset();
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ id: "t1", businessId: "biz-1" });
    mocks.prisma.booking.findMany.mockReset();
    mocks.prisma.booking.findMany.mockResolvedValue([]);
    mocks.prisma.session.findFirst.mockReset();
    mocks.prisma.session.findFirst.mockResolvedValue(null);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns no slots when the date is outside the booking window", async () => {
    const slots = await listBookableSlots("biz-1", "t1", "2026-08-01", 60);

    expect(slots).toEqual([]);
    expect(mocks.prisma.clubTable.findFirst).not.toHaveBeenCalled();
  });

  it("returns no slots for an unknown or inactive table", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue(null);

    const slots = await listBookableSlots("biz-1", "ghost", "2026-08-17", 60);

    expect(slots).toEqual([]);
  });

  it("lists 30-minute-step slots from 9AM to 11PM, filtered to future starts", async () => {
    const slots = await listBookableSlots("biz-1", "t1", "2026-08-17", 60);

    // 27 candidates (09:00..22:00); starts before now (10:30) are dropped,
    // 10:30 itself is kept (filter is >= now).
    expect(slots).toHaveLength(24);
    expect(slots[0]).toEqual({
      iso: "2026-08-17T10:30:00.000Z",
      label: "10:30 AM",
      available: true
    });
    expect(slots[slots.length - 1]?.iso).toBe("2026-08-17T22:00:00.000Z");
    expect(slots.every((slot) => slot.available)).toBe(true);
  });

  it("marks slots overlapping an existing booking as unavailable", async () => {
    mocks.prisma.booking.findMany.mockResolvedValue([
      { startsAt: new Date("2026-08-17T12:00:00.000Z"), endsAt: new Date("2026-08-17T13:00:00.000Z") }
    ]);

    const slots = await listBookableSlots("biz-1", "t1", "2026-08-17", 60);

    const byIso = new Map(slots.map((slot) => [slot.iso, slot.available]));
    expect(byIso.get("2026-08-17T11:00:00.000Z")).toBe(true);
    expect(byIso.get("2026-08-17T12:00:00.000Z")).toBe(false);
    expect(byIso.get("2026-08-17T12:30:00.000Z")).toBe(false);
    expect(byIso.get("2026-08-17T13:00:00.000Z")).toBe(true);
  });

  it("blocks slots until two hours after an active session started", async () => {
    mocks.prisma.session.findFirst.mockResolvedValue({
      id: "s1",
      status: "ACTIVE",
      startedAt: new Date("2026-08-17T10:00:00.000Z")
    });

    const slots = await listBookableSlots("biz-1", "t1", "2026-08-17", 60);

    const byIso = new Map(slots.map((slot) => [slot.iso, slot.available]));
    expect(byIso.get("2026-08-17T11:00:00.000Z")).toBe(false);
    expect(byIso.get("2026-08-17T11:30:00.000Z")).toBe(false);
    expect(byIso.get("2026-08-17T12:00:00.000Z")).toBe(true);
  });
});

describe("getUpcomingBookings", () => {
  beforeEach(() => {
    mocks.prisma.booking.findMany.mockReset();
  });

  it("maps bookings with customer and table details", async () => {
    mocks.prisma.booking.findMany.mockResolvedValue([
      {
        id: "booking_AB12CD",
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        paymentProvider: "RAZORPAY",
        advanceAmount: 199,
        startsAt: new Date("2026-08-17T18:00:00.000Z"),
        endsAt: new Date("2026-08-17T19:00:00.000Z"),
        table: { number: "Table 1", gameType: "POOL" },
        customer: { name: "Alice", phone: "+919876543210" }
      }
    ]);

    const bookings = await getUpcomingBookings("biz-1");

    expect(bookings).toEqual([
      {
        id: "booking_AB12CD",
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        paymentProvider: "RAZORPAY",
        advanceAmount: 199,
        startsAt: "2026-08-17T18:00:00.000Z",
        endsAt: "2026-08-17T19:00:00.000Z",
        tableNumber: "Table 1",
        gameType: "POOL",
        customerName: "Alice",
        customerPhone: "+919876543210",
        reference: "AB12CD"
      }
    ]);
    expect(mocks.prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: "biz-1", status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW", "EXPIRED"] } }),
        orderBy: [{ startsAt: "asc" }],
        take: 100
      })
    );
  });

  it("falls back to a walk-in guest label when the customer is missing", async () => {
    mocks.prisma.booking.findMany.mockResolvedValue([
      {
        id: "b1",
        status: "PENDING",
        paymentStatus: "UNPAID",
        paymentProvider: null,
        advanceAmount: 0,
        startsAt: new Date("2026-08-17T18:00:00.000Z"),
        endsAt: new Date("2026-08-17T19:00:00.000Z"),
        table: { number: "PS5 3", gameType: "PS5" },
        customer: null
      }
    ]);

    const bookings = await getUpcomingBookings("biz-1");

    expect(bookings[0]?.customerName).toBe("Walk-in Guest");
    expect(bookings[0]?.customerPhone).toBeNull();
  });
});

describe("getUpcomingBookingBadges", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T10:00:00.000Z"));
    mocks.prisma.businessSettings.findUnique.mockReset();
    mocks.prisma.businessSettings.findUnique.mockResolvedValue(settings);
    mocks.prisma.booking.findMany.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps one badge per table (first booking wins) for the active/next windows", async () => {
    mocks.prisma.booking.findMany.mockResolvedValue([
      {
        tableId: "t1",
        startsAt: new Date("2026-08-17T10:30:00.000Z"),
        endsAt: new Date("2026-08-17T11:30:00.000Z"),
        status: "PENDING",
        customer: { name: "Alice" }
      },
      // second booking for the same table must be deduped
      {
        tableId: "t1",
        startsAt: new Date("2026-08-17T12:00:00.000Z"),
        endsAt: new Date("2026-08-17T13:00:00.000Z"),
        status: "CONFIRMED",
        customer: { name: "Bob" }
      },
      // starts after the active window closes -> skipped
      {
        tableId: "t2",
        startsAt: new Date("2026-08-17T23:30:00.000Z"),
        endsAt: new Date("2026-08-18T00:30:00.000Z"),
        status: "CHECKED_IN",
        customer: { name: "Carol" }
      }
    ]);

    const badges = await getUpcomingBookingBadges("biz-1");

    expect(badges).toEqual(
      new Map([
        [
          "t1",
          {
            startsAt: "2026-08-17T10:30:00.000Z",
            endsAt: "2026-08-17T11:30:00.000Z",
            status: "PENDING",
            customerName: "Alice"
          }
        ]
      ])
    );
    expect(badges.has("t2")).toBe(false);
  });
});

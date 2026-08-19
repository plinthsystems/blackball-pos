import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelBookingAction,
  confirmBookingAction,
  createPublicBookingAction,
  listBookableSlotsAction,
  markBookingPaidAction,
  updateBookingSettingsAction
} from "@/features/booking/actions";
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
  return {
    prisma: {
      $transaction: vi.fn(),
      $queryRaw: vi.fn(),
      business: model(),
      businessSettings: model(),
      clubTable: model(),
      customer: model(),
      booking: model(),
      session: model()
    },
    context: vi.fn(),
    revalidatePath: vi.fn(),
    headers: vi.fn(),
    checkRateLimit: vi.fn(),
    getActivePaymentProvider: vi.fn(),
    createBookingPaymentLink: vi.fn(),
    sendBookingCreatedMessage: vi.fn(),
    sendBookingCancelledMessage: vi.fn(),
    isWhatsAppConfigured: vi.fn()
  };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/server/auth/current-employee", () => ({ getCurrentEmployeeContext: mocks.context }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/server/auth/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/server/integrations/payments", () => ({
  getActivePaymentProvider: mocks.getActivePaymentProvider,
  createBookingPaymentLink: mocks.createBookingPaymentLink
}));
vi.mock("@/server/integrations/whatsapp", () => ({
  isWhatsAppConfigured: mocks.isWhatsAppConfigured,
  sendBookingCreatedMessage: mocks.sendBookingCreatedMessage,
  sendBookingCancelledMessage: mocks.sendBookingCancelledMessage
}));

const bookSettings = {
  businessId: "biz-1",
  bookingEnabled: true,
  requireConfirmation: false,
  bookingBufferMinutes: 10,
  bookingMinLeadMinutes: 10,
  bookingOpenHour: 9,
  bookingCloseHour: 23,
  bookingCloseNextDay: false,
  paymentProvider: "NONE",
  bookingAdvanceAmount: 0
};

/** Action input: same values without the businessId column (not part of the schema). */
const bookingSettingsInput = {
  bookingEnabled: true,
  requireConfirmation: false,
  bookingBufferMinutes: 10,
  bookingMinLeadMinutes: 10,
  bookingOpenHour: 9,
  bookingCloseHour: 23,
  bookingCloseNextDay: false,
  paymentProvider: "NONE",
  bookingAdvanceAmount: 0
};

/** Date-window math is local-timezone-sensitive; pin UTC. */
beforeAll(() => {
  process.env.TZ = "UTC";
});
afterAll(() => {
  delete process.env.TZ;
});

const validPublicInput = {
  businessSlug: "royal-cue",
  tableId: "t1",
  startsAt: "2026-08-17T10:00:00.000Z",
  durationMinutes: 60,
  name: "Alice",
  phone: "+919876543210"
};

describe("createPublicBookingAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T08:00:00.000Z"));

    mocks.headers.mockReset();
    mocks.headers.mockResolvedValue({ get: () => "203.0.113.7" });
    mocks.checkRateLimit.mockReset();
    mocks.checkRateLimit.mockReturnValue(true);
    mocks.revalidatePath.mockReset();

    mocks.prisma.business.findUnique.mockReset();
    mocks.prisma.business.findUnique.mockResolvedValue({ id: "biz-1", name: "Test Club" });
    mocks.prisma.businessSettings.findUnique.mockReset();
    mocks.prisma.businessSettings.findUnique.mockResolvedValue(bookSettings);
    mocks.prisma.clubTable.findFirst.mockReset();
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ id: "t1", number: "Table 1" });
    mocks.prisma.customer.findFirst.mockReset();
    mocks.prisma.customer.findFirst.mockResolvedValue(null);
    mocks.prisma.customer.create.mockReset();
    mocks.prisma.customer.create.mockResolvedValue({ id: "c1", name: "Alice", phone: "+919876543210" });
    mocks.prisma.booking.update.mockReset();

    mocks.prisma.$queryRaw.mockReset();
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    mocks.prisma.booking.findFirst.mockReset();
    mocks.prisma.booking.findFirst.mockResolvedValue(null);
    mocks.prisma.session.findFirst.mockReset();
    mocks.prisma.session.findFirst.mockResolvedValue(null);
    mocks.prisma.booking.create.mockReset();
    mocks.prisma.booking.create.mockResolvedValue({
      id: "book_ABC123",
      status: "CONFIRMED",
      startsAt: new Date("2026-08-17T10:00:00.000Z"),
      endsAt: new Date("2026-08-17T11:00:00.000Z")
    });
    mocks.prisma.$transaction.mockReset();
    mocks.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(mocks.prisma)
    );

    mocks.getActivePaymentProvider.mockReset();
    mocks.getActivePaymentProvider.mockReturnValue(null);
    mocks.createBookingPaymentLink.mockReset();
    mocks.createBookingPaymentLink.mockResolvedValue({
      paymentExternalId: "pl_1",
      paymentUrl: "https://pay.example/link"
    });
    mocks.sendBookingCreatedMessage.mockReset();
    mocks.sendBookingCreatedMessage.mockResolvedValue(true);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a confirmed booking (no advance) and returns its reference", async () => {
    const result = await createPublicBookingAction(validPublicInput);

    expect(result).toMatchObject({
      ok: true,
      booking: {
        id: "book_ABC123",
        reference: "ABC123",
        status: "CONFIRMED",
        startsAt: "2026-08-17T10:00:00.000Z",
        endsAt: "2026-08-17T11:00:00.000Z",
        tableNumber: "Table 1"
      },
      payment: null
    });
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("booking-ip:203.0.113.7", 30);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("booking-phone:+919876543210", 5);
    expect(mocks.prisma.customer.create).toHaveBeenCalledWith({
      data: { businessId: "biz-1", name: "Alice", phone: "+919876543210" }
    });
    expect(mocks.prisma.booking.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz-1",
        tableId: "t1",
        customerId: "c1",
        status: "CONFIRMED",
        startsAt: expect.any(Date),
        endsAt: expect.any(Date)
      }
    });
    expect(mocks.prisma.booking.update).not.toHaveBeenCalled();
    expect(mocks.sendBookingCreatedMessage).toHaveBeenCalledWith(
      "+919876543210",
      "Test Club",
      expect.objectContaining({ type: "created", reference: "ABC123", tableNumber: "Table 1", advanceAmount: 0 })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/bookings");
  });

  it("creates a PENDING booking when confirmation is required", async () => {
    mocks.prisma.businessSettings.findUnique.mockResolvedValue({
      ...bookSettings,
      requireConfirmation: true
    });
    // The persisted row status is what the action reports back.
    mocks.prisma.booking.create.mockResolvedValue({
      id: "book_ABC123",
      status: "PENDING",
      startsAt: new Date("2026-08-17T10:00:00.000Z"),
      endsAt: new Date("2026-08-17T11:00:00.000Z")
    });

    const result = await createPublicBookingAction(validPublicInput);

    if (!result.ok) throw new Error("expected a successful booking");
    expect(result.booking.status).toBe("PENDING");
    expect(mocks.prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" })
      })
    );
  });

  it("reuses an existing customer row instead of creating a duplicate", async () => {
    mocks.prisma.customer.findFirst.mockResolvedValue({ id: "c9", name: "Alice", phone: "+919876543210" });

    const result = await createPublicBookingAction(validPublicInput);

    expect(result.ok).toBe(true);
    expect(mocks.prisma.customer.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input with a generic failure", async () => {
    const result = await createPublicBookingAction({ ...validPublicInput, name: "" });

    expect(result).toEqual({ ok: false, message: "Booking could not be completed. Please try again." });
    expect(mocks.prisma.booking.create).not.toHaveBeenCalled();
  });

  it("blocks rate-limited clients and phones", async () => {
    mocks.checkRateLimit.mockReturnValue(false);

    const result = await createPublicBookingAction(validPublicInput);

    expect(result).toEqual({
      ok: false,
      message: "Bahut saare booking attempts — thodi der baad try karo."
    });
    expect(mocks.prisma.business.findUnique).not.toHaveBeenCalled();
  });

  it("rejects bookings for an unknown store slug", async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(null);

    const result = await createPublicBookingAction(validPublicInput);

    expect(result).toEqual({
      ok: false,
      message: "Store not found. Please check the booking link."
    });
  });

  it("rejects bookings when online booking is disabled", async () => {
    mocks.prisma.businessSettings.findUnique.mockResolvedValue({ ...bookSettings, bookingEnabled: false });

    const result = await createPublicBookingAction(validPublicInput);

    expect(result).toEqual({
      ok: false,
      message: "Online booking is currently disabled for this store."
    });
  });

  it("rejects bookings for a table that is no longer bookable", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue(null);

    const result = await createPublicBookingAction(validPublicInput);

    expect(result).toEqual({ ok: false, message: "Selected table is no longer bookable." });
  });

  it("rejects slots that have already passed", async () => {
    const result = await createPublicBookingAction({
      ...validPublicInput,
      startsAt: "2026-08-16T10:00:00.000Z"
    });

    expect(result).toEqual({
      ok: false,
      message: "That slot has already passed. Please pick another time."
    });
  });

  it("enforces the minimum lead time from settings", async () => {
    mocks.prisma.businessSettings.findUnique.mockResolvedValue({
      ...bookSettings,
      bookingMinLeadMinutes: 45
    });

    // 08:30 is after now (08:00) but inside the 45-minute lead window.
    const result = await createPublicBookingAction({
      ...validPublicInput,
      startsAt: "2026-08-17T08:30:00.000Z"
    });

    expect(result).toEqual({
      ok: false,
      message: "Please pick a slot at least 45 minutes from now."
    });
  });

  it("rejects slots outside business hours", async () => {
    const result = await createPublicBookingAction({
      ...validPublicInput,
      startsAt: "2026-08-17T23:30:00.000Z"
    });

    expect(result).toEqual({
      ok: false,
      message: "Bookings are only open during business hours. Please pick a valid slot."
    });
  });

  it("reports a slot conflict when another active booking overlaps (with buffer)", async () => {
    mocks.prisma.booking.findFirst.mockResolvedValue({ id: "book_OTHER" });

    const result = await createPublicBookingAction(validPublicInput);

    expect(result).toEqual({
      ok: false,
      message: "That slot was just booked by someone else. Please pick another time."
    });
    expect(mocks.prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        businessId: "biz-1",
        tableId: "t1",
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        startsAt: { lt: new Date("2026-08-17T11:10:00.000Z") },
        endsAt: { gt: new Date("2026-08-17T09:50:00.000Z") }
      },
      select: { id: true }
    });
    expect(mocks.prisma.booking.create).not.toHaveBeenCalled();
  });

  it("rejects a table that is currently in play", async () => {
    mocks.prisma.session.findFirst.mockResolvedValue({ id: "s1", status: "ACTIVE" });

    const result = await createPublicBookingAction(validPublicInput);

    expect(result).toEqual({
      ok: false,
      message: "This table is currently in play. Please pick a later slot."
    });
  });

  it("creates a payment link when advance is configured and a provider is active", async () => {
    mocks.prisma.businessSettings.findUnique.mockResolvedValue({
      ...bookSettings,
      paymentProvider: "RAZORPAY",
      bookingAdvanceAmount: 199
    });
    mocks.getActivePaymentProvider.mockReturnValue("razorpay");

    const result = await createPublicBookingAction(validPublicInput);

    if (!result.ok) throw new Error("expected a successful booking");
    expect(result.payment).toEqual({ provider: "razorpay", amount: 199, url: "https://pay.example/link" });
    expect(mocks.createBookingPaymentLink).toHaveBeenCalledWith({
      provider: "razorpay",
      reference: "ABC123",
      amount: 199,
      customerName: "Alice",
      customerPhone: "+919876543210",
      description: "Slot booking - Table 1 (Test Club)"
    });
    expect(mocks.prisma.booking.update).toHaveBeenCalledWith({
      where: { id: "book_ABC123" },
      data: {
        paymentStatus: "PENDING",
        paymentProvider: "razorpay",
        paymentExternalId: "pl_1",
        advanceAmount: 199
      }
    });
  });

  it("keeps the booking unpaid when payment-link creation fails", async () => {
    mocks.prisma.businessSettings.findUnique.mockResolvedValue({
      ...bookSettings,
      paymentProvider: "STRIPE",
      bookingAdvanceAmount: 100
    });
    mocks.getActivePaymentProvider.mockReturnValue("stripe");
    mocks.createBookingPaymentLink.mockRejectedValue(new Error("stripe down"));

    const result = await createPublicBookingAction(validPublicInput);

    if (!result.ok) throw new Error("expected a successful booking");
    expect(result.payment).toBeNull();
    expect(mocks.prisma.booking.update).not.toHaveBeenCalled();
  });

  it("still succeeds when the WhatsApp confirmation fails", async () => {
    mocks.sendBookingCreatedMessage.mockRejectedValue(new Error("whatsapp down"));

    const result = await createPublicBookingAction(validPublicInput);

    expect(result.ok).toBe(true);
  });

  it("returns a generic failure when a prisma call throws", async () => {
    mocks.prisma.business.findUnique.mockRejectedValueOnce(new Error("db down"));

    const result = await createPublicBookingAction(validPublicInput);

    expect(result).toEqual({ ok: false, message: "Booking could not be completed. Please try again." });
  });
});

describe("listBookableSlotsAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T10:30:00.000Z"));
    mocks.prisma.clubTable.findFirst.mockReset();
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ id: "t1", businessId: "biz-1" });
    mocks.prisma.businessSettings.findUnique.mockReset();
    mocks.prisma.businessSettings.findUnique.mockResolvedValue(bookSettings);
    mocks.prisma.booking.findMany.mockReset();
    mocks.prisma.booking.findMany.mockResolvedValue([]);
    mocks.prisma.session.findFirst.mockReset();
    mocks.prisma.session.findFirst.mockResolvedValue(null);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the generated slots for a known table", async () => {
    const result = await listBookableSlotsAction({
      tableId: "t1",
      dateKey: "2026-08-17",
      durationMinutes: 60
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots).toHaveLength(23);
      expect(result.slots[0]).toEqual({ iso: "2026-08-17T11:00:00.000Z", label: "11:00 AM", available: true });
    }
  });

  it("returns an empty result for an unknown table", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue(null);

    const result = await listBookableSlotsAction({ tableId: "ghost", dateKey: "2026-08-17", durationMinutes: 60 });

    expect(result).toEqual({ ok: false, slots: [] });
  });

  it("returns an empty result for invalid input", async () => {
    const result = await listBookableSlotsAction({ tableId: "", dateKey: "2026-08-17", durationMinutes: 60 });

    expect(result).toEqual({ ok: false, slots: [] });
  });
});

describe("confirmBookingAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.booking.updateMany.mockReset();
    mocks.prisma.booking.updateMany.mockResolvedValue({ count: 1 });
  });

  it("confirms a pending booking", async () => {
    const result = await confirmBookingAction({ bookingId: "b1" });

    expect(result).toEqual({ ok: true, message: "Booking confirmed." });
    expect(mocks.prisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: "b1", businessId: "biz-1", status: "PENDING" },
      data: { status: "CONFIRMED" }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/bookings");
  });

  it("returns ok:false for invalid input", async () => {
    const result = await confirmBookingAction({});

    expect(result).toEqual({ ok: false, message: "Booking could not be updated." });
    expect(mocks.prisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it("returns ok:false without bookings.manage permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await confirmBookingAction({ bookingId: "b1" });

    expect(result).toEqual({ ok: false, message: "Booking could not be updated." });
    expect(mocks.prisma.booking.updateMany).not.toHaveBeenCalled();
  });
});

describe("cancelBookingAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.booking.findFirst.mockReset();
    mocks.prisma.booking.findFirst.mockResolvedValue({
      id: "b1",
      startsAt: new Date("2026-08-17T10:00:00.000Z"),
      endsAt: new Date("2026-08-17T11:00:00.000Z"),
      customer: { phone: "+919876543210" },
      table: { number: "Table 1" }
    });
    mocks.prisma.booking.update.mockReset();
    mocks.prisma.booking.update.mockResolvedValue({});
    mocks.prisma.business.findUnique.mockReset();
    mocks.prisma.business.findUnique.mockResolvedValue({ name: "Test Club" });
    mocks.sendBookingCancelledMessage.mockReset();
    mocks.sendBookingCancelledMessage.mockResolvedValue(true);
  });

  it("cancels the booking and notifies the customer", async () => {
    const result = await cancelBookingAction({ bookingId: "b1" });

    expect(result).toEqual({ ok: true, message: "Booking cancelled." });
    expect(mocks.prisma.booking.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "CANCELLED" }
    });
    expect(mocks.sendBookingCancelledMessage).toHaveBeenCalledWith(
      "+919876543210",
      "Test Club",
      expect.objectContaining({ type: "cancelled", reference: "B1", tableNumber: "Table 1" })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/bookings");
  });

  it("falls back to a store name when the business is missing", async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(null);

    await cancelBookingAction({ bookingId: "b1" });

    expect(mocks.sendBookingCancelledMessage).toHaveBeenCalledWith(
      "+919876543210",
      "Store",
      expect.anything()
    );
  });

  it("skips the WhatsApp message when the booking has no customer phone", async () => {
    mocks.prisma.booking.findFirst.mockResolvedValue({
      id: "b1",
      startsAt: new Date("2026-08-17T10:00:00.000Z"),
      endsAt: new Date("2026-08-17T11:00:00.000Z"),
      customer: null,
      table: { number: "Table 1" }
    });

    const result = await cancelBookingAction({ bookingId: "b1" });

    expect(result.ok).toBe(true);
    expect(mocks.sendBookingCancelledMessage).not.toHaveBeenCalled();
  });

  it("returns ok:false when the booking is not found or not cancellable", async () => {
    mocks.prisma.booking.findFirst.mockResolvedValue(null);

    const result = await cancelBookingAction({ bookingId: "b1" });

    expect(result).toEqual({ ok: false, message: "Booking could not be cancelled." });
    expect(mocks.prisma.booking.update).not.toHaveBeenCalled();
  });

  it("returns ok:false without bookings.manage permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await cancelBookingAction({ bookingId: "b1" });

    expect(result).toEqual({ ok: false, message: "Booking could not be cancelled." });
    expect(mocks.prisma.booking.findFirst).not.toHaveBeenCalled();
  });
});

describe("markBookingPaidAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.booking.updateMany.mockReset();
    mocks.prisma.booking.updateMany.mockResolvedValue({ count: 1 });
  });

  it("marks unpaid/pending bookings as paid", async () => {
    const result = await markBookingPaidAction({ bookingId: "b1" });

    expect(result).toEqual({ ok: true, message: "Booking marked as paid." });
    expect(mocks.prisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: "b1", businessId: "biz-1", paymentStatus: { in: ["UNPAID", "PENDING"] } },
      data: { paymentStatus: "PAID" }
    });
  });

  it("returns ok:false for invalid input", async () => {
    const result = await markBookingPaidAction(null);

    expect(result).toEqual({ ok: false, message: "Payment status could not be updated." });
  });

  it("returns ok:false without bookings.manage permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await markBookingPaidAction({ bookingId: "b1" });

    expect(result).toEqual({ ok: false, message: "Payment status could not be updated." });
    expect(mocks.prisma.booking.updateMany).not.toHaveBeenCalled();
  });
});

describe("updateBookingSettingsAction (booking feature)", () => {
  beforeAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.businessSettings.upsert.mockReset();
    mocks.prisma.businessSettings.upsert.mockResolvedValue({});
  });

  it("upserts booking preferences", async () => {
    const result = await updateBookingSettingsAction(bookingSettingsInput);

    expect(result).toEqual({ ok: true, message: "Booking preferences saved." });
    expect(mocks.prisma.businessSettings.upsert).toHaveBeenCalledWith({
      where: { businessId: "biz-1" },
      update: bookingSettingsInput,
      create: { businessId: "biz-1", ...bookingSettingsInput }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("returns a generic failure for invalid input (no zod details here)", async () => {
    const result = await updateBookingSettingsAction({ ...bookingSettingsInput, bookingOpenHour: 25 });

    expect(result).toEqual({ ok: false, message: "Booking preferences could not be saved." });
    expect(mocks.prisma.businessSettings.upsert).not.toHaveBeenCalled();
  });

  it("returns ok:false without settings.update permission", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await updateBookingSettingsAction(bookingSettingsInput);

    expect(result).toEqual({ ok: false, message: "Booking preferences could not be saved." });
  });

  it("returns ok:false when the upsert throws", async () => {
    mocks.prisma.businessSettings.upsert.mockRejectedValueOnce(new Error("boom"));

    const result = await updateBookingSettingsAction(bookSettings);

    expect(result).toEqual({ ok: false, message: "Booking preferences could not be saved." });
  });
});

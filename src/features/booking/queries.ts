import { prisma } from "@/server/db/prisma";
import {
  ACTIVE_BOOKING_STATUSES,
  addMinutes,
  evaluateSlotAvailability,
  formatSlotTime,
  generateSlotStarts,
  toLocalDateKey
} from "@/server/domain/booking-slots";
import {
  buildBookingBusinessWindow,
  getActiveAndNextBusinessWindows,
  isBookingWindowDate
} from "@/server/domain/booking-settings";
import { getActivePaymentProvider } from "@/server/integrations/payments";
import { isWhatsAppConfigured } from "@/server/integrations/whatsapp";

export type PublicBookCatalog = {
  businessId: string;
  businessName: string;
  slug: string;
  bookingEnabled: boolean;
  requireConfirmation: boolean;
  bookingBufferMinutes: number;
  bookingMinLeadMinutes: number;
  bookingOpenHour: number;
  bookingCloseHour: number;
  bookingCloseNextDay: boolean;
  paymentProvider: "razorpay" | "stripe" | null;
  advanceAmount: number;
  whatsappConfigured: boolean;
  tables: Array<{
    id: string;
    number: string;
    gameType: string;
    pricingGroup: string;
  }>;
};

export type PublicSlot = {
  iso: string;
  label: string;
  available: boolean;
};

export async function ensureBookingSettingsFor(businessId: string) {
  // Skip if business doesn't exist — avoids FK constraint errors
  const businessExists = await prisma.business.count({ where: { id: businessId } });
  if (businessExists === 0) {
    return null;
  }
  const existing = await prisma.businessSettings.findUnique({ where: { businessId } });
  if (existing) {
    return existing;
  }
  return prisma.businessSettings.create({ data: { businessId } });
}

export async function getPublicBookCatalog(businessSlug: string): Promise<PublicBookCatalog | null> {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      settings: true,
      tables: {
        where: { active: true },
        orderBy: [{ gameType: "asc" }, { number: "asc" }]
      }
    }
  });

  if (!business) {
    return null;
  }

  const settings = await ensureBookingSettingsFor(business.id);
  if (!settings) {
    return null;
  }

  return {
    businessId: business.id,
    businessName: business.name,
    slug: business.slug,
    bookingEnabled: settings.bookingEnabled,
    requireConfirmation: settings.requireConfirmation,
    bookingBufferMinutes: settings.bookingBufferMinutes,
    bookingMinLeadMinutes: settings.bookingMinLeadMinutes,
    bookingOpenHour: settings.bookingOpenHour,
    bookingCloseHour: settings.bookingCloseHour,
    bookingCloseNextDay: settings.bookingCloseNextDay,
    paymentProvider: getActivePaymentProvider(settings.paymentProvider),
    advanceAmount: Number(settings.bookingAdvanceAmount),
    whatsappConfigured: isWhatsAppConfigured(),
    tables: business.tables.map((table) => ({
      id: table.id,
      number: table.number,
      gameType: table.gameType,
      pricingGroup: table.pricingGroup
    }))
  };
}

export async function listBookableSlots(
  businessId: string,
  tableId: string,
  dateKey: string,
  durationMinutes: number
): Promise<PublicSlot[]> {
  const settings = await ensureBookingSettingsFor(businessId);
  if (!settings) {
    return [];
  }

  if (
    !isBookingWindowDate(
      dateKey,
      new Date(),
      settings.bookingOpenHour,
      settings.bookingCloseHour,
      settings.bookingCloseNextDay
    ) ||
    durationMinutes <= 0
  ) {
    return [];
  }

  const table = await prisma.clubTable.findFirst({
    where: { id: tableId, businessId, active: true }
  });
  if (!table) {
    return [];
  }

  const dayStart = new Date(`${dateKey}T00:00:00`);
  const { openTime, closeTime } = buildBookingBusinessWindow(
    dayStart,
    settings.bookingOpenHour,
    settings.bookingCloseHour,
    settings.bookingCloseNextDay
  );

  const [existingBookings, activeSession] = await Promise.all([
    prisma.booking.findMany({
      where: {
        businessId,
        tableId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        // Use the business window (which may span to the next day) instead of the calendar day.
        startsAt: { lt: closeTime },
        endsAt: { gt: openTime }
      },
      select: { startsAt: true, endsAt: true }
    }),
    prisma.session.findFirst({
      where: { businessId, tableId, status: "ACTIVE" }
    })
  ]);

  let candidateStarts = generateSlotStarts(
    dateKey,
    settings.bookingOpenHour,
    settings.bookingCloseHour,
    durationMinutes,
    settings.bookingCloseNextDay
  );

  const blockedUntil = activeSession ? addMinutes(activeSession.startedAt, 120) : null;

  const evaluated = evaluateSlotAvailability(
    candidateStarts,
    durationMinutes,
    existingBookings,
    settings.bookingBufferMinutes,
    settings.bookingMinLeadMinutes
  );

  const now = new Date();
  const leadTimeThreshold = now.getTime() + settings.bookingMinLeadMinutes * 60_000;

  return evaluated
    .filter((slot) => slot.startsAt.getTime() >= leadTimeThreshold)
    .map((slot) => {
      const blocked = blockedUntil && slot.startsAt.getTime() < blockedUntil.getTime();
      return {
        iso: slot.startsAt.toISOString(),
        label: formatSlotTime(slot.startsAt, true),
        available: slot.available && !blocked
      };
    });
}

export async function getUpcomingBookings(businessId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      businessId,
      endsAt: { gt: new Date() },
      status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW", "EXPIRED"] }
    },
    include: {
      table: { select: { number: true, gameType: true } },
      customer: { select: { name: true, phone: true } }
    },
    orderBy: [{ startsAt: "asc" }],
    take: 100
  });

  return bookings.map((booking) => ({
    id: booking.id,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentProvider: booking.paymentProvider,
    advanceAmount: Number(booking.advanceAmount),
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    tableNumber: booking.table.number,
    gameType: booking.table.gameType,
    customerName: booking.customer?.name ?? "Walk-in Guest",
    customerPhone: booking.customer?.phone ?? null,
    reference: booking.id.slice(-6).toUpperCase()
  }));
}

export async function getUpcomingBookingBadges(businessId: string): Promise<Map<string, {
  startsAt: string;
  endsAt: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN";
  customerName: string | null;
}>> {
  const settings = await ensureBookingSettingsFor(businessId);
  if (!settings) {
    return new Map();
  }
  const now = new Date();
  const [activeWindow, nextWindow] = getActiveAndNextBusinessWindows(
    now,
    settings.bookingOpenHour,
    settings.bookingCloseHour,
    settings.bookingCloseNextDay
  );

  const bookings = await prisma.booking.findMany({
    where: {
      businessId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startsAt: { gte: now, lt: nextWindow.closeTime }
    },
    select: {
      tableId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      customer: { select: { name: true } }
    },
    orderBy: [{ startsAt: "asc" }]
  });

  const byTable = new Map<
    string,
    {
      startsAt: string;
      endsAt: string;
      status: "PENDING" | "CONFIRMED" | "CHECKED_IN";
      customerName: string | null;
    }
  >();

  for (const booking of bookings) {
    if (byTable.has(booking.tableId)) continue;

    const start = booking.startsAt.getTime();
    const inActiveWindow = start >= activeWindow.openTime.getTime() && start < activeWindow.closeTime.getTime();
    const inNextWindow = start >= nextWindow.openTime.getTime() && start < nextWindow.closeTime.getTime();
    if (!inActiveWindow && !inNextWindow) continue;

    byTable.set(booking.tableId, {
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      status: booking.status as "PENDING" | "CONFIRMED" | "CHECKED_IN",
      customerName: booking.customer?.name ?? null
    });
  }

  return byTable;
}

export { toLocalDateKey };

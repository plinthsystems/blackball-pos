import { prisma } from "@/server/db/prisma";
import {
  ACTIVE_BOOKING_STATUSES,
  addMinutes,
  evaluateSlotAvailability,
  formatSlotTime,
  generateSlotStarts,
  isDateWithinWindow,
  toLocalDateKey
} from "@/server/domain/booking-slots";
import { getActivePaymentProvider } from "@/server/integrations/payments";
import { isWhatsAppConfigured } from "@/server/integrations/whatsapp";

export type PublicBookCatalog = {
  businessId: string;
  businessName: string;
  slug: string;
  bookingEnabled: boolean;
  requireConfirmation: boolean;
  bookingBufferMinutes: number;
  bookingOpenHour: number;
  bookingCloseHour: number;
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

  return {
    businessId: business.id,
    businessName: business.name,
    slug: business.slug,
    bookingEnabled: settings.bookingEnabled,
    requireConfirmation: settings.requireConfirmation,
    bookingBufferMinutes: settings.bookingBufferMinutes,
    bookingOpenHour: settings.bookingOpenHour,
    bookingCloseHour: settings.bookingCloseHour,
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

  if (
    !isDateWithinWindow(dateKey, settings.bookingWindowDays) ||
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
  const dayEnd = new Date(`${dateKey}T23:59:59`);

  const [existingBookings, activeSession] = await Promise.all([
    prisma.booking.findMany({
      where: {
        businessId,
        tableId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart }
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
    durationMinutes
  );

  const blockedUntil = activeSession ? addMinutes(activeSession.startedAt, 120) : null;

  const evaluated = evaluateSlotAvailability(
    candidateStarts,
    durationMinutes,
    existingBookings,
    settings.bookingBufferMinutes
  );

  return evaluated.map((slot) => {
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

export async function getUpcomingBookingBadges(businessId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      businessId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startsAt: { gte: new Date(), lt: tomorrowStart }
    },
    select: {
      tableId: true,
      startsAt: true,
      endsAt: true,
      status: true
    },
    orderBy: [{ startsAt: "asc" }]
  });

  const byTable = new Map<
    string,
    { startsAt: string; endsAt: string; status: "PENDING" | "CONFIRMED" | "CHECKED_IN" }
  >();
  for (const booking of bookings) {
    if (!byTable.has(booking.tableId)) {
      byTable.set(booking.tableId, {
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        status: booking.status as "PENDING" | "CONFIRMED" | "CHECKED_IN"
      });
    }
  }

  return byTable;
}

export { toLocalDateKey };

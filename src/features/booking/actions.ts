"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { headers } from "next/headers";
import {
  ACTIVE_BOOKING_STATUSES,
  addMinutes,
  isIntervalOverlapping
} from "@/server/domain/booking-slots";
import {
  createBookingPaymentLink,
  getActivePaymentProvider
} from "@/server/integrations/payments";
import {
  sendBookingCancelledMessage,
  sendBookingCreatedMessage
} from "@/server/integrations/whatsapp";
import { ensureBookingSettingsFor, listBookableSlots } from "./queries";

const publicBookingSchema = z.object({
  businessSlug: z.string().trim().min(1),
  tableId: z.string().trim().min(1),
  startsAt: z.string().trim().min(1),
  durationMinutes: z.number().int().min(30).max(240),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20)
});

const manageBookingSchema = z.object({
  bookingId: z.string().trim().min(1)
});

const bookingSettingsSchema = z.object({
  bookingEnabled: z.boolean(),
  requireConfirmation: z.boolean(),
  bookingBufferMinutes: z.number().int().min(0).max(120),
  bookingOpenHour: z.number().int().min(6).max(14),
  bookingCloseHour: z.number().int().min(14).max(24),
  paymentProvider: z.enum(["NONE", "RAZORPAY", "STRIPE"]),
  bookingAdvanceAmount: z.number().min(0).max(100000)
});

class SlotUnavailableError extends Error {}

export type PublicBookingResult =
  | {
      ok: true;
      booking: {
        id: string;
        reference: string;
        status: string;
        startsAt: string;
        endsAt: string;
        tableNumber: string;
      };
      payment: { provider: "razorpay" | "stripe"; amount: number; url: string } | null;
    }
  | { ok: false; message: string };

export async function createPublicBookingAction(input: unknown): Promise<PublicBookingResult> {
  try {
    const parsed = publicBookingSchema.parse(input);

    const headerStore = await headers();
    const clientIp = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (
      !checkRateLimit(`booking-ip:${clientIp}`, 30) ||
      !checkRateLimit(`booking-phone:${parsed.phone}`, 5)
    ) {
      return { ok: false, message: "Bahut saare booking attempts — thodi der baad try karo." };
    }

    const business = await prisma.business.findUnique({
      where: { slug: parsed.businessSlug },
      select: { id: true, name: true }
    });
    if (!business) {
      return { ok: false, message: "Store not found. Please check the booking link." };
    }

    const settings = await ensureBookingSettingsFor(business.id);
    if (!settings.bookingEnabled) {
      return { ok: false, message: "Online booking is currently disabled for this store." };
    }

    const table = await prisma.clubTable.findFirst({
      where: { id: parsed.tableId, businessId: business.id, active: true }
    });
    if (!table) {
      return { ok: false, message: "Selected table is no longer bookable." };
    }

    const startsAt = new Date(parsed.startsAt);
    const endsAt = addMinutes(startsAt, parsed.durationMinutes);
    if (Number.isNaN(startsAt.getTime()) || endsAt.getTime() <= Date.now()) {
      return { ok: false, message: "That slot has already passed. Please pick another time." };
    }

    const phone = parsed.phone;
    let customer = await prisma.customer.findFirst({
      where: { businessId: business.id, phone }
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { businessId: business.id, name: parsed.name, phone }
      });
    }

    const status = settings.requireConfirmation ? "PENDING" : "CONFIRMED";
    let booking: { id: string; status: string; startsAt: Date; endsAt: Date } | null = null;

    try {
      booking = await prisma.$transaction(async (tx) => {
        // Lock the table row so concurrent bookings for the same table serialize.
        await tx.$queryRaw`SELECT id FROM "ClubTable" WHERE id = ${table.id} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id}`;

        const conflict = await tx.booking.findFirst({
          where: {
            businessId: business.id,
            tableId: table.id,
            status: { in: [...ACTIVE_BOOKING_STATUSES] },
            startsAt: { lt: addMinutes(endsAt, settings.bookingBufferMinutes) },
            endsAt: { gt: addMinutes(startsAt, -settings.bookingBufferMinutes) }
          },
          select: { id: true }
        });
        if (conflict) {
          throw new SlotUnavailableError(
            "That slot was just booked by someone else. Please pick another time."
          );
        }

        const existingActive = await tx.session.findFirst({
          where: { businessId: business.id, tableId: table.id, status: "ACTIVE" }
        });
        if (existingActive) {
          throw new SlotUnavailableError("This table is currently in play. Please pick a later slot.");
        }

        return tx.booking.create({
          data: {
            businessId: business.id,
            tableId: table.id,
            customerId: customer!.id,
            status,
            startsAt,
            endsAt
          }
        });
      });
    } catch (error) {
      if (error instanceof SlotUnavailableError) {
        return { ok: false, message: error.message };
      }
      throw error;
    }

    if (!booking) {
      return { ok: false, message: "Booking could not be completed. Please try again." };
    }

    const bookingRef = booking.id.slice(-6).toUpperCase();
    const activeProvider = getActivePaymentProvider(settings.paymentProvider);
    const advanceAmount = Number(settings.bookingAdvanceAmount);
    let payment: {
      provider: "razorpay" | "stripe";
      amount: number;
      url: string;
    } | null = null;

    if (advanceAmount > 0 && activeProvider) {
      try {
        const paymentLink = await createBookingPaymentLink({
          provider: activeProvider,
          reference: bookingRef,
          amount: advanceAmount,
          customerName: customer.name,
          customerPhone: phone,
          description: `Slot booking - ${table.number} (${business.name})`
        });

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: "PENDING",
            paymentProvider: activeProvider,
            paymentExternalId: paymentLink.paymentExternalId,
            advanceAmount
          }
        });

        payment = {
          provider: activeProvider,
          amount: advanceAmount,
          url: paymentLink.paymentUrl
        };
      } catch {
        // Payment link failed -> booking stays UNPAID; customer pays at store.
      }
    }

    void sendBookingCreatedMessage(phone, business.name, {
      type: "created",
      reference: bookingRef,
      tableNumber: table.number,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      advanceAmount
    }).catch(() => {});

    revalidatePath("/bookings");
    return {
      ok: true,
      booking: {
        id: booking.id,
        reference: bookingRef,
        status: booking.status,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        tableNumber: table.number
      },
      payment
    };
  } catch {
    return { ok: false, message: "Booking could not be completed. Please try again." };
  }
}

export async function listBookableSlotsAction(input: unknown) {
  try {
    const parsed = z
      .object({
        tableId: z.string().trim().min(1),
        dateKey: z.string().trim().min(1),
        durationMinutes: z.number().int().min(30).max(240)
      })
      .parse(input);

    const table = await prisma.clubTable.findFirst({
      where: { id: parsed.tableId },
      select: { businessId: true }
    });
    if (!table) {
      return { ok: false as const, slots: [] };
    }

    const slots = await listBookableSlots(table.businessId, parsed.tableId, parsed.dateKey, parsed.durationMinutes);
    return { ok: true as const, slots };
  } catch {
    return { ok: false as const, slots: [] };
  }
}

export async function confirmBookingAction(input: unknown) {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bookings.manage");
    const { bookingId } = manageBookingSchema.parse(input);

    await prisma.booking.updateMany({
      where: { id: bookingId, businessId: context.businessId, status: "PENDING" },
      data: { status: "CONFIRMED" }
    });
    revalidatePath("/bookings");
    return { ok: true, message: "Booking confirmed." };
  } catch {
    return { ok: false, message: "Booking could not be updated." };
  }
}

export async function cancelBookingAction(input: unknown) {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bookings.manage");
    const { bookingId } = manageBookingSchema.parse(input);

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        businessId: context.businessId,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }
      },
      include: { customer: { select: { phone: true } }, table: { select: { number: true } } }
    });
    if (!booking) {
      return { ok: false, message: "Booking could not be cancelled." };
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" }
    });

    const business = await prisma.business.findUnique({
      where: { id: context.businessId },
      select: { name: true }
    });

    if (booking.customer?.phone) {
      void sendBookingCancelledMessage(booking.customer.phone, business?.name ?? "Store", {
        type: "cancelled",
        reference: booking.id.slice(-6).toUpperCase(),
        tableNumber: booking.table.number,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString()
      }).catch(() => {});
    }

    revalidatePath("/bookings");
    return { ok: true, message: "Booking cancelled." };
  } catch {
    return { ok: false, message: "Booking could not be cancelled." };
  }
}

export async function markBookingPaidAction(input: unknown) {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "bookings.manage");
    const { bookingId } = manageBookingSchema.parse(input);

    await prisma.booking.updateMany({
      where: {
        id: bookingId,
        businessId: context.businessId,
        paymentStatus: { in: ["UNPAID", "PENDING"] }
      },
      data: { paymentStatus: "PAID" }
    });
    revalidatePath("/bookings");
    return { ok: true, message: "Booking marked as paid." };
  } catch {
    return { ok: false, message: "Payment status could not be updated." };
  }
}

export async function updateBookingSettingsAction(input: unknown) {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "settings.update");
    const parsed = bookingSettingsSchema.parse(input);

    await prisma.businessSettings.upsert({
      where: { businessId: context.businessId },
      update: parsed,
      create: { businessId: context.businessId, ...parsed }
    });

    revalidatePath("/settings");
    return { ok: true, message: "Booking preferences saved." };
  } catch {
    return { ok: false, message: "Booking preferences could not be saved." };
  }
}

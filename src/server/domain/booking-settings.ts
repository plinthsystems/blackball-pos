import { z } from "zod";
import { toLocalDateKey } from "./booking-slots";

export const bookingSettingsSchema = z
  .object({
    bookingEnabled: z.boolean(),
    requireConfirmation: z.boolean(),
    bookingBufferMinutes: z.number().int().min(0).max(120),
    bookingMinLeadMinutes: z.number().int().min(0).max(240),
    bookingOpenHour: z.number().int().min(0).max(23),
    bookingCloseHour: z.number().int().min(0).max(24),
    bookingCloseNextDay: z.boolean(),
    paymentProvider: z.enum(["NONE", "RAZORPAY", "STRIPE"]),
    bookingAdvanceAmount: z.number().min(0).max(100000)
  })
  .refine(
    (data) => {
      if (data.bookingCloseNextDay) return true;
      return data.bookingCloseHour > data.bookingOpenHour;
    },
    {
      message: "Closing hour must be after opening hour when closing on the same day.",
      path: ["bookingCloseHour"]
    }
  );

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;

export function buildBookingBusinessWindow(
  baseDate: Date,
  openHour: number,
  closeHour: number,
  closeNextDay: boolean
): { openTime: Date; closeTime: Date } {
  const openTime = new Date(baseDate);
  openTime.setHours(openHour, 0, 0, 0);

  const closeTime = new Date(baseDate);
  closeTime.setHours(closeHour, 0, 0, 0);
  if (closeNextDay) {
    closeTime.setDate(closeTime.getDate() + 1);
  }

  return { openTime, closeTime };
}

export type BusinessWindow = {
  dateKey: string;
  openTime: Date;
  closeTime: Date;
  label: string;
};

function formatWindowLabel(openTime: Date, now: Date): string {
  const openDateKey = toLocalDateKey(openTime);
  const nowKey = toLocalDateKey(now);

  const nextDay = new Date(now);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayKey = toLocalDateKey(nextDay);

  if (openDateKey === nowKey) {
    return "Today";
  }
  if (openDateKey === nextDayKey) {
    return "Tomorrow";
  }

  const prevDay = new Date(now);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevDayKey = toLocalDateKey(prevDay);
  if (openDateKey === prevDayKey) {
    return "Tonight";
  }

  return openTime.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

export function getBusinessWindowsAround(
  now: Date,
  openHour: number,
  closeHour: number,
  closeNextDay: boolean
): BusinessWindow[] {
  const windows: BusinessWindow[] = [];
  for (let offset = -1; offset <= 2; offset++) {
    const base = new Date(now);
    base.setDate(base.getDate() + offset);
    base.setHours(0, 0, 0, 0);

    const { openTime, closeTime } = buildBookingBusinessWindow(base, openHour, closeHour, closeNextDay);
    windows.push({
      dateKey: toLocalDateKey(base),
      openTime,
      closeTime,
      label: formatWindowLabel(openTime, now)
    });
  }
  return windows;
}

export function getActiveAndNextBusinessWindows(
  now: Date,
  openHour: number,
  closeHour: number,
  closeNextDay: boolean
): [BusinessWindow, BusinessWindow] {
  const windows = getBusinessWindowsAround(now, openHour, closeHour, closeNextDay);

  const activeIndex = windows.findIndex((w) => w.openTime <= now && now < w.closeTime);
  if (activeIndex !== -1) {
    return [windows[activeIndex], windows[activeIndex + 1]];
  }

  const nextIndex = windows.findIndex((w) => w.openTime > now);
  if (nextIndex !== -1 && nextIndex < windows.length - 1) {
    return [windows[nextIndex], windows[nextIndex + 1]];
  }

  return [windows[1], windows[2]];
}

export function findBusinessWindowForSlot(
  startsAt: Date,
  now: Date,
  openHour: number,
  closeHour: number,
  closeNextDay: boolean
): BusinessWindow | null {
  const windows = getBusinessWindowsAround(now, openHour, closeHour, closeNextDay);
  return windows.find((w) => startsAt.getTime() >= w.openTime.getTime() && startsAt.getTime() < w.closeTime.getTime()) ?? null;
}

export function isBookingWindowDate(
  dateKey: string,
  now: Date,
  openHour: number,
  closeHour: number,
  closeNextDay: boolean
): boolean {
  const [active, next] = getActiveAndNextBusinessWindows(now, openHour, closeHour, closeNextDay);
  return dateKey === active.dateKey || dateKey === next.dateKey;
}

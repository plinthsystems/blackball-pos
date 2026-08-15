export const BOOKING_DURATIONS = [30, 60, 90, 120] as const;

export type BookingDuration = (typeof BOOKING_DURATIONS)[number];

export const SLOT_STEP_MINUTES = 30;

export const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isDateWithinWindow(dateKey: string, windowDays: number): boolean {
  return isBookingDayToday(dateKey);
}

export function isBookingDayToday(dateKey: string): boolean {
  return dateKey === toLocalDateKey(new Date());
}

export function generateSlotStarts(
  dateKey: string,
  openHour: number,
  closeHour: number,
  durationMinutes: number,
  closeNextDay = false
): Date[] {
  const starts: Date[] = [];
  const open = new Date(`${dateKey}T00:00:00`);
  open.setHours(openHour, 0, 0, 0);
  const close = new Date(`${dateKey}T00:00:00`);
  close.setHours(closeHour, 0, 0, 0);
  if (closeNextDay) {
    close.setDate(close.getDate() + 1);
  }

  let cursor = open.getTime();
  while (cursor + durationMinutes * 60_000 <= close.getTime()) {
    starts.push(new Date(cursor));
    cursor += SLOT_STEP_MINUTES * 60_000;
  }
  return starts;
}

export function formatSlotTime(date: Date, includeMinutes: boolean): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = includeMinutes ? `:${String(minutes).padStart(2, "0")}` : "";
  return `${displayHour}${displayMinutes} ${period}`;
}

export type BookedInterval = {
  startsAt: Date;
  endsAt: Date;
};

export function isIntervalOverlapping(
  candidate: { startsAt: Date; endsAt: Date },
  existing: BookedInterval,
  bufferMinutes: number
): boolean {
  return (
    candidate.startsAt.getTime() < existing.endsAt.getTime() + bufferMinutes * 60_000 &&
    candidate.endsAt.getTime() > existing.startsAt.getTime() - bufferMinutes * 60_000
  );
}

export function evaluateSlotAvailability(
  candidateStarts: Date[],
  durationMinutes: number,
  existingBookings: BookedInterval[],
  bufferMinutes: number,
  minLeadMinutes = 90
): Array<{ startsAt: Date; endsAt: Date; available: boolean }> {
  const now = new Date();
  return candidateStarts.map((startsAt) => {
    const endsAt = addMinutes(startsAt, durationMinutes);

    if (startsAt.getTime() < now.getTime() + minLeadMinutes * 60_000) {
      return { startsAt, endsAt, available: false };
    }

    const overlaps = existingBookings.some((existing) =>
      isIntervalOverlapping({ startsAt, endsAt }, existing, bufferMinutes)
    );

    return { startsAt, endsAt, available: !overlaps };
  });
}

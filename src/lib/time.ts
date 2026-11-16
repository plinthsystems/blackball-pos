export const STORE_TIME_ZONE = "Asia/Kolkata";

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: STORE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatStoreDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function storeDateStart(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+05:30`);
}

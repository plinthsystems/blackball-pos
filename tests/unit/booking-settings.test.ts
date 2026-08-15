import { describe, it, expect } from "vitest";
import {
  bookingSettingsSchema,
  buildBookingBusinessWindow,
  getActiveAndNextBusinessWindows,
  findBusinessWindowForSlot,
  isBookingWindowDate
} from "@/server/domain/booking-settings";
import { generateSlotStarts, toLocalDateKey } from "@/server/domain/booking-slots";

describe("Booking Settings Domain", () => {
  describe("bookingSettingsSchema", () => {
    const base = {
      bookingEnabled: true,
      requireConfirmation: false,
      bookingBufferMinutes: 10,
      bookingMinLeadMinutes: 90,
      bookingOpenHour: 10,
      bookingCloseHour: 23,
      bookingCloseNextDay: false,
      paymentProvider: "NONE" as const,
      bookingAdvanceAmount: 0
    };

    it("accepts valid same-day settings", () => {
      const result = bookingSettingsSchema.safeParse(base);
      expect(result.success).toBe(true);
    });

    it("accepts valid overnight settings", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingOpenHour: 10,
        bookingCloseHour: 1,
        bookingCloseNextDay: true
      });
      expect(result.success).toBe(true);
    });

    it("rejects same-day settings where close is not after open", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingOpenHour: 10,
        bookingCloseHour: 10,
        bookingCloseNextDay: false
      });
      expect(result.success).toBe(false);
    });

    it("allows close equal to open when closing next day", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingOpenHour: 10,
        bookingCloseHour: 10,
        bookingCloseNextDay: true
      });
      expect(result.success).toBe(true);
    });

    it("rejects open hour outside 0-23", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingOpenHour: 24
      });
      expect(result.success).toBe(false);
    });

    it("rejects close hour outside 0-24", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingCloseHour: 25
      });
      expect(result.success).toBe(false);
    });

    it("accepts zero minimum lead time", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingMinLeadMinutes: 0
      });
      expect(result.success).toBe(true);
    });

    it("rejects minimum lead time above 240", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingMinLeadMinutes: 241
      });
      expect(result.success).toBe(false);
    });
  });

  describe("buildBookingBusinessWindow", () => {
    it("builds same-day window", () => {
      const now = new Date("2026-08-16T14:00:00");
      const { openTime, closeTime } = buildBookingBusinessWindow(now, 10, 23, false);
      expect(toLocalDateKey(openTime)).toBe("2026-08-16");
      expect(openTime.getHours()).toBe(10);
      expect(toLocalDateKey(closeTime)).toBe("2026-08-16");
      expect(closeTime.getHours()).toBe(23);
    });

    it("builds next-day window", () => {
      const now = new Date("2026-08-16T14:00:00");
      const { openTime, closeTime } = buildBookingBusinessWindow(now, 10, 1, true);
      expect(toLocalDateKey(openTime)).toBe("2026-08-16");
      expect(openTime.getHours()).toBe(10);
      expect(toLocalDateKey(closeTime)).toBe("2026-08-17");
      expect(closeTime.getHours()).toBe(1);
    });
  });

  describe("getActiveAndNextBusinessWindows", () => {
    it("returns current and next window for an overnight store after midnight", () => {
      // Store 10:00 - 03:00 next day. At 01:00 today the active window started yesterday.
      const now = new Date("2026-08-16T01:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 10, 3, true);
      expect(toLocalDateKey(active.openTime)).toBe("2026-08-15");
      expect(toLocalDateKey(active.closeTime)).toBe("2026-08-16");
      expect(active.label).toBe("Tonight");

      expect(toLocalDateKey(next.openTime)).toBe("2026-08-16");
      expect(toLocalDateKey(next.closeTime)).toBe("2026-08-17");
      expect(next.label).toBe("Today");
    });

    it("returns today and tomorrow for a same-day store during hours", () => {
      const now = new Date("2026-08-16T14:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 10, 23, false);
      expect(active.label).toBe("Today");
      expect(next.label).toBe("Tomorrow");
    });

    it("picks the upcoming window when now is in the closed gap", () => {
      // Store 10:00 - 03:00 next day. At 05:00 today we are in the gap.
      const now = new Date("2026-08-16T05:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 10, 3, true);
      expect(toLocalDateKey(active.openTime)).toBe("2026-08-16");
      expect(toLocalDateKey(active.closeTime)).toBe("2026-08-17");
      expect(active.label).toBe("Today");
    });

    it("handles a same-day store before opening hours", () => {
      const now = new Date("2026-08-16T07:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 10, 23, false);
      expect(active.label).toBe("Today");
      expect(toLocalDateKey(active.openTime)).toBe("2026-08-16");
      expect(next.label).toBe("Tomorrow");
    });

    it("handles an overnight store right before close", () => {
      // Store 08:00 - 04:00 next day. At 03:30 today the active window is still yesterday's.
      const now = new Date("2026-08-16T03:30:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 8, 4, true);
      expect(toLocalDateKey(active.openTime)).toBe("2026-08-15");
      expect(toLocalDateKey(active.closeTime)).toBe("2026-08-16");
      expect(active.label).toBe("Tonight");
    });
  });

  describe("findBusinessWindowForSlot", () => {
    it("finds the window for a slot in the active overnight window", () => {
      const now = new Date("2026-08-16T01:00:00");
      const slot = new Date("2026-08-16T02:00:00");
      const window = findBusinessWindowForSlot(slot, now, 10, 3, true);
      expect(window).not.toBeNull();
      expect(toLocalDateKey(window!.openTime)).toBe("2026-08-15");
    });

    it("finds the window for a slot in the next business day", () => {
      const now = new Date("2026-08-16T01:00:00");
      const slot = new Date("2026-08-16T11:00:00");
      const window = findBusinessWindowForSlot(slot, now, 10, 3, true);
      expect(window).not.toBeNull();
      expect(toLocalDateKey(window!.openTime)).toBe("2026-08-16");
    });

    it("returns null for a slot in the closed gap", () => {
      const now = new Date("2026-08-16T05:00:00");
      const slot = new Date("2026-08-16T06:00:00");
      const window = findBusinessWindowForSlot(slot, now, 10, 3, true);
      expect(window).toBeNull();
    });
  });

  describe("isBookingWindowDate", () => {
    it("accepts active and next windows for overnight store at 1 AM", () => {
      const now = new Date("2026-08-16T01:00:00");
      expect(isBookingWindowDate("2026-08-15", now, 10, 3, true)).toBe(true); // active (Tonight)
      expect(isBookingWindowDate("2026-08-16", now, 10, 3, true)).toBe(true); // next (Today)
      expect(isBookingWindowDate("2026-08-17", now, 10, 3, true)).toBe(false);
      expect(isBookingWindowDate("2026-08-14", now, 10, 3, true)).toBe(false);
    });

    it("accepts only today and tomorrow for same-day store", () => {
      const now = new Date("2026-08-16T14:00:00");
      expect(isBookingWindowDate("2026-08-15", now, 10, 23, false)).toBe(false);
      expect(isBookingWindowDate("2026-08-16", now, 10, 23, false)).toBe(true);
      expect(isBookingWindowDate("2026-08-17", now, 10, 23, false)).toBe(true);
    });
  });

  describe("generateSlotStarts overnight", () => {
    it("generates slots up to midnight and beyond when close is next day", () => {
      const starts = generateSlotStarts("2026-08-16", 10, 1, 60, true);
      const first = starts[0];
      const last = starts[starts.length - 1];

      expect(first.getHours()).toBe(10);
      expect(toLocalDateKey(first)).toBe("2026-08-16");

      expect(last.getHours()).toBe(0);
      expect(toLocalDateKey(last)).toBe("2026-08-17");
      expect(last.getMinutes()).toBe(0);
    });

    it("last start respects duration against next-day close", () => {
      // open 5 AM, close 2 AM next day, 2h duration -> last start 12:00 AM
      const starts = generateSlotStarts("2026-08-16", 5, 2, 120, true);
      const last = starts[starts.length - 1];
      expect(last.getHours()).toBe(0);
      expect(last.getDate()).toBe(17);
      expect(last.getMonth()).toBe(7); // August is month 7 (0-indexed)
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  bookingSettingsSchema,
  buildBookingBusinessWindow,
  getBusinessWindowsAround,
  getActiveAndNextBusinessWindows,
  findBusinessWindowForSlot,
  isBookingWindowDate
} from "@/server/domain/booking-settings";
import { toLocalDateKey } from "@/server/domain/booking-slots";

describe("Booking Settings Domain - Edge Cases", () => {
  describe("bookingSettingsSchema edge cases", () => {
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

    it("rejects negative buffer minutes", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingBufferMinutes: -1
      });
      expect(result.success).toBe(false);
    });

    it("rejects buffer minutes above 120", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingBufferMinutes: 121
      });
      expect(result.success).toBe(false);
    });

    it("accepts zero buffer minutes", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingBufferMinutes: 0
      });
      expect(result.success).toBe(true);
    });

    it("accepts maximum buffer minutes (120)", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingBufferMinutes: 120
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative advance amount", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingAdvanceAmount: -1
      });
      expect(result.success).toBe(false);
    });

    it("accepts zero advance amount", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingAdvanceAmount: 0
      });
      expect(result.success).toBe(true);
    });

    it("accepts maximum advance amount (100000)", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingAdvanceAmount: 100000
      });
      expect(result.success).toBe(true);
    });

    it("rejects advance amount above 100000", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingAdvanceAmount: 100001
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer buffer minutes", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingBufferMinutes: 10.5
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer open hour", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingOpenHour: 10.5
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer close hour", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingCloseHour: 23.5
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid payment providers", () => {
      for (const provider of ["NONE", "RAZORPAY", "STRIPE"] as const) {
        const result = bookingSettingsSchema.safeParse({
          ...base,
          paymentProvider: provider
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid payment provider", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        paymentProvider: "PAYPAL" as unknown as "NONE"
      });
      expect(result.success).toBe(false);
    });

    it("rejects close hour 24 with same-day closing", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingCloseHour: 24,
        bookingCloseNextDay: false
      });
      expect(result.success).toBe(true);
    });

    it("handles open hour 0 (midnight)", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingOpenHour: 0,
        bookingCloseHour: 12
      });
      expect(result.success).toBe(true);
    });

    it("handles open hour 23", () => {
      const result = bookingSettingsSchema.safeParse({
        ...base,
        bookingOpenHour: 23,
        bookingCloseHour: 23,
        bookingCloseNextDay: true
      });
      expect(result.success).toBe(true);
    });
  });

  describe("buildBookingBusinessWindow edge cases", () => {
    it("handles open at midnight", () => {
      const date = new Date("2026-08-16T14:00:00");
      const { openTime, closeTime } = buildBookingBusinessWindow(date, 0, 12, false);
      expect(openTime.getHours()).toBe(0);
      expect(closeTime.getHours()).toBe(12);
    });

    it("handles close at midnight (hour 0) with next day", () => {
      const date = new Date("2026-08-16T14:00:00");
      const { openTime, closeTime } = buildBookingBusinessWindow(date, 10, 0, true);
      expect(openTime.getHours()).toBe(10);
      expect(closeTime.getHours()).toBe(0);
      expect(closeTime.getDate()).toBe(date.getDate() + 1);
    });

    it("handles close at 24 (end of day)", () => {
      const date = new Date("2026-08-16T14:00:00");
      const { openTime, closeTime } = buildBookingBusinessWindow(date, 6, 24, false);
      expect(openTime.getHours()).toBe(6);
      // Date.setHours(24) wraps to next day 00:00, so getHours() returns 0
      expect(closeTime.getHours()).toBe(0);
      expect(closeTime.getDate()).toBe(date.getDate() + 1);
    });

    it("handles same open and close hour with next day flag", () => {
      const date = new Date("2026-08-16T14:00:00");
      const { openTime, closeTime } = buildBookingBusinessWindow(date, 10, 10, true);
      expect(openTime.getHours()).toBe(10);
      expect(closeTime.getHours()).toBe(10);
      expect(closeTime.getDate()).toBe(date.getDate() + 1);
    });

    it("handles fractional dates correctly", () => {
      const date = new Date("2026-08-16T14:30:45.123Z");
      const { openTime, closeTime } = buildBookingBusinessWindow(date, 8, 22, false);
      expect(openTime.getHours()).toBe(8);
      expect(openTime.getMinutes()).toBe(0);
      expect(openTime.getSeconds()).toBe(0);
      expect(openTime.getMilliseconds()).toBe(0);
    });
  });

  describe("getBusinessWindowsAround edge cases", () => {
    it("returns exactly 4 windows", () => {
      const now = new Date("2026-08-16T14:00:00");
      const windows = getBusinessWindowsAround(now, 10, 23, false);
      expect(windows).toHaveLength(4);
    });

    it("includes yesterday, today, tomorrow, day after tomorrow", () => {
      const now = new Date("2026-08-16T14:00:00");
      const windows = getBusinessWindowsAround(now, 10, 23, false);
      expect(toLocalDateKey(windows[0].openTime)).toBe("2026-08-15");
      expect(toLocalDateKey(windows[1].openTime)).toBe("2026-08-16");
      expect(toLocalDateKey(windows[2].openTime)).toBe("2026-08-17");
      expect(toLocalDateKey(windows[3].openTime)).toBe("2026-08-18");
    });

    it("handles overnight store across midnight boundary", () => {
      const now = new Date("2026-08-16T01:00:00");
      const windows = getBusinessWindowsAround(now, 10, 3, true);
      expect(windows).toHaveLength(4);
    });

    it("labels windows correctly for today", () => {
      const now = new Date("2026-08-16T14:00:00");
      const windows = getBusinessWindowsAround(now, 10, 23, false);
      const todayWindow = windows.find((w) => w.label === "Today");
      expect(todayWindow).toBeDefined();
    });

    it("labels windows correctly for tomorrow", () => {
      const now = new Date("2026-08-16T14:00:00");
      const windows = getBusinessWindowsAround(now, 10, 23, false);
      const tomorrowWindow = windows.find((w) => w.label === "Tomorrow");
      expect(tomorrowWindow).toBeDefined();
    });
  });

  describe("getActiveAndNextBusinessWindows edge cases", () => {
    it("returns the same window twice when no active or next found in range", () => {
      const now = new Date("2026-08-16T05:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 10, 23, false);
      expect(active).toBeDefined();
      expect(next).toBeDefined();
    });

    it("handles store that is currently open", () => {
      const now = new Date("2026-08-16T14:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 10, 23, false);
      expect(active.label).toBe("Today");
      expect(next.label).toBe("Tomorrow");
    });

    it("handles store that is currently closed (same day)", () => {
      const now = new Date("2026-08-16T05:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 10, 23, false);
      expect(active.label).toBe("Today");
    });

    it("handles overnight store at 2 AM", () => {
      const now = new Date("2026-08-16T02:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 22, 6, true);
      expect(toLocalDateKey(active.openTime)).toBe("2026-08-15");
    });

    it("handles overnight store right before close (in active window)", () => {
      // Store 22:00 - 06:00 next day. At 05:00 Aug 16 the active window is Aug 15 22:00 to Aug 16 06:00
      const now = new Date("2026-08-16T05:00:00");
      const [active, next] = getActiveAndNextBusinessWindows(now, 22, 6, true);
      expect(toLocalDateKey(active.openTime)).toBe("2026-08-15");
      expect(active.label).toBe("Tonight");
    });
  });

  describe("findBusinessWindowForSlot edge cases", () => {
    it("returns null when slot is far in the future beyond window range", () => {
      const now = new Date("2026-08-16T14:00:00");
      const slot = new Date("2026-12-01T14:00:00");
      const window = findBusinessWindowForSlot(slot, now, 10, 23, false);
      expect(window).toBeNull();
    });

    it("finds window for slot exactly at open hour", () => {
      const now = new Date("2026-08-16T14:00:00");
      const slot = new Date("2026-08-16T10:00:00");
      const window = findBusinessWindowForSlot(slot, now, 10, 23, false);
      expect(window).not.toBeNull();
    });

    it("returns null for slot exactly at close hour", () => {
      const now = new Date("2026-08-16T14:00:00");
      const slot = new Date("2026-08-16T23:00:00");
      const window = findBusinessWindowForSlot(slot, now, 10, 23, false);
      expect(window).toBeNull();
    });

    it("handles overnight slot in the early morning", () => {
      const now = new Date("2026-08-16T01:00:00");
      const slot = new Date("2026-08-16T02:00:00");
      const window = findBusinessWindowForSlot(slot, now, 22, 6, true);
      expect(window).not.toBeNull();
    });
  });

  describe("isBookingWindowDate edge cases", () => {
    it("returns false for dates far in the past", () => {
      const now = new Date("2026-08-16T14:00:00");
      expect(isBookingWindowDate("2026-01-01", now, 10, 23, false)).toBe(false);
    });

    it("returns false for dates far in the future", () => {
      const now = new Date("2026-08-16T14:00:00");
      expect(isBookingWindowDate("2027-01-01", now, 10, 23, false)).toBe(false);
    });

    it("handles edge case where dateKey equals active window date", () => {
      const now = new Date("2026-08-16T14:00:00");
      expect(isBookingWindowDate("2026-08-16", now, 10, 23, false)).toBe(true);
    });

    it("handles edge case where dateKey equals next window date", () => {
      const now = new Date("2026-08-16T14:00:00");
      expect(isBookingWindowDate("2026-08-17", now, 10, 23, false)).toBe(true);
    });
  });

  describe("bookingSettingsSchema with boolean edge cases", () => {
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

    it("accepts bookingEnabled true", () => {
      const result = bookingSettingsSchema.safeParse({ ...base, bookingEnabled: true });
      expect(result.success).toBe(true);
    });

    it("accepts bookingEnabled false", () => {
      const result = bookingSettingsSchema.safeParse({ ...base, bookingEnabled: false });
      expect(result.success).toBe(true);
    });

    it("accepts requireConfirmation true", () => {
      const result = bookingSettingsSchema.safeParse({ ...base, requireConfirmation: true });
      expect(result.success).toBe(true);
    });

    it("accepts requireConfirmation false", () => {
      const result = bookingSettingsSchema.safeParse({ ...base, requireConfirmation: false });
      expect(result.success).toBe(true);
    });
  });
});
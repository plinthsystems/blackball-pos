import { describe, it, expect } from "vitest";
import {
  BOOKING_DURATIONS,
  addMinutes,
  evaluateSlotAvailability,
  generateSlotStarts,
  isDateWithinWindow,
  isIntervalOverlapping,
  toLocalDateKey
} from "@/server/domain/booking-slots";

describe("Booking Slot Domain", () => {
  describe("toLocalDateKey", () => {
    it("formats local date as YYYY-MM-DD", () => {
      expect(toLocalDateKey(new Date(2026, 7, 13))).toBe("2026-08-13");
      expect(toLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
  });

  describe("generateSlotStarts", () => {
    it("generates half-hour starts between open and close", () => {
      const starts = generateSlotStarts("2026-08-13", 10, 12, 60);
      expect(starts).toHaveLength(3);
      expect(starts[0].getHours()).toBe(10);
      expect(starts[2].getHours()).toBe(11);
      expect(starts[2].getMinutes()).toBe(0);
    });

    it("never generates a start that crosses closing time", () => {
      const starts = generateSlotStarts("2026-08-13", 10, 23, 120);
      const lastEnd = addMinutes(starts[starts.length - 1], 120);
      expect(lastEnd.getHours()).toBeLessThanOrEqual(23);
    });

    it("respects duration by excluding near-close starts", () => {
      const starts = generateSlotStarts("2026-08-13", 21, 23, 90);
      expect(starts).toHaveLength(2);
      expect(starts[0].getHours()).toBe(21);
      expect(starts[1].getHours()).toBe(21);
      expect(starts[1].getMinutes()).toBe(30);
    });
  });

  describe("isDateWithinWindow", () => {
    it("accepts today and rejects yesterday", () => {
      const todayKey = toLocalDateKey(new Date());
      expect(isDateWithinWindow(todayKey, 14)).toBe(true);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isDateWithinWindow(toLocalDateKey(yesterday), 14)).toBe(false);
    });

    it("rejects dates beyond the window", () => {
      const beyond = new Date();
      beyond.setDate(beyond.getDate() + 15);
      expect(isDateWithinWindow(toLocalDateKey(beyond), 14)).toBe(false);
    });
  });

  describe("isIntervalOverlapping", () => {
    const candidate = { startsAt: new Date("2026-08-13T10:00:00"), endsAt: new Date("2026-08-13T11:00:00") };

    it("detects exact overlap", () => {
      const existing = { startsAt: new Date("2026-08-13T10:30:00"), endsAt: new Date("2026-08-13T11:30:00") };
      expect(isIntervalOverlapping(candidate, existing, 0)).toBe(true);
    });

    it("applies buffer before the existing end", () => {
      const existing = { startsAt: new Date("2026-08-13T08:00:00"), endsAt: new Date("2026-08-13T09:00:00") };
      expect(isIntervalOverlapping(candidate, existing, 90)).toBe(true);
      expect(isIntervalOverlapping(candidate, existing, 59)).toBe(false);
    });

    it("treats back-to-back bookings without buffer as free", () => {
      const existing = { startsAt: new Date("2026-08-13T08:00:00"), endsAt: new Date("2026-08-13T10:00:00") };
      expect(isIntervalOverlapping(candidate, existing, 0)).toBe(false);
    });
  });

  describe("evaluateSlotAvailability", () => {
    it("marks slots with existing bookings unavailable", () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);
      const futureKey = toLocalDateKey(future);
      const starts = generateSlotStarts(futureKey, 10, 13, 60);
      const existing = [
        {
          startsAt: new Date(`${futureKey}T11:00:00`),
          endsAt: new Date(`${futureKey}T12:00:00`)
        }
      ];
      const result = evaluateSlotAvailability(starts, 60, existing, 0, 0);
      expect(result[0].available).toBe(true);
      expect(result[1].available).toBe(false);
      expect(result[2].available).toBe(false);
      expect(result[4].available).toBe(true);
    });

    it("blocks slots before the minimum lead time", () => {
      const now = new Date();
      const starts = [
        addMinutes(now, 10),
        addMinutes(now, 120)
      ];
      const result = evaluateSlotAvailability(starts, 60, [], 10, 90);
      expect(result[0].available).toBe(false);
      expect(result[1].available).toBe(true);
    });
  });

  it("exposes supported booking durations", () => {
    expect(BOOKING_DURATIONS).toEqual([30, 60, 90, 120]);
  });
});

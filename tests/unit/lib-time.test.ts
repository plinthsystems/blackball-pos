import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addMinutes, formatClockTime } from "@/lib/time";

describe("addMinutes", () => {
  it("adds minutes within the same day", () => {
    const date = new Date(2026, 7, 17, 10, 0);
    expect(addMinutes(date, 30)).toEqual(new Date(2026, 7, 17, 10, 30));
  });

  it("crosses midnight into the next day", () => {
    const date = new Date(2026, 7, 17, 23, 30);
    expect(addMinutes(date, 45)).toEqual(new Date(2026, 7, 18, 0, 15));
  });

  it("crosses back into the previous day with negative minutes", () => {
    const date = new Date(2026, 7, 18, 0, 15);
    expect(addMinutes(date, -30)).toEqual(new Date(2026, 7, 17, 23, 45));
  });

  it("crosses month boundaries", () => {
    const date = new Date(2026, 0, 31, 23, 59);
    expect(addMinutes(date, 2)).toEqual(new Date(2026, 1, 1, 0, 1));
  });

  it("zero minutes returns the same instant", () => {
    const date = new Date(2026, 7, 17, 12, 0);
    expect(addMinutes(date, 0).getTime()).toBe(date.getTime());
  });

  it("does not mutate the input date", () => {
    const date = new Date(2026, 7, 17, 10, 0);
    const original = date.getTime();
    addMinutes(date, 60);
    expect(date.getTime()).toBe(original);
  });
});

describe("DST boundaries (addMinutes is epoch math; wall clock may skip/repeat)", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "America/New_York");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("spring forward: +60min wall-clock skips 02:00 (1h real time)", () => {
    const before = new Date(2026, 2, 8, 1, 30); // 01:30 EST
    const after = addMinutes(before, 60);
    expect(after.getHours()).toBe(3);
    expect(after.getMinutes()).toBe(30);
    expect(after.getTime() - before.getTime()).toBe(60 * 60 * 1000);
  });

  it("fall back: +60min real time repeats the 01:xx wall-clock hour", () => {
    // Date constructor picks the first (EDT) occurrence of the ambiguous 01:30
    const before = new Date(2026, 10, 1, 1, 30); // 01:30 EDT
    const after = addMinutes(before, 60); // 01:30 EST — wall clock repeats
    expect(after.getHours()).toBe(1);
    expect(after.getMinutes()).toBe(30);
    expect(after.getTime() - before.getTime()).toBe(60 * 60 * 1000); // only 1 real hour passed
  });
});

describe("formatClockTime", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Asia/Kolkata");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("pads single-digit hours and minutes", () => {
    expect(formatClockTime(new Date(2026, 7, 17, 9, 30))).toBe("09:30 am");
    expect(formatClockTime(new Date(2026, 7, 17, 13, 5))).toBe("01:05 pm");
  });

  it("handles midnight and just-before-midnight", () => {
    expect(formatClockTime(new Date(2026, 7, 17, 0, 5))).toBe("12:05 am");
    expect(formatClockTime(new Date(2026, 7, 17, 23, 5))).toBe("11:05 pm");
  });

  it("handles noon and noon-adjacent times", () => {
    expect(formatClockTime(new Date(2026, 7, 17, 12, 0))).toBe("12:00 pm");
    expect(formatClockTime(new Date(2026, 7, 17, 15, 30))).toBe("03:30 pm");
  });

  it("throws on an invalid date (malformed input)", () => {
    expect(() => formatClockTime(new Date(NaN))).toThrow(RangeError);
  });
});

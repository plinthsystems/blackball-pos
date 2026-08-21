import { describe, it, expect } from "vitest";
import { calculateBillableSeconds, calculateTableCharge, calculateMinuteBasedTableCharge } from "@/server/domain/session-calculations";

describe("session calculations - edge cases and boundary values", () => {
  describe("calculateBillableSeconds edge cases", () => {
    it("returns 0 when endedAt equals startedAt", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T10:00:00.000Z"),
        endedAt: new Date("2026-07-23T10:00:00.000Z"),
        pauses: []
      });
      expect(result).toBe(0);
    });

    it("returns 0 when endedAt is before startedAt", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T11:00:00.000Z"),
        endedAt: new Date("2026-07-23T10:00:00.000Z"),
        pauses: []
      });
      expect(result).toBe(0);
    });

    it("handles empty pauses array", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T10:00:00.000Z"),
        endedAt: new Date("2026-07-23T11:00:00.000Z"),
        pauses: []
      });
      expect(result).toBe(3600);
    });

    it("ignores pauses without resumedAt", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T10:00:00.000Z"),
        endedAt: new Date("2026-07-23T12:00:00.000Z"),
        pauses: [
          {
            pausedAt: new Date("2026-07-23T10:30:00.000Z"),
            resumedAt: null
          }
        ]
      });
      expect(result).toBe(7200);
    });

    it("handles multiple pauses with mixed resumedAt", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T10:00:00.000Z"),
        endedAt: new Date("2026-07-23T14:00:00.000Z"),
        pauses: [
          {
            pausedAt: new Date("2026-07-23T10:30:00.000Z"),
            resumedAt: new Date("2026-07-23T10:45:00.000Z")
          },
          {
            pausedAt: new Date("2026-07-23T11:30:00.000Z"),
            resumedAt: null
          },
          {
            pausedAt: new Date("2026-07-23T12:00:00.000Z"),
            resumedAt: new Date("2026-07-23T12:20:00.000Z")
          }
        ]
      });
      // Total: 4 hours = 14400s
      // Pause 1: 15 min = 900s
      // Pause 2: not resumed = 0s
      // Pause 3: 20 min = 1200s
      // Billable: 14400 - 900 - 1200 = 12300
      expect(result).toBe(12300);
    });

    it("handles pause that extends beyond endedAt", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T10:00:00.000Z"),
        endedAt: new Date("2026-07-23T11:00:00.000Z"),
        pauses: [
          {
            pausedAt: new Date("2026-07-23T10:30:00.000Z"),
            resumedAt: new Date("2026-07-23T12:00:00.000Z")
          }
        ]
      });
      // Total: 3600s, Pause: max(0, 5400) = 5400s, Billable: max(0, 3600 - 5400) = 0
      expect(result).toBe(0);
    });

    it("handles very short session (1 second)", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T10:00:00.000Z"),
        endedAt: new Date("2026-07-23T10:00:01.000Z"),
        pauses: []
      });
      expect(result).toBe(1);
    });

    it("handles sessions with sub-second precision", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T10:00:00.000Z"),
        endedAt: new Date("2026-07-23T10:00:00.999Z"),
        pauses: []
      });
      expect(result).toBe(0);
    });

    it("handles overnight session", () => {
      const result = calculateBillableSeconds({
        startedAt: new Date("2026-07-23T22:00:00.000Z"),
        endedAt: new Date("2026-07-24T02:00:00.000Z"),
        pauses: []
      });
      expect(result).toBe(4 * 3600);
    });
  });

  describe("calculateTableCharge edge cases", () => {
    it("charges 0 for zero billable seconds", () => {
      const result = calculateTableCharge({
        billableSeconds: 0,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      expect(result).toBe(0);
    });

    it("charges only halfHourAmount for less than an hour", () => {
      const result = calculateTableCharge({
        billableSeconds: 1800,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      expect(result).toBe(250);
    });

    it("charges only halfHourAmount for exactly 30 minutes", () => {
      const result = calculateTableCharge({
        billableSeconds: 1800,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      expect(result).toBe(250);
    });

    it("charges fullHourAmount for exactly one hour", () => {
      const result = calculateTableCharge({
        billableSeconds: 3600,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      expect(result).toBe(450);
    });

    it("charges for 1.5 hours (1 full + 1 half)", () => {
      const result = calculateTableCharge({
        billableSeconds: 5400,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      expect(result).toBe(700);
    });

    it("charges for 2 hours exactly", () => {
      const result = calculateTableCharge({
        billableSeconds: 7200,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      expect(result).toBe(900);
    });

    it("rounds up partial half-hour blocks", () => {
      const result = calculateTableCharge({
        billableSeconds: 3601,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      // 1 full hour + 1 second = 1 full hour + 1 half-hour block
      expect(result).toBe(700);
    });

    it("handles zero half-hour amount", () => {
      const result = calculateTableCharge({
        billableSeconds: 1800,
        halfHourAmount: 0,
        fullHourAmount: 450
      });
      expect(result).toBe(0);
    });

    it("handles zero full-hour amount", () => {
      const result = calculateTableCharge({
        billableSeconds: 3600,
        halfHourAmount: 250,
        fullHourAmount: 0
      });
      expect(result).toBe(0);
    });

    it("handles very large billable seconds", () => {
      const result = calculateTableCharge({
        billableSeconds: 86400,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      expect(result).toBe(24 * 450);
    });

    it("handles 2 hours 15 minutes", () => {
      const result = calculateTableCharge({
        billableSeconds: 2 * 3600 + 15 * 60,
        halfHourAmount: 250,
        fullHourAmount: 450
      });
      // 2 full hours + 15 min = ceil(900/1800) = 1 half-hour block
      expect(result).toBe(2 * 450 + 1 * 250);
    });
  });

  describe("calculateMinuteBasedTableCharge edge cases", () => {
    it("charges 0 for zero billable seconds", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 0,
        hourlyRate: 300
      });
      expect(result).toBe(0);
    });

    it("charges for 1 minute minimum", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 1,
        hourlyRate: 60
      });
      // 1 second = ceil(1/60) = 1 minute = 60/60 = 1
      expect(result).toBe(1);
    });

    it("charges correctly for exactly 30 minutes", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 30 * 60,
        hourlyRate: 600
      });
      expect(result).toBe(300);
    });

    it("charges correctly for exactly 1 hour", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 60 * 60,
        hourlyRate: 600
      });
      expect(result).toBe(600);
    });

    it("rounds up to next minute", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 61,
        hourlyRate: 600
      });
      // 61 seconds = ceil(61/60) = 2 minutes = 2 * 600 / 60 = 20
      expect(result).toBe(20);
    });

    it("handles negative billable seconds by clamping to 0", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: -100,
        hourlyRate: 300
      });
      expect(result).toBe(0);
    });

    it("handles zero hourly rate", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 3600,
        hourlyRate: 0
      });
      expect(result).toBe(0);
    });

    it("handles decimal rounding correctly", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 45 * 60,
        hourlyRate: 350
      });
      // 45 minutes * 350 / 60 = 262.5
      expect(result).toBe(262.5);
    });

    it("handles rounding to 2 decimal places", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 7 * 60,
        hourlyRate: 100
      });
      // 7 * 100 / 60 = 11.666... -> rounded to 11.67
      expect(result).toBe(11.67);
    });

    it("handles very large billable seconds", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 86400,
        hourlyRate: 500
      });
      // 1440 minutes * 500 / 60 = 12000
      expect(result).toBe(12000);
    });

    it("handles fractional hourly rate", () => {
      const result = calculateMinuteBasedTableCharge({
        billableSeconds: 60 * 60,
        hourlyRate: 333.33
      });
      expect(result).toBe(333.33);
    });
  });
});
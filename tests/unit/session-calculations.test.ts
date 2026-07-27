import { describe, expect, it } from "vitest";
import { calculateBillableSeconds, calculateTableCharge } from "@/server/domain/session-calculations";

describe("session calculations", () => {
  it("calculates billable seconds from server timestamps minus completed pauses", () => {
    const billable = calculateBillableSeconds({
      startedAt: new Date("2026-07-23T10:00:00.000Z"),
      endedAt: new Date("2026-07-23T11:30:00.000Z"),
      pauses: [
        {
          pausedAt: new Date("2026-07-23T10:20:00.000Z"),
          resumedAt: new Date("2026-07-23T10:35:00.000Z")
        }
      ]
    });

    expect(billable).toBe(75 * 60);
  });

  it("prices partial play by rounding up to the next 30 minute block", () => {
    const amount = calculateTableCharge({
      billableSeconds: 61 * 60,
      halfHourAmount: 250,
      fullHourAmount: 450
    });

    expect(amount).toBe(700);
  });
});

import { describe, expect, it } from "vitest";
import { extendSessionSchema, startWalkInSessionSchema } from "@/features/sessions/schemas";

describe("session schemas", () => {
  it("accepts a 30 minute walk-in session", () => {
    const result = startWalkInSessionSchema.safeParse({
      tableId: "table_1",
      durationMinutes: 30,
      customerName: "Riya Shah",
      customerPhone: "9999999999"
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported extension durations", () => {
    const result = extendSessionSchema.safeParse({
      sessionId: "session_1",
      addedMinutes: 45
    });

    expect(result.success).toBe(false);
  });
});

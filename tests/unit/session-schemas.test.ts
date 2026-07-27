import { describe, expect, it } from "vitest";
import {
  addBillItemSchema,
  closeBillAndContinueSessionSchema,
  extendSessionSchema,
  productFormSchema,
  removeBillItemSchema,
  startCounterBillSchema,
  startWalkInSessionSchema
} from "@/features/sessions/schemas";

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

  it("accepts adding menu items to an active session", () => {
    const result = addBillItemSchema.safeParse({
      billId: "bill_1",
      productId: "product_1",
      quantity: 2
    });

    expect(result.success).toBe(true);
  });

  it("accepts menu product edits from settings", () => {
    const result = productFormSchema.safeParse({
      name: "Water Bottle",
      category: "BEVERAGES",
      priceAmount: 20
    });

    expect(result.success).toBe(true);
  });

  it("accepts standalone counter bill and bill handoff inputs", () => {
    expect(startCounterBillSchema.safeParse({ label: "Takeaway" }).success).toBe(true);
    expect(removeBillItemSchema.safeParse({ billItemId: "item_1" }).success).toBe(true);
    expect(closeBillAndContinueSessionSchema.safeParse({ sessionId: "session_1" }).success).toBe(true);
  });
});

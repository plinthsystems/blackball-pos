import { describe, expect, it, vi } from "vitest";
import {
  THE_NINE_ACCOUNTS,
  THE_NINE_STORE,
  THE_NINE_TABLES,
  THE_NINE_PRICING,
  resetTheNine
} from "@/server/provisioning/the-nine";

describe("The Nine seed configuration", () => {
  it("defines one store and exactly the two product accounts", () => {
    expect(THE_NINE_STORE.name).toBe("The Nine Snooker & Cafe");
    expect(THE_NINE_STORE.appName).toBe("The Nine Snooker & Cafe");
    expect(THE_NINE_STORE.slug).toBe("the-nine");
    expect(THE_NINE_ACCOUNTS).toHaveLength(2);
    expect(THE_NINE_ACCOUNTS.map((account) => account.accountType)).toEqual([
      "STORE_OWNER",
      "STORE_USER"
    ]);
    expect(THE_NINE_ACCOUNTS.every((account) => !account.organizationId && !account.franchiseeId)).toBe(true);
  });

  it("defines only The Nine's five named tables and no PS5 pricing", () => {
    expect(THE_NINE_TABLES.map((table) => table.number)).toEqual([
      "Royal Snooker 1",
      "Royal Snooker 2",
      "Mini Snooker 1",
      "Mini Snooker 2",
      "Pool"
    ]);
    expect(THE_NINE_TABLES.some((table) => String(table.gameType) === "PS5")).toBe(false);
    expect(THE_NINE_PRICING.map((rule) => `${rule.gameType}:${rule.pricingGroup}`)).toEqual([
      "SNOOKER:royal",
      "SNOOKER:mini",
      "POOL:standard"
    ]);
    expect(THE_NINE_PRICING.map((rule) => rule.priceAmount)).toEqual(["400.00", "250.00", "180.00"]);
  });
});

describe("The Nine reset", () => {
  it("refuses to run without the explicit confirmation", async () => {
    const db = { $transaction: vi.fn() };

    await expect(resetTheNine(db as never, { confirmation: "false" })).rejects.toThrow(
      "RESET_THE_NINE=true is required"
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("runs the reset inside one transaction after confirmation", async () => {
    const db = { $transaction: vi.fn().mockResolvedValue(undefined) };

    await resetTheNine(db as never, { confirmation: "true" });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function));
  });
});

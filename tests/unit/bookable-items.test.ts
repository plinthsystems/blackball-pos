import { describe, expect, it } from "vitest";
import { bookableItemFormSchema } from "@/features/sessions/schemas";
import { defaultHourlyRateFor, pricingGroupLabel, pricingGroupOptions } from "@/features/tables/pricing-groups";

describe("bookable item form schema", () => {
  it("accepts a new snooker table with a royal rate group", () => {
    const result = bookableItemFormSchema.safeParse({
      number: "Royal Snooker 1",
      gameType: "SNOOKER",
      pricingGroup: "royal"
    });

    expect(result.success).toBe(true);
  });

  it("accepts a PS5 console", () => {
    const result = bookableItemFormSchema.safeParse({
      number: "PS5 Console 2",
      gameType: "PS5",
      pricingGroup: "players-4"
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty item name and unknown game types", () => {
    expect(bookableItemFormSchema.safeParse({ number: "  ", gameType: "POOL", pricingGroup: "standard" }).success).toBe(false);
    expect(bookableItemFormSchema.safeParse({ number: "Table 1", gameType: "CARROM", pricingGroup: "standard" }).success).toBe(false);
  });
});

describe("bookable item rate groups", () => {
  it("offers per-type rate groups", () => {
    expect(pricingGroupOptions("POOL")).toEqual(["standard"]);
    expect(pricingGroupOptions("SNOOKER")).toEqual(["royal", "mini", "standard"]);
    expect(pricingGroupOptions("PS5")).toEqual(["players-1", "players-2", "players-3", "players-4"]);
  });

  it("labels rate groups for the manager UI", () => {
    expect(pricingGroupLabel("players-2")).toBe("2 players");
    expect(pricingGroupLabel("royal")).toBe("Royal");
    expect(pricingGroupLabel("mystery")).toBe("mystery");
  });

  it("provides default hourly rates that match platform setup pricing", () => {
    expect(defaultHourlyRateFor("SNOOKER", "royal")).toBe(350);
    expect(defaultHourlyRateFor("POOL", "standard")).toBe(180);
    expect(defaultHourlyRateFor("PS5", "players-2")).toBe(150);
    expect(defaultHourlyRateFor("PS5", "players-4")).toBe(250);
  });

  it("falls back to zero for unknown combos instead of inventing a price", () => {
    expect(defaultHourlyRateFor("POOL", "royal")).toBe(0);
  });
});

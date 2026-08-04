import { describe, expect, it } from "vitest";
import { mapRateSettings } from "@/features/rates/queries";

describe("mapRateSettings", () => {
  it("maps hourly rules to owner-facing rate labels", () => {
    const rates = mapRateSettings([
      { id: "r1", gameType: "SNOOKER", pricingGroup: "royal", durationMinutes: 60, priceAmount: 350 },
      { id: "r2", gameType: "SNOOKER", pricingGroup: "mini", durationMinutes: 60, priceAmount: 330 },
      { id: "r3", gameType: "POOL", pricingGroup: "standard", durationMinutes: 60, priceAmount: 160 },
      { id: "r4", gameType: "PS5", pricingGroup: "players-1", durationMinutes: 60, priceAmount: 100 },
      { id: "r5", gameType: "PS5", pricingGroup: "players-2", durationMinutes: 60, priceAmount: 150 },
      { id: "r6", gameType: "PS5", pricingGroup: "players-3", durationMinutes: 60, priceAmount: 200 },
      { id: "r7", gameType: "PS5", pricingGroup: "players-4", durationMinutes: 60, priceAmount: 250 }
    ]);

    expect(rates.map((rate) => `${rate.label}:${rate.hourlyRate}`)).toEqual([
      "Royal Snooker:350",
      "Mini Snooker:330",
      "Pool:160",
      "PS5 · 1 player:100",
      "PS5 · 2 players:150",
      "PS5 · 3 players:200",
      "PS5 · 4 players:250"
    ]);
  });
});

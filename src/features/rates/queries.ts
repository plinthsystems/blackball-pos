import { prisma } from "@/server/db/prisma";
import type { RateSetting } from "./types";

type RateRule = {
  id: string;
  gameType: "POOL" | "SNOOKER" | "PS5";
  pricingGroup: string;
  durationMinutes: number;
  priceAmount: unknown;
};

export function mapRateSettings(rules: RateRule[]): RateSetting[] {
  const order = ["Royal Snooker", "Mini Snooker", "Pool", "PS5"];
  return rules
    .filter((rule) => rule.durationMinutes === 60)
    .map((rule) => ({
      id: rule.id,
      label: rateLabel(rule.gameType, rule.pricingGroup),
      gameType: rule.gameType,
      pricingGroup: rule.pricingGroup,
      hourlyRate: Number(rule.priceAmount)
    }))
    .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

export async function getRateSettings(businessId: string): Promise<RateSetting[]> {
  const rules = await prisma.tablePricing.findMany({
    where: { businessId, durationMinutes: 60 }
  });
  return mapRateSettings(rules);
}

function rateLabel(gameType: "POOL" | "SNOOKER" | "PS5", pricingGroup: string): RateSetting["label"] {
  if (gameType === "PS5") {
    return "PS5";
  }
  if (gameType === "POOL") {
    return "Pool";
  }
  if (pricingGroup === "royal") {
    return "Royal Snooker";
  }
  return "Mini Snooker";
}

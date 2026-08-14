import type { GameType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { PricingRule } from "./types";

export type PricingRepository = {
  findRules(input: { businessId: string; gameType: GameType; pricingGroup: string }): Promise<PricingRule[]>;
};

export const prismaPricingRepository: PricingRepository = {
  async findRules({ businessId, gameType, pricingGroup }) {
    const rules = await prisma.tablePricing.findMany({
      where: { businessId, gameType, pricingGroup },
      select: { durationMinutes: true, priceAmount: true }
    });

    return rules.map((rule) => ({
      durationMinutes: rule.durationMinutes,
      priceAmount: Number(rule.priceAmount)
    }));
  }
};

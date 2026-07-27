import type { GameType } from "@prisma/client";
import { calculateTableCharge } from "@/server/domain/session-calculations";
import type { PricingRepository } from "@/server/repositories/pricing-repository";

export class PricingService {
  constructor(private readonly pricing: PricingRepository) {}

  async estimateTableCharge(input: {
    businessId: string;
    gameType: GameType;
    pricingGroup: string;
    billableSeconds: number;
  }) {
    const rules = await this.pricing.findRules(input);
    const halfHour = rules.find((rule) => rule.durationMinutes === 30);
    const fullHour = rules.find((rule) => rule.durationMinutes === 60);

    return calculateTableCharge({
      billableSeconds: input.billableSeconds,
      halfHourAmount: halfHour?.priceAmount ?? 0,
      fullHourAmount: fullHour?.priceAmount ?? 0
    });
  }
}

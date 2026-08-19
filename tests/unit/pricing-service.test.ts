import { describe, expect, it, vi } from "vitest";
import { PricingService } from "@/server/services/pricing-service";
import type { PricingRepository } from "@/server/repositories/pricing-repository";
import type { PricingRule } from "@/server/repositories/types";

type MockPricingRepository = PricingRepository & { findRules: ReturnType<typeof vi.fn> };

function makePricingRepository(): MockPricingRepository {
  return { findRules: vi.fn() };
}

const INPUT = {
  businessId: "biz-1",
  gameType: "POOL" as const,
  pricingGroup: "peak",
  billableSeconds: 0
};

const BOTH_RULES: PricingRule[] = [
  { durationMinutes: 30, priceAmount: 100 },
  { durationMinutes: 60, priceAmount: 180 }
];

describe("PricingService.estimateTableCharge", () => {
  it("charges full hours with the 60-min rule and remainder with the 30-min rule", async () => {
    const pricing = makePricingRepository();
    pricing.findRules.mockResolvedValue(BOTH_RULES);
    const service = new PricingService(pricing);

    // 90 minutes = 1 full hour + 1 half-hour block
    const charge = await service.estimateTableCharge({ ...INPUT, billableSeconds: 90 * 60 });
    expect(charge).toBe(280);
    expect(pricing.findRules).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "biz-1",
        gameType: "POOL",
        pricingGroup: "peak"
      })
    );
  });

  it("exactly 60 minutes charges only the full-hour rule", async () => {
    const pricing = makePricingRepository();
    pricing.findRules.mockResolvedValue(BOTH_RULES);
    const service = new PricingService(pricing);
    expect(await service.estimateTableCharge({ ...INPUT, billableSeconds: 3600 })).toBe(180);
  });

  it("fractional remainder rounds up to the next half-hour block", async () => {
    const pricing = makePricingRepository();
    pricing.findRules.mockResolvedValue(BOTH_RULES);
    const service = new PricingService(pricing);
    // 45 minutes = 0 full hours + ceil(2700/1800) = 2 half-hour blocks
    expect(await service.estimateTableCharge({ ...INPUT, billableSeconds: 45 * 60 })).toBe(200);
  });

  it("falls back to ₹0 when no pricing rules exist", async () => {
    const pricing = makePricingRepository();
    pricing.findRules.mockResolvedValue([]);
    const service = new PricingService(pricing);
    expect(await service.estimateTableCharge({ ...INPUT, billableSeconds: 7200 })).toBe(0);
  });

  it("falls back to 0 for a missing full-hour rule (half-hour only)", async () => {
    const pricing = makePricingRepository();
    pricing.findRules.mockResolvedValue([{ durationMinutes: 30, priceAmount: 100 }]);
    const service = new PricingService(pricing);
    // 60 minutes with no 60-min rule -> full hours priced at 0
    expect(await service.estimateTableCharge({ ...INPUT, billableSeconds: 3600 })).toBe(0);
    // 30 minutes -> one half-hour block
    expect(await service.estimateTableCharge({ ...INPUT, billableSeconds: 1800 })).toBe(100);
  });

  it("ignores rules that are neither 30 nor 60 minutes", async () => {
    const pricing = makePricingRepository();
    pricing.findRules.mockResolvedValue([
      { durationMinutes: 15, priceAmount: 999 },
      { durationMinutes: 120, priceAmount: 999 }
    ]);
    const service = new PricingService(pricing);
    expect(await service.estimateTableCharge({ ...INPUT, billableSeconds: 5400 })).toBe(0);
  });

  it("propagates repository errors", async () => {
    const pricing = makePricingRepository();
    pricing.findRules.mockRejectedValue(new Error("db down"));
    const service = new PricingService(pricing);
    await expect(service.estimateTableCharge(INPUT)).rejects.toThrow("db down");
  });

  it("charges zero for zero billable seconds", async () => {
    const pricing = makePricingRepository();
    pricing.findRules.mockResolvedValue(BOTH_RULES);
    const service = new PricingService(pricing);
    expect(await service.estimateTableCharge(INPUT)).toBe(0);
  });
});

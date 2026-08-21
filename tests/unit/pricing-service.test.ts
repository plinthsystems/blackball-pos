import { describe, it, expect, vi } from "vitest";
import { PricingService } from "@/server/services/pricing-service";

function buildMockPricingRepository(rules: Array<{ durationMinutes: number; priceAmount: number }>) {
  return {
    findRules: vi.fn().mockResolvedValue(rules)
  };
}

describe("PricingService", () => {
  it("estimates table charge with both half-hour and full-hour rules", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 250 },
      { durationMinutes: 60, priceAmount: 450 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 75 * 60
    });
    expect(result).toBe(700);
  });

  it("estimates charge with only full-hour rule for partial hour", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 60, priceAmount: 500 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "SNOOKER",
      pricingGroup: "premium",
      billableSeconds: 45 * 60
    });
    // 45 min = 0 full hours + ceil(2700/1800) = 1 half-hour block at 0 (no half-hour rule)
    // result = 0 * 500 + 1 * 0 = 0
    expect(result).toBe(0);
  });

  it("estimates charge with only half-hour rule", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 200 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 90 * 60
    });
    // 90 min = 1 full hour + 0 remaining = 1 * 0 + 0 * 200 = 0... wait
    // Actually: fullHours = floor(5400/3600) = 1, remaining = 1800, halfHourBlocks = ceil(1800/1800) = 1
    // result = 1 * 0 + 1 * 200 = 200
    expect(result).toBe(200);
  });

  it("handles empty rules array returning zero", async () => {
    const repo = buildMockPricingRepository([]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 60 * 60
    });
    expect(result).toBe(0);
  });

  it("handles zero billable seconds", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 250 },
      { durationMinutes: 60, priceAmount: 450 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 0
    });
    expect(result).toBe(0);
  });

  it("handles negative billable seconds (returns negative charge)", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 250 },
      { durationMinutes: 60, priceAmount: 450 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: -100
    });
    // calculateTableCharge doesn't clamp negative, so -100 % 3600 = -100, ceil(-100/1800) = 0
    // fullHours = floor(-100/3600) = -1, so result = -1 * 450 + 0 * 250 = -450
    expect(result).toBe(-450);
  });

  it("handles rules with zero prices", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 0 },
      { durationMinutes: 60, priceAmount: 0 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 60 * 60
    });
    expect(result).toBe(0);
  });

  it("handles rules with only one matching duration", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 200 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 2 * 3600
    });
    // fullHours = 2, remaining = 0, halfHourBlocks = 0
    // result = 2 * 0 + 0 * 200 = 0
    expect(result).toBe(0);
  });

  it("handles large billable seconds", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 250 },
      { durationMinutes: 60, priceAmount: 450 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 24 * 3600
    });
    // 24 hours * 450 = 10800
    expect(result).toBe(10800);
  });

  it("handles exact full hour boundaries", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 250 },
      { durationMinutes: 60, priceAmount: 450 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 3 * 3600
    });
    expect(result).toBe(3 * 450);
  });

  it("handles exact half-hour boundaries", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 250 },
      { durationMinutes: 60, priceAmount: 450 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 1 * 3600 + 1800
    });
    // 1 full hour + 1 half hour = 450 + 250 = 700
    expect(result).toBe(700);
  });

  it("handles all game types", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 200 },
      { durationMinutes: 60, priceAmount: 350 }
    ]);
    const service = new PricingService(repo as any);
    for (const gameType of ["POOL", "SNOOKER", "PS5"] as const) {
      const result = await service.estimateTableCharge({
        businessId: "biz_1",
        gameType,
        pricingGroup: "standard",
        billableSeconds: 60 * 60
      });
      expect(result).toBe(350);
    }
  });

  it("handles different pricing groups", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 150 },
      { durationMinutes: 60, priceAmount: 250 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "premium",
      billableSeconds: 60 * 60
    });
    expect(result).toBe(250);
  });

  it("calls findRules with correct input parameters", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 250 },
      { durationMinutes: 60, priceAmount: 450 }
    ]);
    const service = new PricingService(repo as any);
    await service.estimateTableCharge({
      businessId: "biz_test",
      gameType: "SNOOKER",
      pricingGroup: "vip",
      billableSeconds: 60 * 60
    });
    expect(repo.findRules).toHaveBeenCalledWith({
      businessId: "biz_test",
      gameType: "SNOOKER",
      pricingGroup: "vip",
      billableSeconds: 60 * 60
    });
  });

  it("handles rules with priceAmount as float", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 250.5 },
      { durationMinutes: 60, priceAmount: 450.75 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 60 * 60
    });
    expect(result).toBe(450.75);
  });

  it("handles 1 hour 30 minutes with both rules present", async () => {
    const repo = buildMockPricingRepository([
      { durationMinutes: 30, priceAmount: 200 },
      { durationMinutes: 60, priceAmount: 350 }
    ]);
    const service = new PricingService(repo as any);
    const result = await service.estimateTableCharge({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard",
      billableSeconds: 90 * 60
    });
    // 1 full hour + 1 half hour = 350 + 200 = 550
    expect(result).toBe(550);
  });
});
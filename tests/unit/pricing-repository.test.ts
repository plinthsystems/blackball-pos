import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    tablePricing: {
      findMany: mockFindMany
    }
  }
}));

describe("prismaPricingRepository.findRules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pricing rules for a valid query", async () => {
    const { prismaPricingRepository } = await import("@/server/repositories/pricing-repository");

    const mockRules = [
      { durationMinutes: 30, priceAmount: BigInt(90) },
      { durationMinutes: 60, priceAmount: BigInt(180) },
      { durationMinutes: 120, priceAmount: BigInt(320) }
    ];

    mockFindMany.mockResolvedValue(mockRules);

    const result = await prismaPricingRepository.findRules({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        businessId: "biz_1",
        gameType: "POOL",
        pricingGroup: "standard"
      },
      select: { durationMinutes: true, priceAmount: true }
    });

    expect(result).toEqual([
      { durationMinutes: 30, priceAmount: 90 },
      { durationMinutes: 60, priceAmount: 180 },
      { durationMinutes: 120, priceAmount: 320 }
    ]);
  });

  it("returns empty array when no rules exist", async () => {
    const { prismaPricingRepository } = await import("@/server/repositories/pricing-repository");

    mockFindMany.mockResolvedValue([]);

    const result = await prismaPricingRepository.findRules({
      businessId: "biz_1",
      gameType: "SNOOKER",
      pricingGroup: "royal"
    });

    expect(result).toEqual([]);
  });

  it("converts BigInt priceAmount to number", async () => {
    const { prismaPricingRepository } = await import("@/server/repositories/pricing-repository");

    const mockRules = [
      { durationMinutes: 60, priceAmount: BigInt(350) }
    ];

    mockFindMany.mockResolvedValue(mockRules);

    const result = await prismaPricingRepository.findRules({
      businessId: "biz_1",
      gameType: "SNOOKER",
      pricingGroup: "royal"
    });

    expect(result[0].priceAmount).toBe(350);
    expect(typeof result[0].priceAmount).toBe("number");
  });

  it("handles large price amounts", async () => {
    const { prismaPricingRepository } = await import("@/server/repositories/pricing-repository");

    const mockRules = [
      { durationMinutes: 180, priceAmount: BigInt(999999) }
    ];

    mockFindMany.mockResolvedValue(mockRules);

    const result = await prismaPricingRepository.findRules({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    expect(result[0].priceAmount).toBe(999999);
  });

  it("handles zero price amount", async () => {
    const { prismaPricingRepository } = await import("@/server/repositories/pricing-repository");

    const mockRules = [
      { durationMinutes: 60, priceAmount: BigInt(0) }
    ];

    mockFindMany.mockResolvedValue(mockRules);

    const result = await prismaPricingRepository.findRules({
      businessId: "biz_1",
      gameType: "PS5",
      pricingGroup: "players-1"
    });

    expect(result[0].priceAmount).toBe(0);
  });

  it("queries with correct businessId for different businesses", async () => {
    const { prismaPricingRepository } = await import("@/server/repositories/pricing-repository");

    const mockRules = [
      { durationMinutes: 60, priceAmount: BigInt(150) }
    ];

    mockFindMany.mockResolvedValue(mockRules);

    await prismaPricingRepository.findRules({
      businessId: "biz_999",
      gameType: "PS5",
      pricingGroup: "players-2"
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        businessId: "biz_999",
        gameType: "PS5",
        pricingGroup: "players-2"
      },
      select: { durationMinutes: true, priceAmount: true }
    });
  });

  it("handles all game types", async () => {
    const { prismaPricingRepository } = await import("@/server/repositories/pricing-repository");

    const mockRules = [{ durationMinutes: 60, priceAmount: BigInt(200) }];
    mockFindMany.mockResolvedValue(mockRules);

    const gameTypes: Array<"POOL" | "SNOOKER" | "PS5"> = ["POOL", "SNOOKER", "PS5"];
    const pricingGroups = ["standard", "royal", "players-1"];

    for (let i = 0; i < gameTypes.length; i++) {
      vi.clearAllMocks();
      mockFindMany.mockResolvedValue(mockRules);

      await prismaPricingRepository.findRules({
        businessId: "biz_1",
        gameType: gameTypes[i],
        pricingGroup: pricingGroups[i]
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          businessId: "biz_1",
          gameType: gameTypes[i],
          pricingGroup: pricingGroups[i]
        },
        select: { durationMinutes: true, priceAmount: true }
      });
    }
  });

  it("returns durationMinutes as-is without conversion", async () => {
    const { prismaPricingRepository } = await import("@/server/repositories/pricing-repository");

    const mockRules = [
      { durationMinutes: 15, priceAmount: BigInt(45) },
      { durationMinutes: 30, priceAmount: BigInt(90) },
      { durationMinutes: 45, priceAmount: BigInt(135) },
      { durationMinutes: 60, priceAmount: BigInt(180) },
      { durationMinutes: 90, priceAmount: BigInt(270) },
      { durationMinutes: 120, priceAmount: BigInt(360) }
    ];

    mockFindMany.mockResolvedValue(mockRules);

    const result = await prismaPricingRepository.findRules({
      businessId: "biz_1",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    expect(result).toHaveLength(6);
    expect(result.map((r) => r.durationMinutes)).toEqual([15, 30, 45, 60, 90, 120]);
  });
});
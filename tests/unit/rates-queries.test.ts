import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRateSettings } from "@/features/rates/queries";

const mocks = vi.hoisted(() => {
  const prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  for (const model of ["tablePricing"]) {
    prisma[model] = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn()
    };
  }
  return { prisma };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));

describe("getRateSettings", () => {
  beforeEach(() => {
    mocks.prisma.tablePricing.findMany.mockReset();
  });

  it("returns an empty list when the business has no hourly rules", async () => {
    mocks.prisma.tablePricing.findMany.mockResolvedValue([]);

    const rates = await getRateSettings("biz-1");

    expect(rates).toEqual([]);
    expect(mocks.prisma.tablePricing.findMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1", durationMinutes: 60 }
    });
  });

  it("maps hourly rules and sorts them by the owner-facing label order", async () => {
    mocks.prisma.tablePricing.findMany.mockResolvedValue([
      { id: "r4", gameType: "PS5", pricingGroup: "players-2", durationMinutes: 60, priceAmount: 150 },
      { id: "r2", gameType: "SNOOKER", pricingGroup: "mini", durationMinutes: 60, priceAmount: 330 },
      { id: "r1", gameType: "SNOOKER", pricingGroup: "royal", durationMinutes: 60, priceAmount: 350 },
      { id: "r3", gameType: "POOL", pricingGroup: "standard", durationMinutes: 60, priceAmount: 160 }
    ]);

    const rates = await getRateSettings("biz-1");

    expect(rates.map((rate) => `${rate.label}:${rate.hourlyRate}`)).toEqual([
      "Royal Snooker:350",
      "Mini Snooker:330",
      "Pool:160",
      "PS5 · 2 players:150"
    ]);
  });

  it("ignores non-hourly rules (e.g. 30-minute pricing rows)", async () => {
    mocks.prisma.tablePricing.findMany.mockResolvedValue([
      { id: "r1", gameType: "POOL", pricingGroup: "standard", durationMinutes: 30, priceAmount: 90 }
    ]);

    const rates = await getRateSettings("biz-1");

    expect(rates).toEqual([]);
  });
});

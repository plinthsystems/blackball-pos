import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBookableItems } from "@/features/tables/queries";

const mocks = vi.hoisted(() => {
  const model = (): Record<string, ReturnType<typeof vi.fn>> => ({
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
  });
  return { prisma: { clubTable: model(), tablePricing: model() } };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));

describe("getBookableItems", () => {
  beforeEach(() => {
    mocks.prisma.clubTable.findMany.mockReset();
    mocks.prisma.tablePricing.findMany.mockReset();
  });

  it("joins tables with their hourly rate rule by gameType/pricingGroup", async () => {
    mocks.prisma.clubTable.findMany.mockResolvedValue([
      {
        id: "t1",
        number: "Royal Snooker 1",
        gameType: "SNOOKER",
        pricingGroup: "royal",
        status: "AVAILABLE",
        active: true
      },
      {
        id: "t2",
        number: "PS5 1",
        gameType: "PS5",
        pricingGroup: "players-2",
        status: "AVAILABLE",
        active: true
      }
    ]);
    mocks.prisma.tablePricing.findMany.mockResolvedValue([
      { gameType: "SNOOKER", pricingGroup: "royal", priceAmount: 350 },
      { gameType: "PS5", pricingGroup: "players-2", priceAmount: "150.00" }
    ]);

    const items = await getBookableItems("biz-1");

    expect(items).toEqual([
      {
        id: "t1",
        number: "Royal Snooker 1",
        gameType: "SNOOKER",
        pricingGroup: "royal",
        status: "AVAILABLE",
        active: true,
        hourlyRate: 350
      },
      {
        id: "t2",
        number: "PS5 1",
        gameType: "PS5",
        pricingGroup: "players-2",
        status: "AVAILABLE",
        active: true,
        hourlyRate: 150
      }
    ]);
    expect(mocks.prisma.clubTable.findMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1" },
      orderBy: [{ active: "desc" }, { gameType: "asc" }, { number: "asc" }]
    });
    expect(mocks.prisma.tablePricing.findMany).toHaveBeenCalledWith({
      where: { businessId: "biz-1", durationMinutes: 60 }
    });
  });

  it("falls back to 0 when no hourly rule exists for a table's group", async () => {
    mocks.prisma.clubTable.findMany.mockResolvedValue([
      {
        id: "t1",
        number: "Pool 1",
        gameType: "POOL",
        pricingGroup: "standard",
        status: "AVAILABLE",
        active: true
      }
    ]);
    mocks.prisma.tablePricing.findMany.mockResolvedValue([]);

    const items = await getBookableItems("biz-1");

    expect(items[0]?.hourlyRate).toBe(0);
  });

  it("returns an empty list for a business without tables", async () => {
    mocks.prisma.clubTable.findMany.mockResolvedValue([]);
    mocks.prisma.tablePricing.findMany.mockResolvedValue([]);

    const items = await getBookableItems("biz-1");

    expect(items).toEqual([]);
  });
});

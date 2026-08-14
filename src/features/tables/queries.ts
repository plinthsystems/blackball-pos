import { prisma } from "@/server/db/prisma";
import type { BookableItem } from "./types";

export async function getBookableItems(businessId: string): Promise<BookableItem[]> {
  const [tables, pricingRules] = await Promise.all([
    prisma.clubTable.findMany({
      where: { businessId },
      orderBy: [{ active: "desc" }, { gameType: "asc" }, { number: "asc" }]
    }),
    prisma.tablePricing.findMany({
      where: { businessId, durationMinutes: 60 }
    })
  ]);

  const rateByKey = new Map(pricingRules.map((rule) => [`${rule.gameType}:${rule.pricingGroup}`, Number(rule.priceAmount)]));

  return tables.map((table) => ({
    id: table.id,
    number: table.number,
    gameType: table.gameType,
    pricingGroup: table.pricingGroup,
    status: table.status,
    active: table.active,
    hourlyRate: rateByKey.get(`${table.gameType}:${table.pricingGroup}`) ?? 0
  }));
}

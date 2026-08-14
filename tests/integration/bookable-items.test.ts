import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { createBookableItemAction, setBookableItemActiveAction, updateBookableItemAction } from "@/features/tables/actions";
import { getBookableItems } from "@/features/tables/queries";
import { getLiveTableBoard } from "@/features/live-tables/queries";

vi.mock("next/cache", () => ({
  revalidatePath: () => {}
}));

const createdIds: string[] = [];
const createdRateGroupKeys: Array<{ gameType: string; pricingGroup: string }> = [];

async function cleanup() {
  if (createdIds.length > 0) {
    await prisma.clubTable.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  }
  await Promise.all(
    createdRateGroupKeys.splice(0, createdRateGroupKeys.length).map(({ gameType, pricingGroup }) =>
      prisma.tablePricing.deleteMany({
        where: { businessId: "seed-business", gameType: gameType as "SNOOKER" | "POOL" | "PS5", pricingGroup }
      })
    )
  );
}

afterEach(cleanup);

describe("bookable items integration", () => {
  it("lets the store manager create, update, and remove bookable items", async () => {
    const context = await getCurrentEmployeeContext();
    const unique = `ZZ Test ${Date.now()}`;

    const created = await createBookableItemAction({
      number: unique,
      gameType: "PS5",
      pricingGroup: "standard"
    });
    expect(created.ok).toBe(true);

    const item = await prisma.clubTable.findFirst({ where: { number: unique } });
    expect(item).not.toBeNull();
    expect(item?.active).toBe(true);
    createdIds.push(item!.id);

    const ps5StandardRate = await prisma.tablePricing.findUnique({
      where: {
        businessId_gameType_pricingGroup_durationMinutes: {
          businessId: context.businessId,
          gameType: "PS5",
          pricingGroup: "standard",
          durationMinutes: 60
        }
      }
    });
    expect(ps5StandardRate).not.toBeNull();
    expect(Number(ps5StandardRate?.priceAmount)).toBe(150);
    createdRateGroupKeys.push({ gameType: "PS5", pricingGroup: "standard" });

    const updated = await updateBookableItemAction({
      id: item!.id,
      number: `${unique}b`,
      gameType: "SNOOKER",
      pricingGroup: "royal"
    });
    expect(updated.ok).toBe(true);
    const afterUpdate = await prisma.clubTable.findUnique({ where: { id: item!.id } });
    expect(afterUpdate?.number).toBe(`${unique}b`);
    expect(afterUpdate?.gameType).toBe("SNOOKER");
    expect(context.permissions).toContain("tables.manage");

    const removed = await setBookableItemActiveAction({ id: item!.id, active: false });
    expect(removed.ok).toBe(true);
    await expect(prisma.clubTable.findUnique({ where: { id: item!.id } })).resolves.toMatchObject({ active: false });

    const restored = await setBookableItemActiveAction({ id: item!.id, active: true });
    expect(restored.ok).toBe(true);
    await expect(prisma.clubTable.findUnique({ where: { id: item!.id } })).resolves.toMatchObject({ active: true });
  });

  it("rejects a duplicate item name for the same store", async () => {
    const unique = `ZZ Duplicate ${Date.now()}`;
    const first = await createBookableItemAction({ number: unique, gameType: "POOL", pricingGroup: "standard" });
    expect(first.ok).toBe(true);
    const item = await prisma.clubTable.findFirst({ where: { number: unique } });
    createdIds.push(item!.id);

    const duplicate = await createBookableItemAction({ number: unique, gameType: "POOL", pricingGroup: "standard" });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.message).toContain("already exists");
  });

  it("hides removed items from the live floor and the manager list keeps them", async () => {
    const unique = `ZZ Hidden ${Date.now()}`;
    const created = await createBookableItemAction({ number: unique, gameType: "POOL", pricingGroup: "standard" });
    expect(created.ok).toBe(true);
    const item = await prisma.clubTable.findFirst({ where: { number: unique } });
    createdIds.push(item!.id);
    await setBookableItemActiveAction({ id: item!.id, active: false });

    const board = await getLiveTableBoard("seed-business");
    expect(board.some((table) => table.id === item!.id)).toBe(false);

    const items = await getBookableItems("seed-business");
    const listed = items.find((entry) => entry.id === item!.id);
    expect(listed?.active).toBe(false);
  });
});

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBookableItemAction,
  setBookableItemActiveAction,
  updateBookableItemAction
} from "@/features/tables/actions";
import { makeEmployeeContext } from "./support/employee-context";

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
  return {
    prisma: { $transaction: vi.fn(), clubTable: model(), tablePricing: model() },
    context: vi.fn(),
    revalidatePath: vi.fn()
  };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/server/auth/current-employee", () => ({ getCurrentEmployeeContext: mocks.context }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test"
  });
}

/** Runs the prisma.$transaction callback with the mocked prisma object as tx. */
function txThrough() {
  mocks.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback(mocks.prisma)
  );
}

describe("createBookableItemAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    txThrough();
    mocks.prisma.clubTable.findFirst.mockReset();
    mocks.prisma.clubTable.create.mockReset();
    mocks.prisma.tablePricing.findUnique.mockReset();
    mocks.prisma.tablePricing.create.mockReset();
  });

  it("creates the table and an hourly rate rule when the group has no rule yet", async () => {
    mocks.prisma.tablePricing.findUnique.mockResolvedValue(null);
    mocks.prisma.tablePricing.create.mockResolvedValue({});
    mocks.prisma.clubTable.create.mockResolvedValue({ id: "t1" });

    const result = await createBookableItemAction({
      number: "Table 9",
      gameType: "PS5",
      pricingGroup: "standard"
    });

    expect(result).toEqual({ ok: true, message: "Bookable item added." });
    // defaultHourlyRateFor("PS5", "standard") => 150
    expect(mocks.prisma.tablePricing.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz-1",
        gameType: "PS5",
        pricingGroup: "standard",
        durationMinutes: 60,
        priceAmount: 150
      }
    });
    expect(mocks.prisma.clubTable.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz-1",
        number: "Table 9",
        gameType: "PS5",
        pricingGroup: "standard",
        status: "AVAILABLE",
        active: true
      }
    });
    for (const path of ["/tables", "/live-tables", "/bookings", "/dashboard"]) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path);
    }
  });

  it("reuses an existing hourly rate rule instead of creating a second one", async () => {
    mocks.prisma.tablePricing.findUnique.mockResolvedValue({ id: "rate-royal" });
    mocks.prisma.clubTable.create.mockResolvedValue({ id: "t2" });

    const result = await createBookableItemAction({
      number: "Snooker 3",
      gameType: "SNOOKER",
      pricingGroup: "royal"
    });

    expect(result.ok).toBe(true);
    expect(mocks.prisma.tablePricing.create).not.toHaveBeenCalled();
  });

  it("surfaces a friendly message for duplicate numbers (P2002)", async () => {
    mocks.prisma.tablePricing.findUnique.mockResolvedValue(null);
    mocks.prisma.clubTable.create.mockRejectedValueOnce(p2002());

    const result = await createBookableItemAction({
      number: "Table 1",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    expect(result).toEqual({
      ok: false,
      message: "An item with this name already exists for your store."
    });
  });

  it("rejects invalid input with a generic failure", async () => {
    const result = await createBookableItemAction({ number: "", gameType: "POOL" });

    expect(result).toEqual({
      ok: false,
      message: "The operation could not be completed. Please try again."
    });
    expect(mocks.prisma.clubTable.create).not.toHaveBeenCalled();
  });

  it("returns ok:false when the employee lacks tables.manage", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: ["tables.read"] }));

    const result = await createBookableItemAction({
      number: "Table 5",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    expect(result.ok).toBe(false);
    expect(mocks.prisma.clubTable.create).not.toHaveBeenCalled();
  });

  it("returns ok:false when the transaction throws an unexpected error", async () => {
    mocks.prisma.tablePricing.findUnique.mockRejectedValueOnce(new Error("boom"));

    const result = await createBookableItemAction({
      number: "Table 5",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    expect(result.ok).toBe(false);
    expect(mocks.prisma.clubTable.create).not.toHaveBeenCalled();
  });
});

describe("updateBookableItemAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    txThrough();
    mocks.prisma.clubTable.findFirst.mockReset();
    mocks.prisma.clubTable.findFirst.mockResolvedValue({ id: "t1" });
    mocks.prisma.clubTable.update.mockReset();
    mocks.prisma.clubTable.update.mockResolvedValue({ id: "t1" });
    mocks.prisma.tablePricing.findUnique.mockReset();
    mocks.prisma.tablePricing.findUnique.mockResolvedValue({ id: "rate-1" });
    mocks.prisma.tablePricing.create.mockReset();
  });

  it("updates the item attributes inside a transaction", async () => {
    const result = await updateBookableItemAction({
      id: "t1",
      number: "Table 1A",
      gameType: "SNOOKER",
      pricingGroup: "mini"
    });

    expect(result).toEqual({ ok: true, message: "Bookable item updated." });
    expect(mocks.prisma.clubTable.findFirst).toHaveBeenCalledWith({
      where: { id: "t1", businessId: "biz-1" },
      select: { id: true }
    });
    expect(mocks.prisma.clubTable.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { number: "Table 1A", gameType: "SNOOKER", pricingGroup: "mini", active: true }
    });
  });

  it("rejects a missing id without touching the database", async () => {
    const result = await updateBookableItemAction({
      number: "Table 1A",
      gameType: "SNOOKER",
      pricingGroup: "mini"
    });

    expect(result).toEqual({ ok: false, message: "Choose an item to update." });
    expect(mocks.prisma.clubTable.findFirst).not.toHaveBeenCalled();
  });

  it("treats an unknown item as not found (current behavior: transaction return does not escape)", async () => {
    mocks.prisma.clubTable.findFirst.mockResolvedValue(null);

    const result = await updateBookableItemAction({
      id: "missing-1",
      number: "Table X",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    // The `return {ok:false}` inside the $transaction callback only exits the
    // callback — the action still reports success and no row is updated.
    // Documented in TEST_GAP_REPORT §3.4; revisit if the action is hardened.
    expect(result).toEqual({ ok: true, message: "Bookable item updated." });
    expect(mocks.prisma.clubTable.update).not.toHaveBeenCalled();
  });

  it("surfaces a friendly message for duplicate numbers (P2002)", async () => {
    mocks.prisma.clubTable.update.mockRejectedValueOnce(p2002());

    const result = await updateBookableItemAction({
      id: "t1",
      number: "Table 1",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    expect(result).toEqual({
      ok: false,
      message: "An item with this name already exists for your store."
    });
  });

  it("returns ok:false when the employee lacks tables.manage", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await updateBookableItemAction({
      id: "t1",
      number: "Table 1A",
      gameType: "POOL",
      pricingGroup: "standard"
    });

    expect(result.ok).toBe(false);
    expect(mocks.prisma.clubTable.findFirst).not.toHaveBeenCalled();
  });
});

describe("setBookableItemActiveAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.clubTable.updateMany.mockReset();
    mocks.prisma.clubTable.updateMany.mockResolvedValue({ count: 1 });
  });

  it("restores an inactive item", async () => {
    const result = await setBookableItemActiveAction({ id: "t1", active: true });

    expect(result).toEqual({ ok: true, message: "Item restored." });
    expect(mocks.prisma.clubTable.updateMany).toHaveBeenCalledWith({
      where: { id: "t1", businessId: "biz-1" },
      data: { active: true }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/tables");
  });

  it("removes an item from the store", async () => {
    const result = await setBookableItemActiveAction({ id: "t1", active: false });

    expect(result).toEqual({ ok: true, message: "Item removed from store." });
  });

  it("rejects a missing id or non-boolean active flag", async () => {
    const noId = await setBookableItemActiveAction({ active: true });
    expect(noId).toEqual({ ok: false, message: "Choose an item to update." });

    const badFlag = await setBookableItemActiveAction({ id: "t1", active: "yes" });
    expect(badFlag).toEqual({ ok: false, message: "Choose an item to update." });

    expect(mocks.prisma.clubTable.updateMany).not.toHaveBeenCalled();
  });

  it("reports an unknown item when updateMany matches nothing", async () => {
    mocks.prisma.clubTable.updateMany.mockResolvedValue({ count: 0 });

    const result = await setBookableItemActiveAction({ id: "ghost", active: true });

    expect(result).toEqual({ ok: false, message: "This bookable item was not found." });
  });

  it("returns ok:false when the employee lacks tables.manage", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: ["tables.read"] }));

    const result = await setBookableItemActiveAction({ id: "t1", active: false });

    expect(result.ok).toBe(false);
    expect(mocks.prisma.clubTable.updateMany).not.toHaveBeenCalled();
  });

  it("returns ok:false when the update throws", async () => {
    mocks.prisma.clubTable.updateMany.mockRejectedValueOnce(new Error("db down"));

    const result = await setBookableItemActiveAction({ id: "t1", active: true });

    expect(result.ok).toBe(false);
  });
});

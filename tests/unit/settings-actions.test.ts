import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOrUpdateProductAction,
  deactivateProductAction,
  updateBookingSettingsAction,
  updateBrandingAction
} from "@/features/settings/actions";
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
    prisma: { businessSettings: model(), product: model() },
    context: vi.fn(),
    revalidatePath: vi.fn()
  };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/server/auth/current-employee", () => ({ getCurrentEmployeeContext: mocks.context }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const validBookingSettings = {
  bookingEnabled: true,
  requireConfirmation: true,
  bookingBufferMinutes: 10,
  bookingMinLeadMinutes: 30,
  bookingOpenHour: 9,
  bookingCloseHour: 23,
  bookingCloseNextDay: false,
  paymentProvider: "NONE",
  bookingAdvanceAmount: 0
};

describe("updateBookingSettingsAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.businessSettings.upsert.mockReset();
    mocks.prisma.businessSettings.upsert.mockResolvedValue({});
  });

  it("upserts booking preferences and revalidates /settings", async () => {
    const result = await updateBookingSettingsAction(validBookingSettings);

    expect(result).toEqual({ ok: true, message: "Booking preferences saved." });
    expect(mocks.prisma.businessSettings.upsert).toHaveBeenCalledWith({
      where: { businessId: "biz-1" },
      update: validBookingSettings,
      create: { businessId: "biz-1", ...validBookingSettings }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("surfaces the zod issue path and message for invalid input", async () => {
    const result = await updateBookingSettingsAction({
      ...validBookingSettings,
      bookingOpenHour: 25
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("bookingOpenHour");
  });

  it("rejects a close hour that is not after the open hour", async () => {
    const result = await updateBookingSettingsAction({
      ...validBookingSettings,
      bookingOpenHour: 20,
      bookingCloseHour: 8,
      bookingCloseNextDay: false
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("bookingCloseHour");
  });

  it("returns the underlying error message when the upsert throws", async () => {
    mocks.prisma.businessSettings.upsert.mockRejectedValueOnce(new Error("db exploded"));

    const result = await updateBookingSettingsAction(validBookingSettings);

    expect(result).toEqual({ ok: false, message: "db exploded" });
  });

  it("returns ok:false when the employee lacks settings.update", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await updateBookingSettingsAction(validBookingSettings);

    expect(result.ok).toBe(false);
    expect(mocks.prisma.businessSettings.upsert).not.toHaveBeenCalled();
  });
});

describe("createOrUpdateProductAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.product.create.mockReset();
    mocks.prisma.product.update.mockReset();
  });

  it("creates a new menu item", async () => {
    mocks.prisma.product.create.mockResolvedValue({ id: "p1" });

    const result = await createOrUpdateProductAction({
      name: "Masala Chai",
      category: "FOOD",
      priceAmount: 30
    });

    expect(result).toEqual({ ok: true, message: "Item added." });
    expect(mocks.prisma.product.create).toHaveBeenCalledWith({
      data: {
        businessId: "biz-1",
        name: "Masala Chai",
        category: "FOOD",
        priceAmount: 30
      }
    });
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
  });

  it("updates an existing item and reactivates it", async () => {
    mocks.prisma.product.update.mockResolvedValue({ id: "p1" });

    const result = await createOrUpdateProductAction({
      id: "p1",
      name: "Cold Coffee",
      category: "BEVERAGES",
      priceAmount: "120"
    });

    expect(result).toEqual({ ok: true, message: "Item updated." });
    expect(mocks.prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1", businessId: "biz-1" },
      data: { name: "Cold Coffee", category: "BEVERAGES", priceAmount: 120, active: true }
    });
  });

  it("rejects empty names and unknown categories with ok:false", async () => {
    const emptyName = await createOrUpdateProductAction({
      name: " ",
      category: "FOOD",
      priceAmount: 30
    });
    expect(emptyName).toEqual({ ok: false, message: "Menu item could not be saved." });

    const badCategory = await createOrUpdateProductAction({
      name: "Cake",
      category: "DESSERT",
      priceAmount: 30
    });
    expect(badCategory.ok).toBe(false);

    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it("returns ok:false when the employee lacks products.manage", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: ["settings.update"] }));

    const result = await createOrUpdateProductAction({
      name: "Chips",
      category: "FOOD",
      priceAmount: 30
    });

    expect(result.ok).toBe(false);
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it("returns ok:false when the prisma call throws", async () => {
    mocks.prisma.product.create.mockRejectedValueOnce(new Error("boom"));

    const result = await createOrUpdateProductAction({
      name: "Chips",
      category: "FOOD",
      priceAmount: 30
    });

    expect(result).toEqual({ ok: false, message: "Menu item could not be saved." });
  });
});

describe("deactivateProductAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.product.update.mockReset();
    mocks.prisma.product.update.mockResolvedValue({ id: "p1" });
  });

  it("deactivates the chosen product", async () => {
    const result = await deactivateProductAction({ id: "p1" });

    expect(result).toEqual({ ok: true, message: "Item removed from list." });
    expect(mocks.prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1", businessId: "biz-1" },
      data: { active: false }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
  });

  it("rejects when no id is provided", async () => {
    const result = await deactivateProductAction({});
    expect(result).toEqual({ ok: false, message: "Choose an item to remove." });
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it("returns ok:false when the employee lacks products.manage", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await deactivateProductAction({ id: "p1" });

    expect(result).toEqual({ ok: false, message: "Menu item could not be removed." });
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it("returns ok:false when the update throws", async () => {
    mocks.prisma.product.update.mockRejectedValueOnce(new Error("boom"));

    const result = await deactivateProductAction({ id: "p1" });

    expect(result).toEqual({ ok: false, message: "Menu item could not be removed." });
  });
});

describe("updateBrandingAction", () => {
  const branding = {
    appName: "Royal Cue",
    logoInitials: "rc",
    brandColor: "#12613d",
    accentColor: "#b98922"
  };

  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.revalidatePath.mockReset();
    mocks.prisma.businessSettings.upsert.mockReset();
    mocks.prisma.businessSettings.upsert.mockResolvedValue({});
  });

  it("upserts branding settings; logo initials are uppercased by the schema", async () => {
    const result = await updateBrandingAction(branding);

    expect(result).toEqual({ ok: true, message: "Branding updated." });
    expect(mocks.prisma.businessSettings.upsert).toHaveBeenCalledWith({
      where: { businessId: "biz-1" },
      update: { ...branding, logoInitials: "RC" },
      create: { businessId: "biz-1", ...branding, logoInitials: "RC" }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("rejects invalid hex colors", async () => {
    const result = await updateBrandingAction({ ...branding, brandColor: "green" });

    expect(result).toEqual({ ok: false, message: "Branding could not be saved." });
    expect(mocks.prisma.businessSettings.upsert).not.toHaveBeenCalled();
  });

  it("returns ok:false when the employee lacks settings.update", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: [] }));

    const result = await updateBrandingAction(branding);

    expect(result.ok).toBe(false);
    expect(mocks.prisma.businessSettings.upsert).not.toHaveBeenCalled();
  });

  it("returns ok:false when the upsert throws", async () => {
    mocks.prisma.businessSettings.upsert.mockRejectedValueOnce(new Error("boom"));

    const result = await updateBrandingAction(branding);

    expect(result).toEqual({ ok: false, message: "Branding could not be saved." });
  });
});

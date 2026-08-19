import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateHourlyRateAction } from "@/features/rates/actions";
import { makeEmployeeContext } from "./support/employee-context";

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
  return {
    prisma,
    context: vi.fn(),
    revalidatePath: vi.fn()
  };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/server/auth/current-employee", () => ({ getCurrentEmployeeContext: mocks.context }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

describe("updateHourlyRateAction", () => {
  beforeEach(() => {
    mocks.context.mockReset();
    mocks.context.mockResolvedValue(makeEmployeeContext());
    mocks.prisma.tablePricing.update.mockReset();
    mocks.prisma.tablePricing.update.mockResolvedValue({
      id: "rate-1",
      priceAmount: 250
    });
    mocks.revalidatePath.mockReset();
  });

  it("updates the hourly rate and revalidates the affected pages", async () => {
    const result = await updateHourlyRateAction({ id: "rate-1", hourlyRate: 250 });

    expect(result).toEqual({ ok: true, message: "Hourly rate updated." });
    expect(mocks.prisma.tablePricing.update).toHaveBeenCalledWith({
      where: { id: "rate-1", businessId: "biz-1" },
      data: { priceAmount: 250 }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rates");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/live-tables");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("coerces a string rate into a number", async () => {
    const result = await updateHourlyRateAction({ id: "rate-1", hourlyRate: "275" });

    expect(result.ok).toBe(true);
    expect(mocks.prisma.tablePricing.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { priceAmount: 275 } })
    );
  });

  it("returns ok:false when the employee lacks rates.manage", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ permissions: ["dashboard.read"] }));

    const result = await updateHourlyRateAction({ id: "rate-1", hourlyRate: 200 });

    expect(result.ok).toBe(false);
    expect(mocks.prisma.tablePricing.update).not.toHaveBeenCalled();
  });

  it("returns ok:false when a password change is still required", async () => {
    mocks.context.mockResolvedValue(makeEmployeeContext({ mustChangePassword: true }));

    const result = await updateHourlyRateAction({ id: "rate-1", hourlyRate: 200 });

    expect(result).toEqual({ ok: false, message: "Hourly rate could not be updated." });
    expect(mocks.prisma.tablePricing.update).not.toHaveBeenCalled();
  });

  it("rejects invalid input (missing id / negative rate) with ok:false", async () => {
    const missingId = await updateHourlyRateAction({ hourlyRate: 200 });
    expect(missingId.ok).toBe(false);

    const negativeRate = await updateHourlyRateAction({ id: "rate-1", hourlyRate: -5 });
    expect(negativeRate.ok).toBe(false);

    const noInput = await updateHourlyRateAction(null);
    expect(noInput.ok).toBe(false);

    expect(mocks.prisma.tablePricing.update).not.toHaveBeenCalled();
  });

  it("returns ok:false when the prisma update throws", async () => {
    mocks.prisma.tablePricing.update.mockRejectedValueOnce(new Error("db down"));

    const result = await updateHourlyRateAction({ id: "rate-1", hourlyRate: 200 });

    expect(result).toEqual({ ok: false, message: "Hourly rate could not be updated." });
  });
});

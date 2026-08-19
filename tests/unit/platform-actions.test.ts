import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFranchiseSetupAction, createSaasSetupAction } from "@/features/platform/actions";
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
    prisma: {
      $transaction: vi.fn(),
      organization: model(),
      subscriptionPlan: model(),
      business: model(),
      businessSettings: model(),
      permission: model(),
      role: model(),
      rolePermission: model(),
      employee: model(),
      tablePricing: model(),
      product: model(),
      subscription: model(),
      franchisee: model(),
      royaltyRule: model()
    },
    context: vi.fn(),
    revalidatePath: vi.fn(),
    cookies: vi.fn(),
    cookieSet: vi.fn(),
    redirect: vi.fn()
  };
});

vi.mock("@/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/server/auth/current-employee", () => ({ getCurrentEmployeeContext: mocks.context }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const OPERATIONAL_PERMISSIONS = [
  "dashboard.read",
  "tables.read",
  "tables.manage",
  "tables.update_status",
  "sessions.start",
  "sessions.pause",
  "sessions.resume",
  "sessions.extend",
  "sessions.end",
  "sessions.add_items",
  "bills.manage",
  "products.manage",
  "rates.manage",
  "settings.update",
  "bookings.manage"
];

function txThrough() {
  mocks.prisma.$transaction.mockReset();
  mocks.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback(mocks.prisma)
  );
}

function saasFormData(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.append("organizationName", "Royal Cue");
  form.append("businessName", "Cue Club");
  form.append("ownerEmail", "owner@cue.example");
  form.append("staffEmail", "staff@cue.example");
  form.append("planId", "plan-1");
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

function franchiseFormData(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.append("franchiseBrandName", "Global Cues");
  form.append("franchiseeName", "Rahul");
  form.append("businessName", "Rahul Cue Club");
  form.append("ownerEmail", "rahul@cue.example");
  form.append("royaltyPercent", "12");
  form.append("planId", "plan-1");
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

function provisionCookiePayload(): Record<string, unknown> {
  const call = mocks.cookieSet.mock.calls[0];
  return JSON.parse(call?.[1] as string) as Record<string, unknown>;
}

beforeEach(() => {
  mocks.context.mockReset();
  mocks.context.mockResolvedValue(
    makeEmployeeContext({
      accountType: "PLATFORM_ADMIN",
      employeeId: "admin-1",
      permissions: [...makeEmployeeContext().permissions, "platform.setup.manage"]
    })
  );
  mocks.revalidatePath.mockReset();
  mocks.redirect.mockReset();
  mocks.cookies.mockReset();
  mocks.cookies.mockResolvedValue({ set: mocks.cookieSet });
  mocks.cookieSet.mockReset();

  txThrough();
  mocks.prisma.organization.upsert.mockReset();
  mocks.prisma.organization.upsert.mockResolvedValue({ id: "org-1" });
  mocks.prisma.subscriptionPlan.findFirst.mockReset();
  mocks.prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: "plan-1" });
  mocks.prisma.business.upsert.mockReset();
  mocks.prisma.business.upsert.mockResolvedValue({ id: "biz-1", slug: "biz-1" });
  mocks.prisma.businessSettings.upsert.mockReset();
  mocks.prisma.businessSettings.upsert.mockResolvedValue({});
  mocks.prisma.permission.upsert.mockReset();
  mocks.prisma.permission.upsert.mockResolvedValue({});
  mocks.prisma.permission.findMany.mockReset();
  mocks.prisma.permission.findMany.mockResolvedValue(
    OPERATIONAL_PERMISSIONS.map((key) => ({ id: key, key }))
  );
  mocks.prisma.role.upsert.mockReset();
  mocks.prisma.role.upsert.mockResolvedValue({ id: "role-owner" });
  mocks.prisma.rolePermission.upsert.mockReset();
  mocks.prisma.rolePermission.upsert.mockResolvedValue({});
  mocks.prisma.employee.upsert.mockReset();
  mocks.prisma.employee.upsert.mockResolvedValue({});
  mocks.prisma.tablePricing.upsert.mockReset();
  mocks.prisma.tablePricing.upsert.mockResolvedValue({});
  mocks.prisma.product.upsert.mockReset();
  mocks.prisma.product.upsert.mockResolvedValue({});
  mocks.prisma.subscription.upsert.mockReset();
  mocks.prisma.subscription.upsert.mockResolvedValue({});
  mocks.prisma.franchisee.upsert.mockReset();
  mocks.prisma.franchisee.upsert.mockResolvedValue({ id: "fr-1" });
  mocks.prisma.royaltyRule.upsert.mockReset();
  mocks.prisma.royaltyRule.upsert.mockResolvedValue({});
});

describe("createSaasSetupAction", () => {
  it("provisions an organization, outlet, roles and subscription in one transaction", async () => {
    await createSaasSetupAction(saasFormData());

    expect(mocks.prisma.organization.upsert).toHaveBeenCalledWith({
      where: { slug: "royal-cue" },
      update: { name: "Royal Cue", type: "INDEPENDENT_SAAS" },
      create: { name: "Royal Cue", slug: "royal-cue", type: "INDEPENDENT_SAAS" }
    });
    expect(mocks.prisma.subscriptionPlan.findFirst).toHaveBeenCalledWith({
      where: { id: "plan-1", active: true },
      select: { id: true }
    });
    // uniqueBusinessSlug appends a timestamp suffix
    expect(mocks.prisma.business.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: expect.stringMatching(/^cue-club-/) },
        create: expect.objectContaining({
          organizationId: "org-1",
          name: "Cue Club",
          email: "owner@cue.example"
        })
      })
    );
    expect(mocks.prisma.businessSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          businessId: "biz-1",
          appName: "Royal Cue",
          logoInitials: "RC",
          brandColor: "#16a34a",
          accentColor: "#22d3ee"
        })
      })
    );
    expect(mocks.prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "subscription-biz-1" },
        create: expect.objectContaining({ planId: "plan-1", status: "ACTIVE", outletLimit: 1 })
      })
    );
    expect(mocks.prisma.role.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId_name: { businessId: "biz-1", name: "Owner" } } })
    );
    expect(mocks.prisma.role.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId_name: { businessId: "biz-1", name: "Staff" } } })
    );
  });

  it("seeds owner and staff accounts with hashed one-time passwords", async () => {
    await createSaasSetupAction(saasFormData());

    // owner + staff
    expect(mocks.prisma.employee.upsert).toHaveBeenCalledTimes(2);
    const calls = mocks.prisma.employee.upsert.mock.calls;
    const ownerCreate = calls[0]?.[0].create;
    const staffCreate = calls[1]?.[0].create;
    expect(ownerCreate).toMatchObject({
      id: "user-owner-biz-1",
      email: "owner@cue.example",
      accountType: "STORE_OWNER",
      active: true,
      mustChangePassword: true
    });
    // hashPassword produces "salt:derived" — a real hash, not the plaintext
    expect(String(ownerCreate.passwordHash)).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
    expect(ownerCreate.passwordHash).not.toContain("owner@cue.example");
    expect(ownerCreate.roles.create.roleId).toBe("role-owner");
    expect(staffCreate).toMatchObject({
      id: "user-staff-biz-1",
      email: "staff@cue.example",
      accountType: "STORE_USER"
    });
    expect(mocks.prisma.rolePermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ roleId: "role-owner" }) })
    );
  });

  it("sets the provisioning OTP cookie and redirects to the created slash page", async () => {
    await createSaasSetupAction(saasFormData());

    expect(mocks.cookies).toHaveBeenCalled();
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "provision_otps",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        secure: false, // not "production" in tests
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 60
      })
    );
    const payload = provisionCookiePayload();
    expect(payload["biz-1"]).toMatchObject({
      ownerEmail: "owner@cue.example",
      staffEmail: "staff@cue.example"
    });
    expect((payload["biz-1"] as Record<string, string>).ownerPassword.length).toBeGreaterThan(0);
    expect((payload["biz-1"] as Record<string, string>).staffPassword.length).toBeGreaterThan(0);

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/platform/setup");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/platform/setup/saas");
    expect(mocks.redirect).toHaveBeenCalledWith("/platform/setup/saas?created=biz-1");
  });

  it("skips the staff account when no staff email is provided", async () => {
    await createSaasSetupAction(saasFormData({ staffEmail: "" }));

    expect(mocks.prisma.employee.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.role.upsert).toHaveBeenCalledTimes(1);
    const payload = provisionCookiePayload();
    expect(payload["biz-1"]).toMatchObject({ staffEmail: null, staffPassword: null });
  });

  it("rejects a non-platform-admin caller", async () => {
    mocks.context.mockResolvedValue(
      makeEmployeeContext({ accountType: "STORE_OWNER", permissions: ["dashboard.read"] })
    );

    await expect(createSaasSetupAction(saasFormData())).rejects.toThrow(
      "Platform setup access is required."
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects invalid form input (zod)", async () => {
    await expect(createSaasSetupAction(saasFormData({ ownerEmail: "not-an-email" }))).rejects.toThrow();
    await expect(createSaasSetupAction(saasFormData({ organizationName: "x" }))).rejects.toThrow();
    await expect(createSaasSetupAction(saasFormData({ planId: "" }))).rejects.toThrow();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("aborts the transaction when the plan is not active", async () => {
    mocks.prisma.subscriptionPlan.findFirst.mockResolvedValue(null);

    await expect(createSaasSetupAction(saasFormData())).rejects.toThrow(
      "Please choose an active subscription plan before creating setup."
    );
    expect(mocks.prisma.business.upsert).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("propagates a transaction failure (no half-written state is committed)", async () => {
    mocks.prisma.business.upsert.mockRejectedValueOnce(new Error("db down"));

    await expect(createSaasSetupAction(saasFormData())).rejects.toThrow("db down");
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("createFranchiseSetupAction", () => {
  it("provisions a franchise organization, franchisee and royalty rule", async () => {
    await createFranchiseSetupAction(franchiseFormData());

    expect(mocks.prisma.organization.upsert).toHaveBeenCalledWith({
      where: { slug: "global-cues" },
      update: { name: "Global Cues", type: "FRANCHISE" },
      create: { name: "Global Cues", slug: "global-cues", type: "FRANCHISE" }
    });
    expect(mocks.prisma.franchisee.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_slug: { organizationId: "org-1", slug: "rahul" } },
        create: expect.objectContaining({
          organizationId: "org-1",
          name: "Rahul",
          contactName: "Rahul",
          email: "rahul@cue.example"
        })
      })
    );
    // 12% royalty -> 1200 basis points
    expect(mocks.prisma.royaltyRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "royalty-fr-1" },
        create: expect.objectContaining({
          organizationId: "org-1",
          franchiseeId: "fr-1",
          name: "Rahul royalty",
          basis: "GROSS_SALES",
          rateBasisPoints: 1200
        })
      })
    );
    expect(mocks.prisma.business.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ franchiseeId: "fr-1", organizationId: "org-1" })
      })
    );
    expect(mocks.prisma.employee.upsert).toHaveBeenCalledTimes(1);
  });

  it("stores only the owner OTP for franchisees and redirects to the franchise page", async () => {
    await createFranchiseSetupAction(franchiseFormData());

    const payload = provisionCookiePayload();
    expect(payload["biz-1"]).toMatchObject({
      ownerEmail: "rahul@cue.example",
      staffEmail: null,
      staffPassword: null
    });
    expect((payload["biz-1"] as Record<string, string>).ownerPassword.length).toBeGreaterThan(0);

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/platform/setup/franchise");
    expect(mocks.redirect).toHaveBeenCalledWith("/platform/setup/franchise?created=biz-1");
  });

  it("rejects a royalty percentage above the allowed range", async () => {
    await expect(createFranchiseSetupAction(franchiseFormData({ royaltyPercent: "45" }))).rejects.toThrow();
    await expect(createFranchiseSetupAction(franchiseFormData({ royaltyPercent: "abc" }))).rejects.toThrow();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a non-platform-admin caller", async () => {
    mocks.context.mockResolvedValue(
      makeEmployeeContext({ accountType: "HQ_ADMIN", permissions: ["hq.dashboard.read"] })
    );

    await expect(createFranchiseSetupAction(franchiseFormData())).rejects.toThrow(
      "Platform setup access is required."
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

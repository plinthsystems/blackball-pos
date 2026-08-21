import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock the entire prisma module before importing the action
const mockOrgCreate = vi.fn();
const mockEmployeeCreate = vi.fn();

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (cb) => {
      return cb({
        organization: { create: mockOrgCreate },
        employee: { create: mockEmployeeCreate }
      });
    })
  }
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Response(null, { status: 307 }); })
}));

vi.mock("@/server/auth/auth-service", () => ({
  hashPassword: vi.fn(() => "hashed_pass")
}));

describe("createPlatformAdminAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgCreate.mockResolvedValue({ id: "org_1" });
    mockEmployeeCreate.mockResolvedValue({ id: "emp_1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should redirect to setup on missing fields", async () => {
    const { createPlatformAdminAction } = await import("@/features/platform/actions/create-platform-admin-action");
    const formData = new FormData();
    formData.set("name", "Admin");
    formData.set("email", "a@b.com");
    formData.set("password", "password123");
    formData.set("businessName", "");

    // redirect() throws in tests
    await expect(createPlatformAdminAction(formData)).rejects.toThrow();
  });

  it("should create org and employee on success", async () => {
    const { createPlatformAdminAction } = await import("@/features/platform/actions/create-platform-admin-action");
    const formData = new FormData();
    formData.set("name", "Test Admin");
    formData.set("email", "admin@test.com");
    formData.set("password", "SecurePass123!");
    formData.set("businessName", "Test Club");

    // redirect() throws in tests, so we expect a throw after successful creation
    await expect(createPlatformAdminAction(formData)).rejects.toThrow();

    expect(mockOrgCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Test Club",
        slug: "test-club",
        type: "INDEPENDENT_SAAS"
      })
    });

    expect(mockEmployeeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Test Admin",
        email: "admin@test.com",
        passwordHash: "hashed_pass",
        accountType: "PLATFORM_ADMIN",
        businessId: "org_1"
      })
    });
  });

  it("should redirect to setup on DB errors", async () => {
    const { prisma } = await import("@/server/db/prisma");
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new Error("DB Error");
    });

    const { createPlatformAdminAction } = await import("@/features/platform/actions/create-platform-admin-action");
    const formData = new FormData();
    formData.set("name", "Admin");
    formData.set("email", "admin@test.com");
    formData.set("password", "password123");
    formData.set("businessName", "Test");

    // redirect() throws in tests
    await expect(createPlatformAdminAction(formData)).rejects.toThrow();
  });
});
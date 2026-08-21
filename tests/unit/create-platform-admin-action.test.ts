import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createPlatformAdminAction } from "@/features/platform/actions/create-platform-admin-action";
import { prisma } from "@/server/db/prisma";

// Force redirect to throw in tests
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Response(null, { status: 307 }); })
}));

vi.mock("@/server/auth/auth-service", () => ({
  hashPassword: vi.fn(() => "hashed_pass")
}));

describe("createPlatformAdminAction", () => {
  const mockOrgCreate = vi.fn();
  const mockEmployeeCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgCreate.mockResolvedValue({ id: "org_1" });
    mockEmployeeCreate.mockResolvedValue({ id: "emp_1" });
    
    // Spy on prisma.$transaction to intercept calls
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb) => {
      return cb({
        organization: { create: mockOrgCreate },
        employee: { create: mockEmployeeCreate }
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fail with missing fields", async () => {
    const formData = new FormData();
    formData.set("name", "Admin");
    formData.set("email", "a@b.com");
    formData.set("password", "password123");
    formData.set("businessName", "");

    const result = await createPlatformAdminAction(formData);
    expect(result).toHaveProperty("error");
  });

  it("should create org and employee on success", async () => {
    const formData = new FormData();
    formData.set("name", "Test Admin");
    formData.set("email", "admin@test.com");
    formData.set("password", "SecurePass123!");
    formData.set("businessName", "Test Club");

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
        permissions: expect.any(Array),
        businessId: "org_1"
      })
    });
  });

  it("should handle DB errors gracefully", async () => {
    prisma.$transaction.mockRejectedValueOnce(new Error("DB Error"));

    const formData = new FormData();
    formData.set("name", "Admin");
    formData.set("email", "admin@test.com");
    formData.set("password", "password123");
    formData.set("businessName", "Test");

    const result = await createPlatformAdminAction(formData);
    expect(result).toHaveProperty("error");
  });
});
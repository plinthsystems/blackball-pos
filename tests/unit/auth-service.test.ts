import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "@/server/auth/auth-service";

describe("auth-service", () => {
  it("correctly hashes and verifies passwords", () => {
    const password = "Password@123";
    const hash = hashPassword(password);

    expect(hash).toContain(":");
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("creates and verifies session tokens", () => {
    const token = createSessionToken({
      employeeId: "emp_123",
      email: "test@example.com",
      accountType: "STORE_OWNER",
      businessId: "biz_123",
      storeSlug: "store-slug"
    });

    const payload = verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("test@example.com");
    expect(payload?.accountType).toBe("STORE_OWNER");
  });
});

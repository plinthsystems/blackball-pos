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

import { verifySessionTokenEdge } from "@/server/auth/auth-service";

describe("auth-service security", () => {
  it("rejects tokens with a tampered payload (signature mismatch)", () => {
    const token = createSessionToken({
      employeeId: "emp_123",
      email: "test@example.com",
      accountType: "STORE_OWNER"
    });
    const [payloadB64, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payloadB64, "base64url").toString()), accountType: "PLATFORM_ADMIN" })
    ).toString("base64url");

    expect(verifySessionToken(`${tamperedPayload}.${signature}`)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = createSessionToken({
      employeeId: "emp_123",
      email: "test@example.com",
      accountType: "STORE_OWNER"
    });
    const [payloadB64, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    payload.exp = Date.now() - 1000;
    const expired = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;

    expect(verifySessionToken(expired)).toBeNull();
  });

  it("exposes an exp claim within the token", () => {
    const token = createSessionToken({ employeeId: "e1", email: "a@b.c", accountType: "MANAGER" });
    const [payloadB64] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(payload.exp).toBeTypeOf("number");
    expect(payload.exp).toBeGreaterThan(Date.now());
  });

  it("edge verifier rejects garbage tokens (no naive base64 trust)", async () => {
    const forged = Buffer.from(JSON.stringify({ email: "platform@blackball.example", accountType: "PLATFORM_ADMIN" })).toString("base64url");
    expect(await verifySessionTokenEdge(`${forged}.badsignature`)).toBeNull();
  });

  it("edge verifier accepts valid tokens", async () => {
    const token = createSessionToken({ employeeId: "e1", email: "a@b.c", accountType: "MANAGER" });
    const payload = await verifySessionTokenEdge(token);
    expect(payload?.email).toBe("a@b.c");
  });
});

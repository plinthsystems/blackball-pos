import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { hashPassword } from "@/server/auth/auth-service";
import { cookieValue, getSetCookies, makeRequest, withEnv } from "../support/request-helpers";

/**
 * POST /api/auth/login — locks existing behavior: cookie creation, role-based
 * redirectUrl, validation errors, demo cookies (dev only), error paths.
 * Rate limiting is out of scope (limiter mocked to allow).
 */

const prismaMock = vi.hoisted(() => ({
  employee: { findFirst: vi.fn() }
}));

const rateLimitMock = vi.hoisted(() => ({
  checkRateLimit: vi.fn(() => true),
  clientIpFromRequest: vi.fn(() => "127.0.0.1")
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/auth/rate-limit", () => rateLimitMock);

function employeeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp_1",
    email: "Owner@Blackball.Example ",
    passwordHash: hashPassword("secret123"),
    accountType: "STORE_OWNER",
    businessId: "biz_1",
    mustChangePassword: false,
    business: { slug: "my-store" },
    ...overrides
  };
}

function loginRequest(body: unknown): Request {
  return makeRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function authSessionCookie(response: Response): string {
  const cookie = getSetCookies(response).find((c) => c.startsWith("auth_session="));
  if (!cookie) throw new Error("auth_session cookie missing");
  return cookie;
}

const AUTH_SECRET = "login-route-test-secret-0123456789";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    prismaMock.employee.findFirst.mockReset();
    rateLimitMock.checkRateLimit.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeAll(() => {
    process.env.AUTH_SECRET = AUTH_SECRET;
  });

  afterAll(() => {
    delete process.env.AUTH_SECRET;
  });

  it("authenticates a store owner and sets the session + demo cookies", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture());

    const response = await POST(loginRequest({ email: "  Owner@Blackball.Example  ", password: "secret123" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, redirectUrl: "/dashboard" });

    const cookie = authSessionCookie(response);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
    expect(cookieValue(response, "demo_user_email")).toBe("Owner@Blackball.Example ");
    expect(cookieValue(response, "demo_store_slug")).toBe("my-store");
  });

  it("trims the email and matches case-insensitively", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture());

    await POST(loginRequest({ email: "  Owner@Blackball.Example  ", password: "secret123" }));

    expect(prismaMock.employee.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "Owner@Blackball.Example", mode: "insensitive" }, active: true },
      include: { business: true }
    });
  });

  it.each([
    ["PLATFORM_ADMIN", "/platform/setup"],
    ["HQ_ADMIN", "/hq/dashboard"]
  ])("redirects an %s to %s", async (accountType, redirectUrl) => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture({ accountType }));

    const response = await POST(loginRequest({ email: "owner@x.com", password: "secret123" }));
    expect(await response.json()).toEqual({ success: true, redirectUrl });
  });

  it("sends a must-change-password employee to /change-password", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(
      employeeFixture({ mustChangePassword: true })
    );

    const response = await POST(loginRequest({ email: "owner@x.com", password: "secret123" }));
    expect(await response.json()).toEqual({ success: true, redirectUrl: "/change-password" });
  });

  it("does not set demo cookies and marks auth_session Secure in production", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture());

    await withEnv({ NODE_ENV: "production" }, async () => {
      const response = await POST(loginRequest({ email: "owner@x.com", password: "secret123" }));

      expect(cookieValue(response, "demo_user_email")).toBeNull();
      expect(cookieValue(response, "demo_store_slug")).toBeNull();
      expect(authSessionCookie(response)).toContain("Secure");
    });
  });

  it("returns 400 when email or password is missing", async () => {
    const missingEmail = await POST(loginRequest({ password: "secret123" }));
    expect(missingEmail.status).toBe(400);
    expect(await missingEmail.json()).toEqual({ error: "Email and password are required" });

    const missingPassword = await POST(loginRequest({ email: "owner@x.com" }));
    expect(missingPassword.status).toBe(400);
  });

  it("returns 401 for an unknown or inactive employee", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(null);

    const response = await POST(loginRequest({ email: "nobody@x.com", password: "secret123" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid email or password" });
  });

  it("returns 401 for an employee without a password hash", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(
      employeeFixture({ passwordHash: null, accountType: "PLATFORM_ADMIN" })
    );

    const response = await POST(loginRequest({ email: "owner@x.com", password: "secret123" }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for a wrong password", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture());

    const response = await POST(loginRequest({ email: "owner@x.com", password: "wrong-password" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid email or password" });
  });

  it("returns 500 when the database throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.employee.findFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(loginRequest({ email: "owner@x.com", password: "secret123" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
    consoleError.mockRestore();
  });

  it("returns 500 when the request body is not valid JSON", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(
      makeRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json"
      })
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
    consoleError.mockRestore();
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/magic-login/route";
import { cookieValue, getSetCookies, withEnv } from "../support/request-helpers";

/**
 * GET /api/auth/magic-login — locks existing behavior: enable/access-key checks,
 * timing-safe key comparison (via GET), employee lookup, cookie + role redirects.
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

const MAGIC_KEY = "dev-magic-access-key";
const AUTH_SECRET = "magic-login-route-test-secret-0123456789";

function magicUrl(searchParams: Record<string, string>): Request {
  const query = new URLSearchParams(searchParams).toString();
  return new Request(`http://localhost:3000/api/auth/magic-login${query ? `?${query}` : ""}`, {
    headers: { host: "localhost:3000" }
  });
}

function employeeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp_1",
    email: "owner@blackball.example",
    passwordHash: "hash",
    accountType: "STORE_OWNER",
    businessId: "biz_1",
    mustChangePassword: false,
    business: { slug: "my-store" },
    ...overrides
  };
}

async function magicLoginWithEnabled(searchParams: Record<string, string>): Promise<Response> {
  return withEnv(
    { MAGIC_LOGIN_ENABLED: "true", DEV_ACCESS_KEY: MAGIC_KEY },
    () => GET(magicUrl(searchParams))
  );
}

describe("GET /api/auth/magic-login", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = AUTH_SECRET;
  });

  afterAll(() => {
    delete process.env.AUTH_SECRET;
  });

  beforeEach(() => {
    prismaMock.employee.findFirst.mockReset();
    rateLimitMock.checkRateLimit.mockReturnValue(true);
  });

  it("redirects to ?error=disabled when magic login is not enabled", async () => {
    const enabled = await withEnv({ MAGIC_LOGIN_ENABLED: "true" }, () =>
      GET(magicUrl({ email: "a@b.c", key: MAGIC_KEY }))
    );
    expect(enabled.status).toBe(307);
    expect(new URL(enabled.headers.get("location")!).searchParams.get("error")).toBe("disabled");
  });

  it("redirects to ?error=disabled when no dev access key is configured", async () => {
    const noKey = await withEnv({ MAGIC_LOGIN_ENABLED: "true" }, () =>
      GET(magicUrl({ email: "a@b.c", key: MAGIC_KEY }))
    );
    expect(new URL(noKey.headers.get("location")!).searchParams.get("error")).toBe("disabled");
  });

  it("redirects to ?error=invalid_key for a wrong key of the same length", async () => {
    const wrongKey = `${MAGIC_KEY.slice(0, -1)}x`;
    const response = await magicLoginWithEnabled({ email: "owner@x.com", key: wrongKey });
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("invalid_key");
  });

  it("redirects to ?error=invalid_key for a key of a different length (timing-safe guard)", async () => {
    const response = await magicLoginWithEnabled({ email: "owner@x.com", key: "short" });
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("invalid_key");
    expect(prismaMock.employee.findFirst).not.toHaveBeenCalled();
  });

  it("redirects to /magic-login without error when email is missing", async () => {
    const response = await magicLoginWithEnabled({ key: MAGIC_KEY });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/magic-login");
  });

  it("redirects to ?error=user_not_found for an unknown or inactive employee", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(null);

    const response = await magicLoginWithEnabled({ email: "nobody@x.com", key: MAGIC_KEY });
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("user_not_found");
  });

  it("looks up the employee with a trimmed, lowercased, active filter", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture());

    await magicLoginWithEnabled({ email: "  Owner@Blackball.Example  ", key: MAGIC_KEY });

    expect(prismaMock.employee.findFirst).toHaveBeenCalledWith({
      where: { email: "owner@blackball.example", active: true },
      include: { business: true }
    });
  });

  it("logs in a store owner: redirects to /dashboard with session + demo cookies", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture());

    const response = await magicLoginWithEnabled({ email: "owner@x.com", key: MAGIC_KEY });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");

    const cookie = getSetCookies(response).find((c) => c.startsWith("auth_session="));
    expect(cookie).toContain("HttpOnly");
    expect(cookieValue(response, "demo_user_email")).toBe("owner@blackball.example");
    expect(cookieValue(response, "demo_store_slug")).toBe("my-store");
  });

  it.each([
    ["PLATFORM_ADMIN", "/platform/setup"],
    ["HQ_ADMIN", "/hq/dashboard"]
  ])("redirects an %s to %s on success", async (accountType, target) => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture({ accountType }));

    const response = await magicLoginWithEnabled({ email: "admin@x.com", key: MAGIC_KEY });
    expect(response.headers.get("location")).toBe(`http://localhost:3000${target}`);
  });

  it("uses the store override param in the session token and demo cookie", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture());

    const response = await magicLoginWithEnabled({ email: "owner@x.com", key: MAGIC_KEY, store: "other-store" });

    expect(cookieValue(response, "demo_store_slug")).toBe("other-store");

    const token = cookieValue(response, "auth_session")!;
    const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
    expect(payload.storeSlug).toBe("other-store");
  });

  it("skips demo cookies and marks auth_session Secure in production", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(employeeFixture());

    const response = await withEnv(
      { MAGIC_LOGIN_ENABLED: "true", DEV_ACCESS_KEY: MAGIC_KEY, NODE_ENV: "production" },
      () => GET(magicUrl({ email: "owner@x.com", key: MAGIC_KEY }))
    );

    expect(cookieValue(response, "demo_user_email")).toBeNull();
    expect(cookieValue(response, "demo_store_slug")).toBeNull();
    const cookie = getSetCookies(response).find((c) => c.startsWith("auth_session="));
    expect(cookie).toContain("Secure");
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSessionToken } from "@/server/auth/auth-service";
import { withEnv } from "./support/request-helpers";

/**
 * Middleware guard tests — lock existing behavior: public routes, authn/authz
 * guards, `/login` role redirects, password-change guard, demo identity (dev only).
 */

const TEST_SECRET = "middleware-test-secret-0123456789abcdef";

function makeRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {}
  });
}

function tokenFor(overrides: Partial<Parameters<typeof createSessionToken>[0]> = {}): string {
  return createSessionToken({
    employeeId: "emp_1",
    email: "owner@blackball.example",
    accountType: "STORE_OWNER",
    businessId: "biz_1",
    storeSlug: "my-store",
    ...overrides
  });
}

describe("middleware", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    delete process.env.AUTH_SECRET;
  });

  describe("public routes", () => {
    it.each([
      "/",
      "/login",
      "/magic-login",
      "/docs",
      "/book",
      "/book/my-store",
      "/qr/book/my-store",
      "/_next/static/chunks/x.js",
      "/favicon.ico",
      "/api/auth/login",
      "/api/auth/magic-login",
      "/api/integrations/razorpay/webhook"
    ])("passes through unauthenticated request to %s", async (pathname) => {
      const response = await middleware(makeRequest(pathname));
      expect(response.status).toBe(200);
    });
  });

  describe("authentication guard", () => {
    it("redirects unauthenticated page requests to /login", async () => {
      const response = await middleware(makeRequest("/dashboard"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("returns 401 JSON for unauthenticated API requests", async () => {
      const response = await middleware(makeRequest("/api/bookings"));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("lets a request with a valid session token through", async () => {
      const response = await middleware(
        makeRequest("/dashboard", { auth_session: tokenFor() })
      );
      expect(response.status).toBe(200);
    });

    it("treats a tampered token as unauthenticated", async () => {
      const [payloadBase64, signature] = tokenFor().split(".");
      const tamperedPayload = Buffer.from(
        JSON.stringify({ employeeId: "emp_1", email: "owner@x.com", accountType: "PLATFORM_ADMIN" })
      ).toString("base64url");

      const response = await middleware(
        makeRequest("/platform/setup", { auth_session: `${tamperedPayload}.${signature}` })
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });
  });

  describe("role redirects from /login", () => {
    it("redirects a store owner to /dashboard", async () => {
      const response = await middleware(
        makeRequest("/login", { auth_session: tokenFor({ accountType: "STORE_OWNER" }) })
      );
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("redirects a platform admin to /platform/setup", async () => {
      const response = await middleware(
        makeRequest("/login", { auth_session: tokenFor({ accountType: "PLATFORM_ADMIN" }) })
      );
      expect(response.headers.get("location")).toBe("http://localhost:3000/platform/setup");
    });

    it("redirects an HQ admin to /hq/dashboard", async () => {
      const response = await middleware(
        makeRequest("/login", { auth_session: tokenFor({ accountType: "HQ_ADMIN" }) })
      );
      expect(response.headers.get("location")).toBe("http://localhost:3000/hq/dashboard");
    });
  });

  describe("demo identity (development only)", () => {
    it("trusts a demo platform email in dev and redirects /login to /platform/setup", async () => {
      const response = await middleware(
        makeRequest("/login", { demo_user_email: "platform.owner@blackball.example" })
      );
      expect(response.headers.get("location")).toBe("http://localhost:3000/platform/setup");
    });

    it("trusts a demo hq email in dev and redirects /login to /hq/dashboard", async () => {
      const response = await middleware(
        makeRequest("/login", { demo_user_email: "hq.admin@blackball.example" })
      );
      expect(response.headers.get("location")).toBe("http://localhost:3000/hq/dashboard");
    });

    it("ignores demo cookies in production — /login passes through", async () => {
      await withEnv({ NODE_ENV: "production" }, async () => {
        const response = await middleware(
          makeRequest("/login", { demo_user_email: "platform.owner@blackball.example" })
        );
        expect(response.status).toBe(200);
      });
    });
  });

  describe("password-change guard", () => {
    it("redirects a must-change-password user away from pages to /change-password", async () => {
      const response = await middleware(
        makeRequest("/dashboard", { auth_session: tokenFor({ mustChangePassword: true }) })
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/change-password");
    });

    it("lets API requests through for must-change-password users", async () => {
      const response = await middleware(
        makeRequest("/api/whatever", { auth_session: tokenFor({ mustChangePassword: true }) })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("platform route guard", () => {
    it("allows a platform admin", async () => {
      const response = await middleware(
        makeRequest("/platform/setup", { auth_session: tokenFor({ accountType: "PLATFORM_ADMIN" }) })
      );
      expect(response.status).toBe(200);
    });

    it("redirects a non-admin to /dashboard", async () => {
      const response = await middleware(
        makeRequest("/platform/setup", { auth_session: tokenFor({ accountType: "STORE_OWNER" }) })
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("allows a demo platform email in dev", async () => {
      const response = await middleware(
        makeRequest("/platform/setup", { demo_user_email: "platform@blackball.example" })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("hq route guard", () => {
    it.each(["HQ_ADMIN", "PLATFORM_ADMIN"])("allows %s", async (accountType) => {
      const response = await middleware(
        makeRequest("/hq/dashboard", { auth_session: tokenFor({ accountType }) })
      );
      expect(response.status).toBe(200);
    });

    it("redirects a store owner to /dashboard", async () => {
      const response = await middleware(
        makeRequest("/hq/dashboard", { auth_session: tokenFor({ accountType: "STORE_OWNER" }) })
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("allows a demo hq email in dev", async () => {
      const response = await middleware(
        makeRequest("/hq/dashboard", { demo_user_email: "hq.admin@blackball.example" })
      );
      expect(response.status).toBe(200);
    });
  });
});

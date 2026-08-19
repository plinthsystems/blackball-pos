import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clientIpFromRequest } from "@/server/auth/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request for a fresh key", () => {
    expect(checkRateLimit("fresh-key")).toBe(true);
  });

  it("blocks once the limit is exceeded (default limit 20)", () => {
    const key = "default-limit-key";
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(key)).toBe(true);
    }
    expect(checkRateLimit(key)).toBe(false);
  });

  it("respects a custom limit: limit-1 allowed, limit blocked", () => {
    const key = "custom-limit-key";
    expect(checkRateLimit(key, 3)).toBe(true);
    expect(checkRateLimit(key, 3)).toBe(true);
    expect(checkRateLimit(key, 3)).toBe(true);
    expect(checkRateLimit(key, 3)).toBe(false);
  });

  it("resets the counter after the window expires", () => {
    const key = "window-key";
    expect(checkRateLimit(key, 2)).toBe(true);
    expect(checkRateLimit(key, 2)).toBe(true);
    expect(checkRateLimit(key, 2)).toBe(false);

    // still blocked just before the window closes
    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(checkRateLimit(key, 2)).toBe(false);

    // window closed (resetAt < now is strict) -> counter resets, request allowed again
    vi.advanceTimersByTime(2);
    expect(checkRateLimit(key, 2)).toBe(true);
    expect(checkRateLimit(key, 2)).toBe(true);
    expect(checkRateLimit(key, 2)).toBe(false);
  });

  it("tracks keys independently", () => {
    expect(checkRateLimit("key-a", 1)).toBe(true);
    expect(checkRateLimit("key-a", 1)).toBe(false);
    expect(checkRateLimit("key-b", 1)).toBe(true);
  });
});

describe("clientIpFromRequest", () => {
  it("returns the first x-forwarded-for address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5" }
    });
    expect(clientIpFromRequest(request)).toBe("203.0.113.5");
  });

  it("returns the first address when multiple are present", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" }
    });
    expect(clientIpFromRequest(request)).toBe("203.0.113.5");
  });

  it("trims whitespace around the forwarded address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  203.0.113.5 , 10.0.0.1 " }
    });
    expect(clientIpFromRequest(request)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "5.5.5.5" }
    });
    expect(clientIpFromRequest(request)).toBe("5.5.5.5");
  });

  it("returns unknown when neither header is present", () => {
    expect(clientIpFromRequest(new Request("http://localhost"))).toBe("unknown");
  });

  it("returns empty string for a malformed empty x-forwarded-for (documents behavior)", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": ",,," }
    });
    expect(clientIpFromRequest(request)).toBe("");
  });
});

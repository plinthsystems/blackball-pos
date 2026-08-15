import { describe, expect, it, vi } from "vitest";
import {
  getBookingPageUrl,
  getBookingQrPngUrl,
  getPublicBaseUrl,
  getRequestBaseUrl
} from "@/server/integrations/base-url";

describe("base-url", () => {
  describe("getPublicBaseUrl", () => {
    it("uses APP_BASE_URL when set", () => {
      vi.stubEnv("APP_BASE_URL", "https://blackball.example");
      expect(getPublicBaseUrl()).toBe("https://blackball.example");
      vi.unstubAllEnvs();
    });

    it("falls back to localhost in development", () => {
      vi.stubEnv("APP_BASE_URL", "");
      expect(getPublicBaseUrl()).toBe("http://localhost:3000");
      vi.unstubAllEnvs();
    });

    it("prefers request host over fallback", () => {
      vi.stubEnv("APP_BASE_URL", "");
      expect(getPublicBaseUrl({ requestHost: "192.168.1.3:3000" })).toBe("http://192.168.1.3:3000");
      vi.unstubAllEnvs();
    });

    it("uses provided protocol with request host", () => {
      vi.stubEnv("APP_BASE_URL", "");
      expect(getPublicBaseUrl({ requestHost: "blackball.example", protocol: "https" })).toBe("https://blackball.example");
      vi.unstubAllEnvs();
    });
  });

  describe("getRequestBaseUrl", () => {
    it("uses x-forwarded-host and x-forwarded-proto when present", () => {
      const headers = new Headers();
      headers.set("x-forwarded-host", "blackball.example");
      headers.set("x-forwarded-proto", "https");
      expect(getRequestBaseUrl(headers)).toBe("https://blackball.example");
    });

    it("falls back to host header", () => {
      const headers = new Headers();
      headers.set("host", "192.168.1.3:3000");
      expect(getRequestBaseUrl(headers)).toBe("http://192.168.1.3:3000");
    });

    it("falls back to localhost when no host headers are present", () => {
      expect(getRequestBaseUrl(new Headers())).toBe("http://localhost:3000");
    });
  });

  describe("getBookingPageUrl", () => {
    it("builds booking page url with custom base", () => {
      expect(getBookingPageUrl("seed-business", "http://192.168.1.3:3000")).toBe(
        "http://192.168.1.3:3000/book/seed-business"
      );
    });

    it("uses public base url when no custom base is provided", () => {
      vi.stubEnv("APP_BASE_URL", "");
      expect(getBookingPageUrl("seed-business")).toBe("http://localhost:3000/book/seed-business");
      vi.unstubAllEnvs();
    });
  });

  describe("getBookingQrPngUrl", () => {
    it("builds qr png url with custom base", () => {
      expect(getBookingQrPngUrl("seed-business", "http://192.168.1.3:3000")).toBe(
        "http://192.168.1.3:3000/qr/book/seed-business"
      );
    });
  });
});

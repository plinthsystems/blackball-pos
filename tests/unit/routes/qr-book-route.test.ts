import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/qr/book/[slug]/route";
import { makeRequest } from "../support/request-helpers";

/**
 * GET /qr/book/[slug] — locks existing behavior: 404 on unknown slug,
 * image/png + cache headers on success, base-url resolution from the request
 * host. Prisma + QR generation mocked — no DB / no real PNG work.
 */

const prismaMock = vi.hoisted(() => ({
  business: { findUnique: vi.fn() }
}));

const qrMock = vi.hoisted(() => ({
  generateBookingQrPng: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/integrations/qr", () => ({
  generateBookingQrPng: qrMock.generateBookingQrPng
}));

const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);

function qrRequest(headers: Record<string, string> = {}): Request {
  return makeRequest("http://localhost:3000/qr/book/my-store", { headers });
}

const params = Promise.resolve({ slug: "my-store" });

describe("GET /qr/book/[slug]", () => {
  beforeEach(() => {
    prismaMock.business.findUnique.mockReset();
    qrMock.generateBookingQrPng.mockReset();
  });

  it("returns 404 with a plain-text error for an unknown slug", async () => {
    prismaMock.business.findUnique.mockResolvedValue(null);

    const response = await GET(qrRequest(), { params });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Store not found");
    expect(qrMock.generateBookingQrPng).not.toHaveBeenCalled();
  });

  it("resolves the slug before generating the QR (findUnique select id)", async () => {
    prismaMock.business.findUnique.mockResolvedValue({ id: "biz_1" });
    qrMock.generateBookingQrPng.mockResolvedValue(PNG_BUFFER);

    await GET(qrRequest(), { params });

    expect(prismaMock.business.findUnique).toHaveBeenCalledWith({
      where: { slug: "my-store" },
      select: { id: true }
    });
    expect(qrMock.generateBookingQrPng).toHaveBeenCalledWith("my-store", "http://localhost:3000");
  });

  it("returns the PNG with image/png and public cache headers", async () => {
    prismaMock.business.findUnique.mockResolvedValue({ id: "biz_1" });
    qrMock.generateBookingQrPng.mockResolvedValue(PNG_BUFFER);

    const response = await GET(qrRequest(), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(PNG_BUFFER));
  });

  it("uses x-forwarded-host/x-forwarded-proto when present", async () => {
    prismaMock.business.findUnique.mockResolvedValue({ id: "biz_1" });
    qrMock.generateBookingQrPng.mockResolvedValue(PNG_BUFFER);

    await GET(
      qrRequest({ "x-forwarded-host": "store.example.com", "x-forwarded-proto": "https" }),
      { params }
    );

    expect(qrMock.generateBookingQrPng).toHaveBeenCalledWith(
      "my-store",
      "https://store.example.com"
    );
  });

  it("falls back to the host header when x-forwarded-host is absent", async () => {
    prismaMock.business.findUnique.mockResolvedValue({ id: "biz_1" });
    qrMock.generateBookingQrPng.mockResolvedValue(PNG_BUFFER);

    await GET(qrRequest({ host: "qr.example.com" }), { params });

    expect(qrMock.generateBookingQrPng).toHaveBeenCalledWith("my-store", "http://qr.example.com");
  });
});

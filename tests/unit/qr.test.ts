import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", async () => {
  const actual = await vi.importActual<typeof import("qrcode")>("qrcode");
  // pick the string+options overload; qrcode ships a (string) and a (canvas, ...) overload
  const toDataURL = vi.fn(
    actual.toDataURL as (text: string, options?: unknown) => Promise<string>
  );
  return { default: { ...actual, toDataURL } };
});

import QRCode from "qrcode";
import { generateBookingQrPng } from "@/server/integrations/qr";
import { getBookingPageUrl } from "@/server/integrations/base-url";

// the mock factory's vi.fn is not visible through qrcode's public overloaded types
const mockedToDataURL = QRCode.toDataURL as unknown as ReturnType<typeof vi.fn>;

describe("generateBookingQrPng", () => {
  beforeEach(() => {
    mockedToDataURL.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("generates a real PNG buffer for the booking page url", async () => {
    const buffer = await generateBookingQrPng("seed-business", "http://192.168.1.3:3000");
    expect(buffer).toBeInstanceOf(Buffer);
    // PNG magic bytes: \x89PNG
    expect([...buffer.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("encodes the booking page url built from the provided base", async () => {
    mockedToDataURL.mockResolvedValue("data:image/png;base64,AAAA");
    await generateBookingQrPng("seed-business", "http://192.168.1.3:3000");
    expect(mockedToDataURL).toHaveBeenCalledWith(
      getBookingPageUrl("seed-business", "http://192.168.1.3:3000"),
      expect.objectContaining({ errorCorrectionLevel: "M", width: 512, margin: 2 })
    );
    const options = mockedToDataURL.mock.calls[0][1] as { color: { dark: string; light: string } };
    expect(options.color).toEqual({ dark: "#0f172a", light: "#ffffff" });
  });

  it("falls back to the public base url when none is provided", async () => {
    vi.stubEnv("APP_BASE_URL", "https://blackball.example");
    mockedToDataURL.mockResolvedValue("data:image/png;base64,AAAA");
    await generateBookingQrPng("seed-business");
    expect(mockedToDataURL).toHaveBeenCalledWith(
      "https://blackball.example/book/seed-business",
      expect.anything()
    );
  });

  it("rejects when the underlying codec fails (bad slug)", async () => {
    mockedToDataURL.mockRejectedValueOnce(new Error("codec boom"));
    await expect(
      generateBookingQrPng("bad slug with spaces / chars", "http://localhost:3000")
    ).rejects.toThrow("codec boom");
  });
});

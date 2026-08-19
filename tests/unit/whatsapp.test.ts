import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isWhatsAppConfigured,
  sendBookingCancelledMessage,
  sendBookingCreatedMessage,
  sendManualBookingShareMessage,
  sendWhatsAppMessage
} from "@/server/integrations/whatsapp";

const fetchSpy = vi.spyOn(globalThis, "fetch");

function postCalls() {
  return fetchSpy.mock.calls.filter(
    (call): call is [RequestInfo | URL, RequestInit] => Boolean(call[1] && call[1].method === "POST")
  );
}

function lastBody(): Record<string, unknown> {
  const [, init] = postCalls()[postCalls().length - 1];
  return JSON.parse(String(init.body));
}

const CREATED_INPUT = {
  type: "created" as const,
  reference: "BB-1234",
  tableNumber: "5",
  startsAt: "2026-08-17T17:30:00+05:30",
  endsAt: "2026-08-17T19:30:00+05:30",
  advanceAmount: 100
};

describe("isWhatsAppConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when both url and token are set", () => {
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    expect(isWhatsAppConfigured()).toBe(true);
  });

  it("returns false when url is missing", () => {
    vi.stubEnv("WHATSAPP_API_URL", "");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    expect(isWhatsAppConfigured()).toBe(false);
  });

  it("returns false when token is missing", () => {
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "");
    expect(isWhatsAppConfigured()).toBe(false);
  });

  it("returns false when neither is set", () => {
    vi.stubEnv("WHATSAPP_API_URL", "");
    vi.stubEnv("WHATSAPP_API_TOKEN", "");
    expect(isWhatsAppConfigured()).toBe(false);
  });
});

describe("sendWhatsAppMessage", () => {
  beforeEach(() => {
    fetchSpy.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false without fetching when unconfigured", async () => {
    vi.stubEnv("WHATSAPP_API_URL", "");
    vi.stubEnv("WHATSAPP_API_TOKEN", "");
    const result = await sendWhatsAppMessage("+919876543210", "hello");
    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends a text message with bearer auth and returns true on ok", async () => {
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    fetchSpy.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const result = await sendWhatsAppMessage("+919876543210", "hello there");

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://wa.example.com/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-123"
        }
      })
    );
    expect(lastBody()).toEqual({
      messaging_product: "whatsapp",
      to: "+919876543210",
      type: "text",
      text: { body: "hello there" }
    });
  });

  it("includes from when WHATSAPP_FROM is set", async () => {
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    vi.stubEnv("WHATSAPP_FROM", "919999999999");
    fetchSpy.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendWhatsAppMessage("+919876543210", "hi");
    expect(lastBody()).toMatchObject({ from: "919999999999" });
  });

  it("sends an image payload when imageUrl is provided", async () => {
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    fetchSpy.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendWhatsAppMessage("+919876543210", "scan this", "https://cdn.example.com/qr.png");

    const body = lastBody();
    expect(body.type).toBe("image");
    expect(body.image).toEqual({ link: "https://cdn.example.com/qr.png", caption: "scan this" });
    expect(body).not.toHaveProperty("text");
  });

  it("returns false on a non-ok response", async () => {
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    expect(await sendWhatsAppMessage("+919876543210", "hi")).toBe(false);
  });

  it("returns false when the network request throws", async () => {
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    fetchSpy.mockRejectedValueOnce(new TypeError("network down"));
    expect(await sendWhatsAppMessage("+919876543210", "hi")).toBe(false);
  });
});

describe("sendBookingCreatedMessage", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Asia/Kolkata");
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    fetchSpy.mockReset();
    fetchSpy.mockResolvedValue(new Response("ok", { status: 200 }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false without fetching when phone is empty", async () => {
    expect(await sendBookingCreatedMessage("", "Blackball", CREATED_INPUT)).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends a confirmed message with advance line when advance > 0", async () => {
    const result = await sendBookingCreatedMessage("+919876543210", "Blackball", CREATED_INPUT);
    expect(result).toBe(true);

    const body = lastBody();
    const text = (body.text as { body: string }).body;
    expect(text).toContain("Booking Confirmed - Blackball");
    expect(text).toContain("Booking Ref: #BB-1234");
    expect(text).toContain("Table: 5");
    expect(text).toContain("5:30 pm - 7:30 pm (17 Aug)");
    expect(text).toContain("₹100.00 advance payment status: pending.");
  });

  it("omits the advance line when advance is zero", async () => {
    await sendBookingCreatedMessage("+919876543210", "Blackball", { ...CREATED_INPUT, advanceAmount: 0 });
    const text = (lastBody().text as { body: string }).body;
    expect(text).not.toContain("advance payment");
  });

  it("omits the advance line for negative advance amounts", async () => {
    await sendBookingCreatedMessage("+919876543210", "Blackball", { ...CREATED_INPUT, advanceAmount: -50 });
    const text = (lastBody().text as { body: string }).body;
    expect(text).not.toContain("advance payment");
  });
});

describe("sendBookingCancelledMessage", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Asia/Kolkata");
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    fetchSpy.mockReset();
    fetchSpy.mockResolvedValue(new Response("ok", { status: 200 }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false without fetching when phone is empty", async () => {
    const result = await sendBookingCancelledMessage("", "Blackball", {
      type: "cancelled",
      reference: "BB-1234",
      tableNumber: "5",
      startsAt: "2026-08-17T17:30:00+05:30",
      endsAt: "2026-08-17T19:30:00+05:30"
    });
    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends a cancellation message with slot-release note", async () => {
    const result = await sendBookingCancelledMessage("+919876543210", "Blackball", {
      type: "cancelled",
      reference: "BB-1234",
      tableNumber: "5",
      startsAt: "2026-08-17T17:30:00+05:30",
      endsAt: "2026-08-17T19:30:00+05:30"
    });
    expect(result).toBe(true);
    const text = (lastBody().text as { body: string }).body;
    expect(text).toContain("Booking Cancelled - Blackball");
    expect(text).toContain("Booking Ref: #BB-1234");
    expect(text).toContain("Table: 5");
    expect(text).toContain("Your slot has been released.");
  });
});

describe("sendManualBookingShareMessage", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_API_URL", "https://wa.example.com/messages");
    vi.stubEnv("WHATSAPP_API_TOKEN", "token-123");
    fetchSpy.mockReset();
    fetchSpy.mockResolvedValue(new Response("ok", { status: 200 }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false without fetching when phone is empty", async () => {
    const result = await sendManualBookingShareMessage("", "Blackball", {
      bookingLink: "https://app.example.com/book/seed-business",
      qrImageUrl: "https://cdn.example.com/qr.png"
    });
    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends an image message with the booking link and qr image", async () => {
    const result = await sendManualBookingShareMessage("+919876543210", "Blackball", {
      bookingLink: "https://app.example.com/book/seed-business",
      qrImageUrl: "https://cdn.example.com/qr.png"
    });
    expect(result).toBe(true);

    const body = lastBody();
    expect(body.type).toBe("image");
    expect(body.image).toEqual({
      link: "https://cdn.example.com/qr.png",
      caption: expect.stringContaining("https://app.example.com/book/seed-business") as unknown as string
    });
    const caption = (body.image as { caption: string }).caption;
    expect(caption).toContain("Hello from Blackball!");
    expect(caption).toContain("https://app.example.com/book/seed-business");
  });
});

import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/integrations/razorpay/webhook/route";
import { makeNextRequest, withEnv } from "../support/request-helpers";

/**
 * POST /api/integrations/razorpay/webhook — locks existing behavior: signature
 * verification (real HMAC, env secret), payment_link.paid marking PAID, unknown
 * events acked, malformed JSON propagates. Prisma mocked — no DB in gate.
 */

const prismaMock = vi.hoisted(() => ({
  booking: { updateMany: vi.fn() }
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

const SECRET = "razorpay-webhook-test-secret";

function signatureFor(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

function webhookRequest(body: unknown, signature?: string): NextRequest {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  return makeNextRequest("http://localhost:3000/api/integrations/razorpay/webhook", {
    method: "POST",
    headers: signature ? { "x-razorpay-signature": signature } : {},
    body: rawBody
  });
}

describe("POST /api/integrations/razorpay/webhook", () => {
  beforeEach(() => {
    prismaMock.booking.updateMany.mockReset();
  });

  it("returns 503 without touching the DB when the signature header is missing", async () => {
    await withEnv({ RAZORPAY_WEBHOOK_SECRET: SECRET }, async () => {
      const response = await POST(webhookRequest({ event: "payment_link.paid" }));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "Webhook disabled or bad signature." });
      expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  it("returns 503 for a tampered signature", async () => {
    await withEnv({ RAZORPAY_WEBHOOK_SECRET: SECRET }, async () => {
      const body = JSON.stringify({ event: "payment_link.paid" });
      const badSignature = signatureFor(body).replace(/^./, "0");
      const response = await POST(webhookRequest(body, badSignature));
      expect(response.status).toBe(503);
      expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  it("returns 503 when no webhook secret is configured", async () => {
    const body = JSON.stringify({ event: "payment_link.paid" });
    const response = await POST(webhookRequest(body, signatureFor(body)));
    expect(response.status).toBe(503);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it("marks matching bookings PAID on payment_link.paid", async () => {
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    await withEnv({ RAZORPAY_WEBHOOK_SECRET: SECRET }, async () => {
      const body = {
        event: "payment_link.paid",
        payload: { payment_link: { entity: { id: "plink_abc123" } } }
      };
      const response = await POST(webhookRequest(body, signatureFor(JSON.stringify(body))));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
        where: { paymentExternalId: "plink_abc123" },
        data: { paymentStatus: "PAID" }
      });
    });
  });

  it("acks payment_link.paid without an external id and does not write", async () => {
    await withEnv({ RAZORPAY_WEBHOOK_SECRET: SECRET }, async () => {
      const body = {
        event: "payment_link.paid",
        payload: { payment_link: { entity: {} } }
      };
      const response = await POST(webhookRequest(body, signatureFor(JSON.stringify(body))));

      expect(await response.json()).toEqual({ received: true });
      expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  it("acks unknown events without writing to the DB", async () => {
    await withEnv({ RAZORPAY_WEBHOOK_SECRET: SECRET }, async () => {
      const body = { event: "invoice.paid", payload: {} };
      const response = await POST(webhookRequest(body, signatureFor(JSON.stringify(body))));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  it("propagates a JSON parse error on malformed bodies (route has no catch)", async () => {
    await withEnv({ RAZORPAY_WEBHOOK_SECRET: SECRET }, async () => {
      const body = "{not-json";
      await expect(POST(webhookRequest(body, signatureFor(body)))).rejects.toThrow();
    });
  });
});

import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/integrations/stripe/webhook/route";
import { makeNextRequest, withEnv } from "../support/request-helpers";

/**
 * POST /api/integrations/stripe/webhook — locks existing behavior: signature
 * verification (real HMAC over `t.v1` scheme, env secret), reference matching
 * (paymentExternalId / id / id.endsWith), unknown events acked, malformed JSON
 * propagates. Prisma mocked — no DB in gate.
 */

const prismaMock = vi.hoisted(() => ({
  booking: { updateMany: vi.fn() }
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

const SECRET = "stripe-webhook-test-secret";
const TIMESTAMP = "1723900000";

function signatureFor(body: string): string {
  return `t=${TIMESTAMP},v1=${createHmac("sha256", SECRET).update(`${TIMESTAMP}.${body}`).digest("hex")}`;
}

function webhookRequest(body: unknown, signature?: string): NextRequest {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  return makeNextRequest("http://localhost:3000/api/integrations/stripe/webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body: rawBody
  });
}

describe("POST /api/integrations/stripe/webhook", () => {
  beforeEach(() => {
    prismaMock.booking.updateMany.mockReset();
  });

  it("returns 503 without touching the DB when the signature header is missing", async () => {
    await withEnv({ STRIPE_WEBHOOK_SECRET: SECRET }, async () => {
      const response = await POST(webhookRequest({ type: "checkout.session.completed" }));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "Webhook disabled or bad signature." });
      expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  it("returns 503 for a tampered signature", async () => {
    await withEnv({ STRIPE_WEBHOOK_SECRET: SECRET }, async () => {
      const body = JSON.stringify({ type: "checkout.session.completed" });
      const badSignature = signatureFor(body).replace(/v1=\w/, "v1=0");
      const response = await POST(webhookRequest(body, badSignature));
      expect(response.status).toBe(503);
      expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  it("returns 503 when no webhook secret is configured", async () => {
    const body = JSON.stringify({ type: "checkout.session.completed" });
    const response = await POST(webhookRequest(body, signatureFor(body)));
    expect(response.status).toBe(503);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it("marks bookings PAID on checkout.session.completed, matching any reference form", async () => {
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    await withEnv({ STRIPE_WEBHOOK_SECRET: SECRET }, async () => {
      const body = {
        type: "checkout.session.completed",
        data: { object: { client_reference_id: "ref-abc123" } }
      };
      const response = await POST(webhookRequest(body, signatureFor(JSON.stringify(body))));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { paymentExternalId: "ref-abc123" },
            { id: "ref-abc123" },
            { id: { endsWith: "ref-abc123" } }
          ]
        },
        data: { paymentStatus: "PAID" }
      });
    });
  });

  it("acks checkout.session.completed without a reference and does not write", async () => {
    await withEnv({ STRIPE_WEBHOOK_SECRET: SECRET }, async () => {
      const body = { type: "checkout.session.completed", data: { object: {} } };
      const response = await POST(webhookRequest(body, signatureFor(JSON.stringify(body))));

      expect(await response.json()).toEqual({ received: true });
      expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  it("acks unknown event types without writing to the DB", async () => {
    await withEnv({ STRIPE_WEBHOOK_SECRET: SECRET }, async () => {
      const body = { type: "invoice.payment_failed", data: {} };
      const response = await POST(webhookRequest(body, signatureFor(JSON.stringify(body))));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  it("propagates a JSON parse error on malformed bodies (route has no catch)", async () => {
    await withEnv({ STRIPE_WEBHOOK_SECRET: SECRET }, async () => {
      const body = "{not-json";
      await expect(POST(webhookRequest(body, signatureFor(body)))).rejects.toThrow();
    });
  });
});

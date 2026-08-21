import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { PaymentProvider } from "@prisma/client";

// We use dynamic imports to allow environment variable changes to take effect
async function loadPayments() {
  return await import("@/server/integrations/payments");
}

function cleanEnv() {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.APP_BASE_URL;
}

describe("isPaymentProviderConfigured", () => {
  beforeEach(cleanEnv);
  afterEach(cleanEnv);

  it("returns true for RAZORPAY when both key_id and key_secret are set", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123";
    process.env.RAZORPAY_KEY_SECRET = "secret_123";
    const { isPaymentProviderConfigured } = await loadPayments();
    expect(isPaymentProviderConfigured("RAZORPAY")).toBe(true);
  });

  it("returns false for RAZORPAY when key_id is missing", async () => {
    process.env.RAZORPAY_KEY_SECRET = "secret_123";
    const { isPaymentProviderConfigured } = await loadPayments();
    expect(isPaymentProviderConfigured("RAZORPAY")).toBe(false);
  });

  it("returns false for RAZORPAY when key_secret is missing", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123";
    const { isPaymentProviderConfigured } = await loadPayments();
    expect(isPaymentProviderConfigured("RAZORPAY")).toBe(false);
  });

  it("returns true for STRIPE when secret key is set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    const { isPaymentProviderConfigured } = await loadPayments();
    expect(isPaymentProviderConfigured("STRIPE")).toBe(true);
  });

  it("returns false for STRIPE when secret key is missing", async () => {
    const { isPaymentProviderConfigured } = await loadPayments();
    expect(isPaymentProviderConfigured("STRIPE")).toBe(false);
  });

  it("returns false for unknown provider", async () => {
    const { isPaymentProviderConfigured } = await loadPayments();
    expect(isPaymentProviderConfigured("UNKNOWN" as PaymentProvider)).toBe(false);
  });
});

describe("getActivePaymentProvider", () => {
  beforeEach(cleanEnv);
  afterEach(cleanEnv);

  it("returns 'razorpay' when RAZORPAY is configured", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123";
    process.env.RAZORPAY_KEY_SECRET = "secret_123";
    const { getActivePaymentProvider } = await loadPayments();
    expect(getActivePaymentProvider("RAZORPAY")).toBe("razorpay");
  });

  it("returns 'stripe' when STRIPE is configured", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    const { getActivePaymentProvider } = await loadPayments();
    expect(getActivePaymentProvider("STRIPE")).toBe("stripe");
  });

  it("returns null when RAZORPAY is not configured", async () => {
    const { getActivePaymentProvider } = await loadPayments();
    expect(getActivePaymentProvider("RAZORPAY")).toBe(null);
  });

  it("returns null when STRIPE is not configured", async () => {
    const { getActivePaymentProvider } = await loadPayments();
    expect(getActivePaymentProvider("STRIPE")).toBe(null);
  });

  it("returns null for unknown provider", async () => {
    const { getActivePaymentProvider } = await loadPayments();
    expect(getActivePaymentProvider("UNKNOWN" as PaymentProvider)).toBe(null);
  });
});

describe("paymentEnabledForBooking", () => {
  beforeEach(cleanEnv);
  afterEach(cleanEnv);

  it("returns true when advance amount > 0 and provider is configured", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123";
    process.env.RAZORPAY_KEY_SECRET = "secret_123";
    const { paymentEnabledForBooking } = await loadPayments();
    expect(paymentEnabledForBooking("RAZORPAY", 100)).toBe(true);
  });

  it("returns false when advance amount is 0", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123";
    process.env.RAZORPAY_KEY_SECRET = "secret_123";
    const { paymentEnabledForBooking } = await loadPayments();
    expect(paymentEnabledForBooking("RAZORPAY", 0)).toBe(false);
  });

  it("returns false when advance amount is negative", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123";
    process.env.RAZORPAY_KEY_SECRET = "secret_123";
    const { paymentEnabledForBooking } = await loadPayments();
    expect(paymentEnabledForBooking("RAZORPAY", -50)).toBe(false);
  });

  it("returns false when provider is not configured", async () => {
    const { paymentEnabledForBooking } = await loadPayments();
    expect(paymentEnabledForBooking("RAZORPAY", 100)).toBe(false);
  });
});

describe("createBookingPaymentLink", () => {
  beforeEach(() => {
    cleanEnv();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.RAZORPAY_KEY_ID = "rzp_test_123";
    process.env.RAZORPAY_KEY_SECRET = "secret_123";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.APP_BASE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    cleanEnv();
    vi.unstubAllGlobals();
  });

  it("creates a Razorpay payment link successfully", async () => {
    const mockResponse = {
      id: "pl_test_123",
      short_url: "https://pay.example.com/pl_test_123"
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createBookingPaymentLink } = await loadPayments();
    const result = await createBookingPaymentLink({
      provider: "razorpay",
      reference: "REF001",
      amount: 180,
      customerName: "John Doe",
      customerPhone: "+919876543210",
      description: "Pool table booking"
    });

    expect(result.provider).toBe("razorpay");
    expect(result.paymentExternalId).toBe("pl_test_123");
    expect(result.paymentUrl).toBe("https://pay.example.com/pl_test_123");

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe("https://api.razorpay.com/v1/payment_links");
    expect(callArgs[1]?.method).toBe("POST");

    const body = JSON.parse(callArgs[1]?.body as string);
    expect(body.amount).toBe(18000);
    expect(body.currency).toBe("INR");
    expect(body.accept_partial).toBe(false);
    expect(body.description).toBe("Pool table booking (Ref #REF001)");
    expect(body.customer.name).toBe("John Doe");
    expect(body.customer.contact).toBe("919876543210");
  });

  it("creates a Stripe checkout session successfully", async () => {
    const mockResponse = {
      id: "cs_test_123",
      url: "https://checkout.stripe.com/cs_test_123"
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createBookingPaymentLink } = await loadPayments();
    const result = await createBookingPaymentLink({
      provider: "stripe",
      reference: "REF002",
      amount: 350,
      customerName: "Jane Doe",
      customerPhone: "+919876543210",
      description: "Snooker royal table"
    });

    expect(result.provider).toBe("stripe");
    expect(result.paymentExternalId).toBe("cs_test_123");
    expect(result.paymentUrl).toBe("https://checkout.stripe.com/cs_test_123");

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(callArgs[1]?.method).toBe("POST");

    const body = String(fetchMock.mock.calls[0][1]?.body);
    expect(body).toContain("mode=payment");
    expect(body).toContain("client_reference_id=REF002");
    expect(body).toContain("unit_amount");
    expect(body).toContain("35000");
    expect(body).toContain("currency");
    expect(body).toContain("inr");
  });

  it("throws when Razorpay is not configured", async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    vi.unstubAllGlobals();
    const { createBookingPaymentLink } = await loadPayments();
    await expect(
      createBookingPaymentLink({
        provider: "razorpay",
        reference: "REF001",
        amount: 180,
        customerName: "John",
        customerPhone: "9876543210",
        description: "Test"
      })
    ).rejects.toThrow("Razorpay is not configured.");
  });

  it("throws when Stripe is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    vi.unstubAllGlobals();
    const { createBookingPaymentLink } = await loadPayments();
    await expect(
      createBookingPaymentLink({
        provider: "stripe",
        reference: "REF001",
        amount: 180,
        customerName: "John",
        customerPhone: "9876543210",
        description: "Test"
      })
    ).rejects.toThrow("Stripe is not configured.");
  });

  it("throws when Razorpay API returns error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Bad request" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createBookingPaymentLink } = await loadPayments();
    await expect(
      createBookingPaymentLink({
        provider: "razorpay",
        reference: "REF001",
        amount: 180,
        customerName: "John",
        customerPhone: "9876543210",
        description: "Test"
      })
    ).rejects.toThrow("Razorpay payment link failed: 400");
  });

  it("throws when Stripe API returns error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "Internal error" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createBookingPaymentLink } = await loadPayments();
    await expect(
      createBookingPaymentLink({
        provider: "stripe",
        reference: "REF001",
        amount: 180,
        customerName: "John",
        customerPhone: "9876543210",
        description: "Test"
      })
    ).rejects.toThrow("Stripe checkout session failed: 500");
  });

  it("converts amount to paise correctly for Razorpay", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "pl_1", short_url: "http://x" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createBookingPaymentLink } = await loadPayments();
    await createBookingPaymentLink({
      provider: "razorpay",
      reference: "REF001",
      amount: 180.5,
      customerName: "John",
      customerPhone: "9876543210",
      description: "Test"
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1]?.body as string));
    expect(body.amount).toBe(18050);
  });

  it("strips non-numeric characters from phone for Razorpay", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "pl_1", short_url: "http://x" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createBookingPaymentLink } = await loadPayments();
    await createBookingPaymentLink({
      provider: "razorpay",
      reference: "REF001",
      amount: 180,
      customerName: "John",
      customerPhone: "+91 (98765) 43-210",
      description: "Test"
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1]?.body as string));
    expect(body.customer.contact).toBe("919876543210");
  });
});

describe("verifyRazorpayWebhookSignature", () => {
  beforeEach(() => {
    cleanEnv();
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test_123";
  });

  afterEach(cleanEnv);

  it("returns true when signature matches", async () => {
    const { verifyRazorpayWebhookSignature } = await loadPayments();
    const crypto = await import("node:crypto");
    const body = '{"event":"payment.captured"}';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyRazorpayWebhookSignature(body, signature)).toBe(true);
  });

  it("returns false when signature does not match", async () => {
    const { verifyRazorpayWebhookSignature } = await loadPayments();
    const body = '{"event":"payment.captured"}';
    expect(verifyRazorpayWebhookSignature(body, "wrong_signature")).toBe(false);
  });

  it("returns false when signature is null", async () => {
    const { verifyRazorpayWebhookSignature } = await loadPayments();
    const body = '{"event":"payment.captured"}';
    expect(verifyRazorpayWebhookSignature(body, null)).toBe(false);
  });

  it("returns false when signature is empty string", async () => {
    const { verifyRazorpayWebhookSignature } = await loadPayments();
    const body = '{"event":"payment.captured"}';
    expect(verifyRazorpayWebhookSignature(body, "")).toBe(false);
  });

  it("returns false when webhook secret is not set", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const { verifyRazorpayWebhookSignature } = await loadPayments();
    const body = '{"event":"payment.captured"}';
    expect(verifyRazorpayWebhookSignature(body, "some_sig")).toBe(false);
  });
});

describe("verifyStripeWebhookSignature", () => {
  beforeEach(() => {
    cleanEnv();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
  });

  afterEach(cleanEnv);

  it("returns true when signature matches", async () => {
    const { verifyStripeWebhookSignature } = await loadPayments();
    const crypto = await import("node:crypto");
    const body = '{"event":"payment_intent.succeeded"}';
    const timestamp = "1234567890";
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    const expectedSig = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    const signature = `t=${timestamp},v1=${expectedSig}`;
    expect(verifyStripeWebhookSignature(body, signature)).toBe(true);
  });

  it("returns false when signature does not match", async () => {
    const { verifyStripeWebhookSignature } = await loadPayments();
    const body = '{"event":"payment_intent.succeeded"}';
    expect(verifyStripeWebhookSignature(body, "t=1234567890,v1=wrong_signature")).toBe(false);
  });

  it("returns false when signature is null", async () => {
    const { verifyStripeWebhookSignature } = await loadPayments();
    const body = '{"event":"payment_intent.succeeded"}';
    expect(verifyStripeWebhookSignature(body, null)).toBe(false);
  });

  it("returns false when timestamp is missing from signature", async () => {
    const { verifyStripeWebhookSignature } = await loadPayments();
    const body = '{"event":"payment_intent.succeeded"}';
    expect(verifyStripeWebhookSignature(body, "v1=abc123")).toBe(false);
  });

  it("returns false when v1 is missing from signature", async () => {
    const { verifyStripeWebhookSignature } = await loadPayments();
    const body = '{"event":"payment_intent.succeeded"}';
    expect(verifyStripeWebhookSignature(body, "t=1234567890")).toBe(false);
  });

  it("returns false when webhook secret is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { verifyStripeWebhookSignature } = await loadPayments();
    const body = '{"event":"payment_intent.succeeded"}';
    expect(verifyStripeWebhookSignature(body, "t=123,v1=abc")).toBe(false);
  });

  it("constructs expected signature from timestamp and body", async () => {
    const { verifyStripeWebhookSignature } = await loadPayments();
    const crypto = await import("node:crypto");
    const body = '{"id":"pi_123"}';
    const timestamp = "1700000000";
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    const expectedSig = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    const signature = `t=${timestamp},v1=${expectedSig}`;
    expect(verifyStripeWebhookSignature(body, signature)).toBe(true);
  });
});

describe("isWebhookEnabled", () => {
  beforeEach(cleanEnv);
  afterEach(cleanEnv);

  it("returns true for Razorpay when webhook secret is set", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_123";
    const { isWebhookEnabled } = await loadPayments();
    expect(isWebhookEnabled("razorpay")).toBe(true);
  });

  it("returns false for Razorpay when webhook secret is not set", async () => {
    const { isWebhookEnabled } = await loadPayments();
    expect(isWebhookEnabled("razorpay")).toBe(false);
  });

  it("returns true for Stripe when webhook secret is set", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    const { isWebhookEnabled } = await loadPayments();
    expect(isWebhookEnabled("stripe")).toBe(true);
  });

  it("returns false for Stripe when webhook secret is not set", async () => {
    const { isWebhookEnabled } = await loadPayments();
    expect(isWebhookEnabled("stripe")).toBe(false);
  });
});
import { createHmac } from "node:crypto";
import type { PaymentProvider } from "@prisma/client";

export type ActivePaymentProvider = "razorpay" | "stripe";

export type PaymentLinkResult = {
  provider: ActivePaymentProvider;
  paymentExternalId: string;
  paymentUrl: string;
};

const AMOUNT_CURRENCY = "INR";

export function isPaymentProviderConfigured(provider: PaymentProvider): boolean {
  if (provider === "RAZORPAY") {
    return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }
  if (provider === "STRIPE") {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }
  return false;
}

export function getActivePaymentProvider(configured: PaymentProvider): ActivePaymentProvider | null {
  if (!isPaymentProviderConfigured(configured)) {
    return null;
  }
  return configured === "RAZORPAY" ? "razorpay" : configured === "STRIPE" ? "stripe" : null;
}

export function paymentEnabledForBooking(
  providerSetting: PaymentProvider,
  advanceAmount: number
): boolean {
  return advanceAmount > 0 && getActivePaymentProvider(providerSetting) !== null;
}

export async function createBookingPaymentLink(input: {
  provider: ActivePaymentProvider;
  reference: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  description: string;
}): Promise<PaymentLinkResult> {
  if (input.provider === "razorpay") {
    return createRazorpayPaymentLink(input);
  }
  return createStripeCheckoutSession(input);
}

async function createRazorpayPaymentLink(input: {
  reference: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  description: string;
}): Promise<PaymentLinkResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured.");
  }

  const amountPaise = Math.round(input.amount * 100);
  const body = {
    amount: amountPaise,
    currency: AMOUNT_CURRENCY,
    accept_partial: false,
    description: `${input.description} (Ref #${input.reference})`,
    customer: {
      name: input.customerName,
      contact: input.customerPhone.replace(/\D/g, "")
    },
    notify: { sms: false, email: false },
    remind_by: { status: false }
  };

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Razorpay payment link failed: ${response.status}`);
  }

  const data = (await response.json()) as { id: string; short_url: string };
  return { provider: "razorpay", paymentExternalId: data.id, paymentUrl: data.short_url };
}

async function createStripeCheckoutSession(input: {
  reference: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  description: string;
}): Promise<PaymentLinkResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured.");
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${getAppBaseUrl()}/book/success?ref=${input.reference}`);
  params.set("cancel_url", `${getAppBaseUrl()}/book/cancel?ref=${input.reference}`);
  params.set("client_reference_id", input.reference);
  params.set("customer_email", "");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "inr");
  params.set("line_items[0][price_data][unit_amount]", String(Math.round(input.amount * 100)));
  params.set("line_items[0][price_data][product_data][name]", input.description);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${secretKey}`
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Stripe checkout session failed: ${response.status}`);
  }

  const data = (await response.json()) as { id: string; url: string };
  return { provider: "stripe", paymentExternalId: data.id, paymentUrl: data.url };
}

export function verifyRazorpayWebhookSignature(body: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export function verifyStripeWebhookSignature(body: string, signature: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }
  const entries = new Map(
    signature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value ?? ""];
    })
  );
  const timestamp = entries.get("t");
  const provided = entries.get("v1");
  if (!timestamp || !provided) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return provided === expected;
}

export function isWebhookEnabled(provider: ActivePaymentProvider): boolean {
  if (provider === "razorpay") {
    return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
  }
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

function getAppBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) {
    return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  }
  return process.env.NODE_ENV === "production" ? "https://app.blackball.example" : "http://localhost:3000";
}

export type BookingMessage =
  | { type: "created"; reference: string; tableNumber: string; startsAt: string; endsAt: string; advanceAmount: number }
  | { type: "cancelled"; reference: string; tableNumber: string; startsAt: string; endsAt: string };

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN
  );
}

export async function sendWhatsAppMessage(to: string, text: string, imageUrl?: string): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const from = process.env.WHATSAPP_FROM;

  if (!apiUrl || !apiToken) {
    return false;
  }

  try {
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: imageUrl ? "image" : "text",
      text: { body: text }
    };
    if (imageUrl) {
      payload.image = { link: imageUrl, caption: text };
      delete payload.text;
    }
    if (from) {
      payload.from = from;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`
      },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendBookingCreatedMessage(
  phone: string,
  businessName: string,
  input: Extract<BookingMessage, { type: "created" }>
): Promise<boolean> {
  if (!phone) {
    return false;
  }
  const time = formatRange(input.startsAt, input.endsAt);
  const amountLine =
    input.advanceAmount > 0
      ? `₹${input.advanceAmount.toFixed(2)} advance payment status: pending.\n`
      : "";
  return sendWhatsAppMessage(
    phone,
    [
      `🎱 Booking ${input.type === "created" ? "Confirmed" : "Received"} - ${businessName}`,
      `Booking Ref: #${input.reference}`,
      `Table: ${input.tableNumber}`,
      `Time: ${time}`,
      amountLine.trimEnd(),
      "Please arrive on time. — Team Blackball"
    ]
      .filter(Boolean)
      .join("\n")
  );
}

export async function sendBookingCancelledMessage(
  phone: string,
  businessName: string,
  input: Extract<BookingMessage, { type: "cancelled" }>
): Promise<boolean> {
  if (!phone) {
    return false;
  }
  return sendWhatsAppMessage(
    phone,
    [
      `❌ Booking Cancelled - ${businessName}`,
      `Booking Ref: #${input.reference}`,
      `Table: ${input.tableNumber}`,
      `Time: ${formatRange(input.startsAt, input.endsAt)}`,
      "Your slot has been released. You can book again anytime. — Team Blackball"
    ].join("\n")
  );
}

export async function sendManualBookingShareMessage(
  phone: string,
  businessName: string,
  input: { bookingLink: string; qrImageUrl: string }
): Promise<boolean> {
  if (!phone) {
    return false;
  }
  const message = [
    `🎱 Hello from ${businessName}!`,
    `Book your table online anytime — no phone call needed:`,
    input.bookingLink,
    "Scan the QR below to open the same page.",
    "See you soon!"
  ].join("\n");
  return sendWhatsAppMessage(phone, message, input.qrImageUrl);
}

function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
  return `${time.format(start)} - ${time.format(end)} (${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyRazorpayWebhookSignature } from "@/server/integrations/payments";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyRazorpayWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Webhook disabled or bad signature." }, { status: 503 });
  }

  const payload = JSON.parse(body) as {
    event?: string;
    payload?: { payment_link?: { entity?: { id?: string } } };
  };

  if (payload.event === "payment_link.paid") {
    const externalId = payload.payload?.payment_link?.entity?.id;
    if (externalId) {
      await prisma.booking.updateMany({
        where: { paymentExternalId: externalId },
        data: { paymentStatus: "PAID" }
      });
    }
  }

  return NextResponse.json({ received: true });
}

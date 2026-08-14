import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyStripeWebhookSignature } from "@/server/integrations/payments";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !verifyStripeWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Webhook disabled or bad signature." }, { status: 503 });
  }

  const payload = JSON.parse(body) as {
    type?: string;
    data?: { object?: { client_reference_id?: string } };
  };

  if (payload.type === "checkout.session.completed") {
    const reference = payload.data?.object?.client_reference_id;
    if (reference) {
      await prisma.booking.updateMany({
        where: {
          OR: [
            { paymentExternalId: reference },
            { id: reference },
            { id: { endsWith: reference } }
          ]
        },
        data: { paymentStatus: "PAID" }
      });
    }
  }

  return NextResponse.json({ received: true });
}

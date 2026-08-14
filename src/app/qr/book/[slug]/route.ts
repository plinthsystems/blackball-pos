import { prisma } from "@/server/db/prisma";
import { generateBookingQrPng } from "@/server/integrations/qr";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true }
  });
  if (!business) {
    return new Response("Store not found", { status: 404 });
  }

  const png = await generateBookingQrPng(slug);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

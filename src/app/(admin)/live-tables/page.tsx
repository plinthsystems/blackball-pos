import { getLiveTableBoard, getOpenCounterBills, getProductOptions } from "@/features/live-tables/queries";
import { LiveTablePage } from "@/features/live-tables/components/live-table-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import {
  getBookingPageUrl,
  getBookingQrPngUrl,
  getRequestBaseUrl
} from "@/server/integrations/base-url";
import { prisma } from "@/server/db/prisma";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function LiveTablesRoute() {
  const context = await getCurrentEmployeeContext();
  const isHqAdmin = context.accountType === "HQ_ADMIN";
  const headerStore = await headers();
  const baseUrl = getRequestBaseUrl(headerStore);
  const [tables, products, counterBills, business] = await Promise.all([
    getLiveTableBoard(context.businessId),
    getProductOptions(context.businessId),
    getOpenCounterBills(context.businessId),
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { slug: true, name: true }
    })
  ]);
  return (
    <LiveTablePage
      tables={tables}
      products={products}
      counterBills={counterBills}
      isHqAdmin={isHqAdmin}
      canManageItems={context.permissions.includes("tables.manage")}
      bookingLink={business ? getBookingPageUrl(business.slug, baseUrl) : null}
      bookingQrUrl={business ? getBookingQrPngUrl(business.slug, baseUrl) : null}
      businessName={business?.name ?? "Store"}
    />
  );
}

import { getBillingPageData } from "@/features/billing/queries";
import { BillingPage } from "@/features/billing/components/billing-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { BillingFilters } from "@/features/billing/types";

export const dynamic = "force-dynamic";

export default async function BillingRoute() {
  const context = await getCurrentEmployeeContext();

  // Parse filters from URL search params
  // In a real SSR scenario, we'd get searchParams from the request
  // For now, we pass empty filters - the client will handle filter changes
  const filters: BillingFilters = {};

  const data = await getBillingPageData(context.businessId, filters, context);

  return <BillingPage data={data} />;
}
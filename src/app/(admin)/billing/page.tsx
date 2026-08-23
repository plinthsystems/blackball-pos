import { getBillingPageData } from "@/features/billing/queries";
import { BillingPage } from "@/features/billing/components/billing-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import type { BillingFilters } from "@/features/billing/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const filterSchema = z.object({
  status: z.enum(["ALL", "OPEN", "CLOSED", "CANCELLED"]).optional().default("ALL"),
  kind: z.enum(["ALL", "SESSION", "COUNTER"]).optional().default("ALL"),
  category: z.enum(["ALL", "FOOD", "CIGARETTES", "BEVERAGES"]).optional().default("ALL"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  staffId: z.string().optional(),
  tableId: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(50),
});

export default async function BillingRoute(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getCurrentEmployeeContext();
  const searchParams = await props.searchParams;

  // Parse filters from URL search params
  const parsed = filterSchema.safeParse(searchParams);
  const filters: BillingFilters = parsed.success ? parsed.data : { page: 1, pageSize: 50 };

  // Convert "ALL" to undefined for the query
  const queryFilters: BillingFilters = { ...filters };
  if (queryFilters.status === "ALL") queryFilters.status = undefined;
  if (queryFilters.kind === "ALL") queryFilters.kind = undefined;
  if (queryFilters.category === "ALL") queryFilters.category = undefined;

  const data = await getBillingPageData(context.businessId, queryFilters, context);

  return <BillingPage data={data} />;
}
import { getLiveTableBoard, getProductOptions } from "@/features/live-tables/queries";
import { LiveTablePage } from "@/features/live-tables/components/live-table-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

export const dynamic = "force-dynamic";

export default async function LiveTablesRoute() {
  const context = await getCurrentEmployeeContext();
  const [tables, products] = await Promise.all([getLiveTableBoard(context.businessId), getProductOptions(context.businessId)]);
  return <LiveTablePage tables={tables} products={products} />;
}

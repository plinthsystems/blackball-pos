import { getLiveTableBoard } from "@/features/live-tables/queries";
import { LiveTablePage } from "@/features/live-tables/components/live-table-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

export default async function LiveTablesRoute() {
  const context = await getCurrentEmployeeContext();
  const tables = await getLiveTableBoard(context.businessId);
  return <LiveTablePage tables={tables} />;
}

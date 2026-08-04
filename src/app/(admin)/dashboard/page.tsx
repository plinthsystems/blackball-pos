import { OwnerDashboardPage } from "@/features/dashboard/components/owner-dashboard-page";
import { getOwnerDashboardData } from "@/features/dashboard/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  const context = await getCurrentEmployeeContext();
  const data = await getOwnerDashboardData(context.businessId);
  return <OwnerDashboardPage data={data} />;
}

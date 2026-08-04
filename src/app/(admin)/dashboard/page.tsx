import { OwnerDashboardPage } from "@/features/dashboard/components/owner-dashboard-page";
import { getOwnerDashboardData } from "@/features/dashboard/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("dashboard.read")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }
  const data = await getOwnerDashboardData(context.businessId);
  return <OwnerDashboardPage data={data} />;
}

import { OwnerDashboardPage } from "@/features/dashboard/components/owner-dashboard-page";
import { getOwnerDashboardData } from "@/features/dashboard/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { redirect } from "next/navigation";
import type { DashboardWindow } from "@/features/dashboard/types";

export const dynamic = "force-dynamic";

export default async function DashboardRoute({
  searchParams
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("dashboard.read")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }
  const params = await searchParams;
  const reportingWindow: DashboardWindow = params?.range === "30d" ? "30d" : params?.range === "7d" ? "7d" : "today";
  const data = await getOwnerDashboardData(context.businessId, new Date(), reportingWindow);
  return <OwnerDashboardPage data={data} />;
}

import { redirect } from "next/navigation";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";

export default async function RatesRoute() {
  const context = await getCurrentEmployeeContext();
  redirect(getDefaultRouteForPermissions(context.permissions));
}

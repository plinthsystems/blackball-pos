import { RatesPage } from "@/features/rates/components/rates-page";
import { getRateSettings } from "@/features/rates/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RatesRoute() {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("rates.manage")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }
  const rates = await getRateSettings(context.businessId);
  return <RatesPage rates={rates} />;
}

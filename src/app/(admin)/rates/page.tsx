import { RatesPage } from "@/features/rates/components/rates-page";
import { getRateSettings } from "@/features/rates/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

export const dynamic = "force-dynamic";

export default async function RatesRoute() {
  const context = await getCurrentEmployeeContext();
  const rates = await getRateSettings(context.businessId);
  return <RatesPage rates={rates} />;
}

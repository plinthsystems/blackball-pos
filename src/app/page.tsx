import { redirect } from "next/navigation";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const context = await getCurrentEmployeeContext();
  redirect(getDefaultRouteForPermissions(context.permissions));
}

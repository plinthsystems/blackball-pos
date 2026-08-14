import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getHqMasterDashboardData } from "@/server/services/hq-analytics-service";
import { HqMasterDashboard } from "@/features/hq/components/HqMasterDashboard";

export default async function HqDashboardPage() {
  const context = await getCurrentEmployeeContext();

  if (!context.organization) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
        <h2 className="text-lg font-bold">Standalone Store</h2>
        <p className="text-sm mt-1">This business is operating as an independent store and is not linked to a Franchise Organization.</p>
      </div>
    );
  }

  const hqData = await getHqMasterDashboardData(context.organization.id);

  return <HqMasterDashboard data={hqData} />;
}

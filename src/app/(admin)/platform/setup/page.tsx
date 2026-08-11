import { redirect } from "next/navigation";
import { PlatformSetupPage } from "@/features/platform/components/platform-setup-page";
import { createFranchiseSetupAction, createSaasSetupAction } from "@/features/platform/actions";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function PlatformSetupRoute() {
  const context = await getCurrentEmployeeContext();

  if (!context.permissions.includes("platform.setup.manage")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }

  const [plans, organizations, franchiseeCount, outletCount] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: [{ baseAmount: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, baseAmount: true }
    }),
    prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, type: true }
    }),
    prisma.franchisee.count(),
    prisma.business.count()
  ]);

  return (
    <PlatformSetupPage
      plans={plans.map((plan) => ({
        ...plan,
        baseAmount: Number(plan.baseAmount)
      }))}
      organizations={organizations}
      summary={{
        organizations: organizations.length,
        franchisees: franchiseeCount,
        outlets: outletCount,
        plans: plans.length
      }}
      createSaasAction={createSaasSetupAction}
      createFranchiseAction={createFranchiseSetupAction}
    />
  );
}

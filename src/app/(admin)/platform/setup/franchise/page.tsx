import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createFranchiseSetupAction } from "@/features/platform/actions";
import { PlatformFranchiseSetupPage } from "@/features/platform/components/platform-setup-page";
import type { TemporaryCredentials } from "@/features/platform/components/platform-setup-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

type SetupSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlatformFranchiseSetupRoute({ searchParams }: { searchParams?: SetupSearchParams }) {
  const context = await getCurrentEmployeeContext();

  if (!context.permissions.includes("platform.setup.manage")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }

  const params = await searchParams;
  const createdSlug = typeof params?.created === "string" ? params.created : undefined;
  const otpsRaw = (await cookies()).get("provision_otps")?.value;
  let temporaryCredentials: TemporaryCredentials | null = null;
  if (createdSlug && otpsRaw) {
    try {
      const parsed = JSON.parse(otpsRaw) as Record<string, TemporaryCredentials>;
      temporaryCredentials = parsed[createdSlug] ?? null;
    } catch {}
  }
  const [plans, organizations, recentOutlets, createdOutlet] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: [{ baseAmount: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, baseAmount: true }
    }),
    prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, type: true }
    }),
    prisma.business.findMany({
      where: { organization: { type: "FRANCHISE" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: setupOutletSelect()
    }),
    createdSlug
      ? prisma.business.findUnique({
          where: { slug: createdSlug },
          select: setupOutletSelect()
        })
      : null
  ]);

  return (
    <PlatformFranchiseSetupPage
      plans={plans.map((plan) => ({ ...plan, baseAmount: Number(plan.baseAmount) }))}
      organizations={organizations}
      recentOutlets={recentOutlets}
      createdOutlet={createdOutlet}
      temporaryCredentials={temporaryCredentials}
      createFranchiseAction={createFranchiseSetupAction}
    />
  );
}

function setupOutletSelect() {
  return {
    id: true,
    name: true,
    slug: true,
    email: true,
    createdAt: true,
    organization: { select: { name: true, type: true } },
    franchisee: { select: { name: true, email: true } },
    subscriptions: {
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { status: true, plan: { select: { name: true } } }
    },
    employees: {
      orderBy: { createdAt: "asc" },
      select: { email: true, accountType: true }
    }
  } as const;
}

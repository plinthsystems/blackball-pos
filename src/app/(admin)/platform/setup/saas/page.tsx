import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSaasSetupAction } from "@/features/platform/actions";
import { PlatformSaasSetupPage } from "@/features/platform/components/platform-setup-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

type SetupSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlatformSaasSetupRoute({ searchParams }: { searchParams?: SetupSearchParams }) {
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
      temporaryCredentials = parsed?.[createdSlug] ?? null;
    } catch {}
  }
  const [plans, recentOutlets, createdOutlet] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: [{ baseAmount: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, baseAmount: true }
    }),
    prisma.business.findMany({
      where: { organization: { type: "INDEPENDENT_SAAS" } },
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
    <PlatformSaasSetupPage
      plans={plans.map((plan) => ({ ...plan, baseAmount: Number(plan.baseAmount) }))}
      recentOutlets={recentOutlets}
      createdOutlet={createdOutlet}
      temporaryCredentials={temporaryCredentials}
      createSaasAction={createSaasSetupAction}
    />
  );
}

type TemporaryCredentials = {
  ownerEmail: string;
  ownerPassword: string;
  staffEmail: string | null;
  staffPassword: string | null;
};

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

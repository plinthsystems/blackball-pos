import { MenuSettingsPage } from "@/features/settings/menu-settings-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("products.manage")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }
  const products = await prisma.product.findMany({
    where: { businessId: context.businessId, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  return (
    <MenuSettingsPage
      branding={{
        appName: context.tenantBranding.appName,
        logoInitials: context.tenantBranding.logoInitials,
        brandColor: context.tenantBranding.brandColor,
        accentColor: context.tenantBranding.accentColor
      }}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        priceAmount: Number(product.priceAmount),
        active: product.active
      }))}
    />
  );
}

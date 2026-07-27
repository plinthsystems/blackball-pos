import { MenuSettingsPage } from "@/features/settings/menu-settings-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getCurrentEmployeeContext();
  const products = await prisma.product.findMany({
    where: { businessId: context.businessId, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  return (
    <MenuSettingsPage
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

import { redirect } from "next/navigation";
import { InventoryPage } from "@/features/inventory/inventory-page";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { prisma } from "@/server/db/prisma";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";

export const dynamic = "force-dynamic";

export default async function InventoryRoute() {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("products.manage")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }
  const products = await prisma.product.findMany({
    where: { businessId: context.businessId, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  return (
    <InventoryPage
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        priceAmount: Number(product.priceAmount),
        trackInventory: product.trackInventory,
        stockOnHand: product.stockOnHand,
        stockUnit: product.stockUnit,
        unitsPerPack: product.unitsPerPack,
        stockUpdatedAt: product.stockUpdatedAt?.toISOString() ?? null
      }))}
    />
  );
}

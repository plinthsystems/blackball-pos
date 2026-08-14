import { BookableItemsPage } from "@/features/tables/components/bookable-items-page";
import { getBookableItems } from "@/features/tables/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function BookableItemsRoute() {
  const context = await getCurrentEmployeeContext();
  const [items, business] = await Promise.all([
    getBookableItems(context.businessId),
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { name: true }
    })
  ]);
  return <BookableItemsPage items={items} businessName={business?.name ?? "your store"} />;
}

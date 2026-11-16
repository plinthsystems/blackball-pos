import { redirect } from "next/navigation";
import { z } from "zod";
import { ExpensesPage } from "@/features/expenses/components/expenses-page";
import { getExpenseProductOptions, getExpensesPageData } from "@/features/expenses/queries";
import type { ExpenseCategory, ExpenseFilters, ExpensePeriod } from "@/features/expenses/types";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  period: z.enum(["today", "7d", "30d", "all"]).default("30d"),
  category: z.enum(["ALL", "INVENTORY_PURCHASE", "GROCERIES", "UTILITIES", "RENT", "MAINTENANCE", "OTHER"]).default("ALL")
});

export default async function ExpensesRoute(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("products.manage")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }
  const parsed = querySchema.safeParse(await props.searchParams);
  const filters: ExpenseFilters = parsed.success
    ? { period: parsed.data.period as ExpensePeriod, category: parsed.data.category as ExpenseCategory | "ALL" }
    : { period: "30d", category: "ALL" };
  const [data, products] = await Promise.all([
    getExpensesPageData(context.businessId, filters),
    getExpenseProductOptions(context.businessId)
  ]);
  return <ExpensesPage data={data} products={products} />;
}

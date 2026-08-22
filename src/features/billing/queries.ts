import { prisma } from "@/server/db/prisma";
import type {
  BillingFilters,
  BillingPageData,
  BillingRecord,
  BillingStatus,
  BillingKind,
  ProductCategory
} from "./types";
import type { CurrentEmployeeContext, AccountType } from "@/server/auth/current-employee";

export async function getBillingPageData(
  businessId: string,
  filters: BillingFilters,
  context: CurrentEmployeeContext
): Promise<BillingPageData> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  // Role-based access: STORE_USER sees only their own closed bills
  const whereClause = buildWhereClause(businessId, filters, context.accountType, context.employeeId);

  const [bills, totalCount, staffOptions, tables] = await Promise.all([
    prisma.bill.findMany({
      where: whereClause,
      orderBy: { openedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            nameSnapshot: true,
            category: true,
            quantity: true,
            unitPriceAmount: true,
            lineTotalAmount: true
          }
        },
        session: {
          select: {
            table: { select: { number: true } },
            customer: { select: { name: true, phone: true } },
            assignedEmployee: { select: { name: true } },
            startedAt: true,
            actualEndAt: true,
            plannedEndAt: true,
            status: true
          }
        }
      }
    }),
    prisma.bill.count({ where: whereClause }),
    prisma.employee.findMany({
      where: { businessId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.clubTable.findMany({
      where: { businessId, active: true },
      select: { id: true, number: true },
      orderBy: { number: "asc" }
    })
  ]);

  const records = bills.map((bill) => mapBillToRecord(bill));

  return {
    records,
    total: totalCount,
    filters,
    staffOptions: staffOptions.map((e) => ({ id: e.id, name: e.name })),
    tables: tables.map((t) => ({ id: t.id, number: t.number }))
  };
}

function buildWhereClause(
  businessId: string,
  filters: BillingFilters,
  accountType: AccountType,
  employeeId: string
): Record<string, unknown> {
  const where: Record<string, unknown> = { businessId };

  // Role-based restriction
  if (accountType === "STORE_USER") {
    // Store users can only see closed bills they were assigned to
    where.status = "CLOSED" as BillingStatus;
    where.session = {
      some: {
        assignedEmployeeId: employeeId
      }
    };
  } else {
    // Managers and above see bills based on filter
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters.kind && filters.kind !== "ALL") {
      where.kind = filters.kind;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.openedAt = {
        ...(where.openedAt as Record<string, unknown> ?? {}),
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo
          ? { lte: (() => { const d = new Date(filters.dateTo); d.setHours(23, 59, 59, 999); return d; })() }
          : {})
      };
    }
    if (filters.staffId) {
      where.session = {
        some: {
          assignedEmployeeId: filters.staffId
        }
      };
    }
    if (filters.tableId) {
      where.session = {
        some: {
          tableId: filters.tableId
        }
      };
    }
  }

  // Category filter: find bills that have items in this category
  if (filters.category && filters.category !== "ALL") {
    where.items = {
      some: {
        category: filters.category
      }
    };
  }

  return where;
}

function mapBillToRecord(bill: {
  id: string;
  label: string | null;
  kind: BillingKind;
  status: BillingStatus;
  openedAt: Date;
  closedAt: Date | null;
  tableAmountSnapshot: unknown;
  itemTotalAmountSnapshot: unknown;
  totalAmountSnapshot: unknown;
  items: Array<{
    id: string;
    nameSnapshot: string;
    category: ProductCategory;
    quantity: number;
    unitPriceAmount: unknown;
    lineTotalAmount: unknown;
  }>;
  session: {
    table: { number: string } | null;
    customer: { name: string | null; phone: string | null } | null;
    assignedEmployee: { name: string | null } | null;
    startedAt: Date;
    actualEndAt: Date | null;
    plannedEndAt: Date;
    status: string;
  } | null;
}): BillingRecord {
  const tableNumber = bill.session?.table?.number ?? null;
  const staffName = bill.session?.assignedEmployee?.name ?? null;
  const customerName = bill.session?.customer?.name ?? null;
  const customerPhone = bill.session?.customer?.phone ?? null;

  const categoryMap = new Map<string, { total: number }>();
  const addItemCategory = (category: ProductCategory, amount: number) => {
    const existing = categoryMap.get(category) ?? { total: 0 };
    categoryMap.set(category, { total: existing.total + amount });
  };

  for (const item of bill.items) {
    addItemCategory(item.category, Number(item.lineTotalAmount));
  }

  const categorySummaries = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category: category as ProductCategory,
    total: data.total
  }));

  return {
    id: bill.id,
    label: bill.label ?? "Bill",
    kind: bill.kind,
    status: bill.status,
    tableNumber,
    sessionLabel: bill.session ? formatSessionLabel(bill.session) : null,
    openedAt: bill.openedAt.toISOString(),
    closedAt: bill.closedAt?.toISOString() ?? null,
    totalAmount: Number(bill.totalAmountSnapshot),
    tableAmount: Number(bill.tableAmountSnapshot),
    itemTotal: Number(bill.itemTotalAmountSnapshot),
    items: bill.items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      category: item.category,
      quantity: item.quantity,
      unitPrice: Number(item.unitPriceAmount),
      lineTotal: Number(item.lineTotalAmount)
    })),
    categorySummaries,
    assignedStaffName: staffName,
    customerName,
    customerPhone
  };
}

function formatSessionLabel(session: {
  startedAt: Date;
  actualEndAt: Date | null;
  plannedEndAt: Date;
  status: string;
}): string {
  const start = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(session.startedAt));

  const end = session.actualEndAt
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(session.actualEndAt))
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(session.plannedEndAt));

  return `${start} → ${end}`;
}
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
import { calculateBillSegmentTableAmount } from "@/server/domain/bill-summary";
import { addDaysToDateKey, storeDateStart, STORE_TIME_ZONE } from "@/lib/time";
import { getRecordedFoodMenuDiscount, isFoodMenuDiscountItem } from "@/server/domain/food-discount";
import { calculateBillableSeconds } from "@/server/domain/session-calculations";

export async function getBillingPageData(
  businessId: string,
  filters: BillingFilters,
  context: CurrentEmployeeContext,
  now = new Date()
): Promise<BillingPageData> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  // Role-based access: STORE_USER sees only their own closed bills
  const whereClause = await buildWhereClause(businessId, filters, context.accountType, context.employeeId);

  const [bills, totalCount] = await Promise.all([
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
        payments: {
          orderBy: { createdAt: "asc" },
          select: { id: true, method: true, amount: true, createdAt: true }
        },
        session: {
          select: {
            table: { select: { number: true } },
            customer: { select: { name: true, phone: true } },
            assignedEmployee: { select: { name: true } },
            startedAt: true,
            actualEndAt: true,
            plannedEndAt: true,
            pausedAt: true,
            hourlyRateSnapshot: true,
            billableSecondsSnapshot: true,
            status: true,
            pauses: { select: { pausedAt: true, resumedAt: true } }
          }
        }
      }
    }),
    prisma.bill.count({ where: whereClause })
  ]);

  const records = bills.map((bill) => mapBillToRecord(bill, now));

  return {
    records,
    total: totalCount,
    filters,
    staffOptions: [],
    tables: []
  };
}

async function buildWhereClause(
  businessId: string,
  filters: BillingFilters,
  accountType: AccountType,
  employeeId: string
): Promise<Record<string, unknown>> {
  const where: Record<string, unknown> = { businessId };

  // Role-based restriction
  if (accountType === "STORE_USER") {
    // Store users can only see closed bills they were assigned to
    where.status = "CLOSED" as BillingStatus;
    where.session = {
      is: {
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
        ...(filters.dateFrom ? { gte: storeDateStart(filters.dateFrom) } : {}),
        ...(filters.dateTo
          ? { lt: storeDateStart(addDaysToDateKey(filters.dateTo, 1)) }
          : {})
      };
    }
    if (filters.staffId || filters.tableId) {
      where.session = {
        is: {
          ...(filters.staffId ? { assignedEmployeeId: filters.staffId } : {}),
          ...(filters.tableId ? { tableId: filters.tableId } : {})
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

  const search = filters.search?.trim();
  if (search) {
    const contains = { contains: search, mode: "insensitive" as const };
    const matchingCustomers = await prisma.customer.findMany({
      where: { businessId, name: contains },
      select: { id: true }
    });
    where.OR = [
      { label: contains },
      ...(matchingCustomers.length > 0
        ? [{ session: { is: { customerId: { in: matchingCustomers.map((customer) => customer.id) } } } }]
        : []),
      { session: { is: { table: { is: { number: contains } } } } },
      { items: { some: { nameSnapshot: contains } } }
    ];
  }

  return where;
}

function mapBillToRecord(bill: {
  id: string;
  label: string | null;
  kind: BillingKind;
  status: BillingStatus;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
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
  payments: Array<{ id: string; method: "CASH" | "CARD" | "UPI" | "SPLIT"; amount: unknown; createdAt: Date }>;
  session: {
    table: { number: string } | null;
    customer: { name: string | null; phone: string | null } | null;
    assignedEmployee: { name: string | null } | null;
    startedAt: Date;
    actualEndAt: Date | null;
    plannedEndAt: Date;
    pausedAt: Date | null;
    hourlyRateSnapshot: unknown;
    billableSecondsSnapshot: number;
    status: string;
    pauses: Array<{ pausedAt: Date; resumedAt: Date | null }>;
  } | null;
}, now: Date): BillingRecord {
  const tableNumber = bill.session?.table?.number ?? null;
  const staffName = bill.session?.assignedEmployee?.name ?? null;
  const customerName = bill.session?.customer?.name ?? null;
  const customerPhone = bill.session?.customer?.phone ?? null;
  const billStartedAt = bill.session && bill.label === "Bill 1" ? bill.session.startedAt : bill.openedAt;
  const pauses = [...(bill.session?.pauses ?? [])];
  if (bill.session?.status === "PAUSED" && bill.session.pausedAt && !pauses.some((pause) => !pause.resumedAt)) {
    pauses.push({ pausedAt: bill.session.pausedAt, resumedAt: null });
  }

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

  const itemTotalFromLines = roundMoney(bill.items.reduce((sum, item) => sum + Number(item.lineTotalAmount), 0));
  const tableHourlyRate = bill.session ? Number(bill.session.hourlyRateSnapshot) : 0;
  const tableEnd = bill.status === "OPEN" ? now : bill.closedAt;
  const tableDurationSeconds = bill.session && tableEnd
    ? calculateBillableSeconds({ startedAt: billStartedAt, endedAt: tableEnd, pauses })
    : 0;
  const tableDurationMinutes = Math.ceil(tableDurationSeconds / 60);
  const calculatedOpenTableAmount = bill.kind === "SESSION" && bill.session && bill.status === "OPEN"
    ? calculateBillSegmentTableAmount({ startedAt: billStartedAt, endedAt: now, hourlyRate: tableHourlyRate, pauses })
    : 0;
  const tableAmount = bill.status === "OPEN"
    ? calculatedOpenTableAmount
    : Number(bill.tableAmountSnapshot);
  const itemTotal = bill.status === "OPEN" ? itemTotalFromLines : Number(bill.itemTotalAmountSnapshot);
  const totalAmount = bill.status === "OPEN" ? roundMoney(tableAmount + itemTotal) : Number(bill.totalAmountSnapshot);
  const discountAmount = getRecordedFoodMenuDiscount(bill.items);
  const itemSubtotal = roundMoney(itemTotal + discountAmount);
  const payments = bill.payments.map((payment) => ({
    id: payment.id,
    method: payment.method === "CASH" ? "CASH" as const : "UPI" as const,
    amount: Number(payment.amount),
    createdAt: payment.createdAt.toISOString()
  }));
  const recordedPaidAmount = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const paidAmount = bill.paymentStatus === "PAID" && payments.length === 0 ? totalAmount : recordedPaidAmount;

  return {
    id: bill.id,
    label: bill.label ?? "Bill",
    kind: bill.kind,
    status: bill.status,
    paymentStatus: bill.paymentStatus,
    tableNumber,
    sessionLabel: bill.session ? formatSessionLabel(billStartedAt, bill.closedAt ?? bill.session.actualEndAt ?? bill.session.plannedEndAt) : null,
    openedAt: billStartedAt.toISOString(),
    closedAt: bill.closedAt?.toISOString() ?? null,
    totalAmount,
    tableAmount,
    tableDurationMinutes,
    tableDurationSeconds,
    tableHourlyRate,
    itemTotal,
    itemSubtotal,
    discountAmount,
    paidAmount,
    remainingAmount: roundMoney(Math.max(0, totalAmount - paidAmount)),
    payments,
    items: bill.items.filter((item) => !isFoodMenuDiscountItem({ name: item.nameSnapshot })).map((item) => ({
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

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function formatSessionLabel(startedAt: Date, endedAt: Date): string {
  const start = new Intl.DateTimeFormat("en-IN", {
    timeZone: STORE_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(startedAt);

  const end = new Intl.DateTimeFormat("en-IN", {
    timeZone: STORE_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(endedAt);

  return `${start} → ${end} IST`;
}

export type BillingStatus = "OPEN" | "CLOSED" | "CANCELLED";
export type BillingKind = "SESSION" | "COUNTER";
export type ProductCategory = "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES";

export type BillItemRow = {
  id: string;
  name: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CategorySummary = {
  category: ProductCategory;
  total: number;
};

export type BillingRecord = {
  id: string;
  label: string;
  kind: BillingKind;
  status: BillingStatus;
  tableNumber: string | null;
  sessionLabel: string | null;
  openedAt: string;
  closedAt: string | null;
  totalAmount: number;
  tableAmount: number;
  itemTotal: number;
  items: BillItemRow[];
  categorySummaries: CategorySummary[];
  assignedStaffName: string | null;
  customerName: string | null;
  customerPhone: string | null;
};

export type BillingFilters = {
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: BillingStatus | "ALL";
  kind?: BillingKind | "ALL";
  category?: ProductCategory | "ALL";
  staffId?: string | null;
  tableId?: string | null;
  page?: number;
  pageSize?: number;
};

export type BillingPageData = {
  records: BillingRecord[];
  total: number;
  filters: BillingFilters;
  staffOptions: { id: string; name: string }[];
  tables: { id: string; number: string }[];
};
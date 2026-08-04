export type LiveTableStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";
export type LiveTableGameType = "POOL" | "SNOOKER" | "PS5";
export type LiveSessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type ProductCategory = "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES";

export type ProductOption = {
  id: string;
  name: string;
  category: ProductCategory;
  priceAmount: number;
};

export type LiveBillSummary = {
  tableAmount: number;
  categoryTotals: Record<"FOOD" | "CIGARETTES" | "BEVERAGES", number>;
  itemTotal: number;
  grandTotal: number;
};

export type BillLineItem = {
  id: string;
  name: string;
  category: ProductCategory;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount: number;
};

export type LiveBillData = {
  id: string;
  label: string;
  openedAt: string;
  closedAt: string | null;
  summary: LiveBillSummary;
  items: BillLineItem[];
};

export type LiveTableCardData = {
  id: string;
  number: string;
  gameType: LiveTableGameType;
  status: LiveTableStatus;
  hourlyRate: number;
  currentSession: null | {
    id: string;
    status: LiveSessionStatus;
    customerName: string | null;
    startedAt: string;
    plannedEndAt: string;
    elapsedSeconds: number;
    billEstimate: number;
    billSummary: LiveBillSummary;
    currentBill: LiveBillData | null;
    assignedStaffName: string | null;
  };
  recentBill: LiveBillData | null;
};

export type CounterBillData = LiveBillData & {
  label: string;
};

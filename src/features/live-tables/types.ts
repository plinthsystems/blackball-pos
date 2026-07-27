export type LiveTableStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";
export type LiveTableGameType = "POOL" | "SNOOKER";
export type LiveSessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type ProductCategory = "CAFE" | "CIGARETTES" | "BEVERAGES";

export type ProductOption = {
  id: string;
  name: string;
  category: ProductCategory;
  priceAmount: number;
};

export type LiveBillSummary = {
  tableAmount: number;
  categoryTotals: Record<ProductCategory, number>;
  itemTotal: number;
  grandTotal: number;
};

export type LiveTableCardData = {
  id: string;
  number: string;
  gameType: LiveTableGameType;
  status: LiveTableStatus;
  currentSession: null | {
    id: string;
    status: LiveSessionStatus;
    customerName: string | null;
    startedAt: string;
    plannedEndAt: string;
    billEstimate: number;
    billSummary: LiveBillSummary;
    assignedStaffName: string | null;
  };
};

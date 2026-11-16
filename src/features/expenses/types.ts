export type ExpenseCategory = "INVENTORY_PURCHASE" | "GROCERIES" | "UTILITIES" | "RENT" | "MAINTENANCE" | "OTHER";
export type ExpensePeriod = "today" | "7d" | "30d" | "all";
export type ExpensePaymentMethod = "CASH" | "UPI";

export type ExpenseLineRecord = {
  id: string;
  name: string;
  amount: number;
  packs: number | null;
  stockUnit: string | null;
  stockUnitsAdded: number;
};

export type ExpenseRecord = {
  id: string;
  category: ExpenseCategory;
  vendorName: string | null;
  paymentMethod: ExpensePaymentMethod;
  amount: number;
  spentAt: string;
  notes: string | null;
  items: ExpenseLineRecord[];
};

export type ExpenseFilters = {
  period: ExpensePeriod;
  category: ExpenseCategory | "ALL";
};

export type ExpensePageData = {
  records: ExpenseRecord[];
  count: number;
  totalAmount: number;
  cashAmount: number;
  upiAmount: number;
  filters: ExpenseFilters;
};

export type ExpenseProductOption = {
  id: string;
  name: string;
  category: "BEVERAGES" | "CIGARETTES";
  stockUnit: string;
  unitsPerPack: number;
};

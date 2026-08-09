export type DashboardRevenue = {
  stationTime: number;
  ps5Time: number;
  food: number;
  cigarettes: number;
  beverages: number;
};

export type BusyHoursRow = {
  label: "Royal Snooker" | "Mini Snooker" | "Pool" | "PS5";
  hours: number;
};

export type OwnerDashboardData = {
  totalRevenue: number;
  revenue: DashboardRevenue;
  busyHours: BusyHoursRow[];
  closedBillCount: number;
  openBillCount: number;
};

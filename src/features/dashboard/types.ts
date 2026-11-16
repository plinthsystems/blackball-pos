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

export type DashboardWindow = "today" | "7d" | "30d";

export type DailyRevenueRow = {
  date: string;
  revenue: number;
  closedBills: number;
};

export type OwnerDashboardData = {
  totalRevenue: number;
  revenue: DashboardRevenue;
  busyHours: BusyHoursRow[];
  closedBillCount: number;
  openBillCount: number;
  reportingWindow?: DashboardWindow;
  dailyTrend?: DailyRevenueRow[];
};

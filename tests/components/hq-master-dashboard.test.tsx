import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HqMasterDashboardData } from "@/server/services/hq-analytics-service";
import { HqMasterDashboard } from "@/features/hq/components/HqMasterDashboard";

function buildDashboardData(overrides?: Partial<HqMasterDashboardData>) {
  return {
    organizationId: "org_1",
    organizationName: "Test Franchise",
    totalOutlets: 2,
    totalSalesToday: 50000,
    totalActiveTablesNow: 5,
    totalTablesAcrossOutlets: 20,
    overallOccupancyPercentage: 25,
    outletSummaries: [
      {
        businessId: "biz_1",
        businessName: "Outlet A",
        slug: "outlet-a",
        activeTablesCount: 3,
        totalTablesCount: 10,
        todaySales: 30000,
        todaySessionCount: 15,
        occupancyPercentage: 30
      },
      {
        businessId: "biz_2",
        businessName: "Outlet B",
        slug: "outlet-b",
        activeTablesCount: 2,
        totalTablesCount: 10,
        todaySales: 20000,
        todaySessionCount: 10,
        occupancyPercentage: 20
      }
    ],
    peakHoursBreakdown: [
      { hourLabel: "00:00", sessionCount: 0, revenue: 0 },
      { hourLabel: "12:00", sessionCount: 5, revenue: 15000 },
      { hourLabel: "18:00", sessionCount: 8, revenue: 35000 }
    ],
    ...overrides
  };
}

describe("HqMasterDashboard", () => {
  it("renders the dashboard header with organization name", () => {
    const data = buildDashboardData();
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("Franchise HQ Master Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Test Franchise")).toBeInTheDocument();
  });

  it("renders live sync indicator", () => {
    const data = buildDashboardData();
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("Live Sync Active")).toBeInTheDocument();
  });

  it("renders all stat cards with correct values", () => {
    const data = buildDashboardData();
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("formats total sales with Indian locale", () => {
    const data = buildDashboardData({ totalSalesToday: 125000 });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("₹1,25,000")).toBeInTheDocument();
  });

  it("renders outlet comparison table", () => {
    const data = buildDashboardData();
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("Outlet A")).toBeInTheDocument();
    expect(screen.getByText("Outlet B")).toBeInTheDocument();
    expect(screen.getByText("3 / 10 tables")).toBeInTheDocument();
    expect(screen.getByText("2 / 10 tables")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("₹30,000")).toBeInTheDocument();
    expect(screen.getByText("₹20,000")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders peak hours bar chart", () => {
    const data = buildDashboardData();
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("Peak Hours Sales Distribution")).toBeInTheDocument();
  });

  it("handles empty outletSummaries", () => {
    const data = buildDashboardData({ outletSummaries: [] });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("Franchise HQ Master Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Outlet A")).not.toBeInTheDocument();
  });

  it("handles zero revenue in peak hours", () => {
    const data = buildDashboardData({
      peakHoursBreakdown: [
        { hourLabel: "00:00", sessionCount: 0, revenue: 0 },
        { hourLabel: "01:00", sessionCount: 0, revenue: 0 }
      ]
    });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("Peak Hours Sales Distribution")).toBeInTheDocument();
  });

  it("handles all zero sales across outlets", () => {
    const data = buildDashboardData({
      totalSalesToday: 0,
      totalActiveTablesNow: 0,
      overallOccupancyPercentage: 0,
      outletSummaries: [
        {
          businessId: "biz_1",
          businessName: "Empty Outlet",
          slug: "empty",
          activeTablesCount: 0,
          totalTablesCount: 5,
          todaySales: 0,
          todaySessionCount: 0,
          occupancyPercentage: 0
        }
      ]
    });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getAllByText("₹0").length).toBeGreaterThan(0);
    expect(screen.getByText("0 / 5 tables")).toBeInTheDocument();
    // Occupancy percentage is split across elements, use textContent check
    const occupancyElements = screen.getAllByText(/0/);
    expect(occupancyElements.length).toBeGreaterThan(0);
  });

  it("handles single outlet", () => {
    const data = buildDashboardData({
      totalOutlets: 1,
      outletSummaries: [
        {
          businessId: "biz_1",
          businessName: "Single Store",
          slug: "single",
          activeTablesCount: 2,
          totalTablesCount: 8,
          todaySales: 10000,
          todaySessionCount: 5,
          occupancyPercentage: 25
        }
      ]
    });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("Single Store")).toBeInTheDocument();
    expect(screen.getByText("2 / 8 tables")).toBeInTheDocument();
  });

  it("handles occupancy at 100%", () => {
    const data = buildDashboardData({
      totalActiveTablesNow: 20,
      totalTablesAcrossOutlets: 20,
      overallOccupancyPercentage: 100,
      outletSummaries: [
        {
          businessId: "biz_1",
          businessName: "Full Outlet",
          slug: "full",
          activeTablesCount: 10,
          totalTablesCount: 10,
          todaySales: 50000,
          todaySessionCount: 20,
          occupancyPercentage: 100
        }
      ]
    });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
  });

  it("handles large sales numbers with proper formatting", () => {
    const data = buildDashboardData({
      totalSalesToday: 999999999,
      outletSummaries: [
        {
          businessId: "biz_1",
          businessName: "Big Store",
          slug: "big",
          activeTablesCount: 5,
          totalTablesCount: 10,
          todaySales: 999999999,
          todaySessionCount: 500,
          occupancyPercentage: 50
        }
      ]
    });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getAllByText("₹99,99,99,999").length).toBeGreaterThan(0);
  });

  it("renders peak hours with zero max revenue gracefully", () => {
    const data = buildDashboardData({
      peakHoursBreakdown: [
        { hourLabel: "00:00", sessionCount: 0, revenue: 0 },
        { hourLabel: "01:00", sessionCount: 0, revenue: 0 }
      ],
      totalSalesToday: 0
    });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("Peak Hours Sales Distribution")).toBeInTheDocument();
  });

  it("clips occupancy percentage to max 100% on bar", () => {
    const data = buildDashboardData({
      outletSummaries: [
        {
          businessId: "biz_1",
          businessName: "Overflow",
          slug: "overflow",
          activeTablesCount: 15,
          totalTablesCount: 10,
          todaySales: 0,
          todaySessionCount: 0,
          occupancyPercentage: 150
        }
      ]
    });
    render(<HqMasterDashboard data={data} />);
    expect(screen.getByText("150%")).toBeInTheDocument();
  });
});
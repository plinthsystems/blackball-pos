import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwnerDashboardPage } from "@/features/dashboard/components/owner-dashboard-page";

describe("OwnerDashboardPage", () => {
  it("renders revenue categories and busy hours for today", () => {
    render(
      <OwnerDashboardPage
        data={{
          totalRevenue: 435,
          revenue: { stationTime: 175, ps5Time: 100, food: 120, cigarettes: 20, beverages: 20 },
          busyHours: [
            { label: "Royal Snooker", hours: 1.5 },
            { label: "Mini Snooker", hours: 0 },
            { label: "Pool", hours: 0.5 },
            { label: "PS5", hours: 2 }
          ],
          closedBillCount: 3,
          openBillCount: 2
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "The Nine Admin" })).toBeInTheDocument();
    expect(screen.queryByText("Today's revenue and station utilization.")).not.toBeInTheDocument();
    expect(screen.getByText("Today's revenue")).toBeInTheDocument();
    expect(screen.getByText("₹435.00")).toBeInTheDocument();
    expect(screen.getByText("PS5 time")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Cigarettes")).toBeInTheDocument();
    expect(screen.getByText("Beverages")).toBeInTheDocument();
    expect(screen.getByText("Royal Snooker")).toBeInTheDocument();
    expect(screen.getByText("2.00h")).toBeInTheDocument();
  });

  it("renders the admin sales trend when provided", () => {
    render(
      <OwnerDashboardPage
        data={{
          totalRevenue: 250,
          revenue: { stationTime: 0, ps5Time: 0, food: 250, cigarettes: 0, beverages: 0 },
          busyHours: [],
          closedBillCount: 1,
          openBillCount: 0,
          reportingWindow: "7d",
          dailyTrend: [{ date: "2026-08-16", revenue: 250, closedBills: 1 }]
        }}
      />
    );

    expect(screen.getByText("Sales trend")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "7 days" })).toBeInTheDocument();
    expect(screen.getAllByText("₹250.00")).toHaveLength(3);
  });
});

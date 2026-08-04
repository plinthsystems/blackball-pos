import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveTablePage } from "@/features/live-tables/components/live-table-page";

describe("LiveTablePage", () => {
  it("renders table states and primary session actions", () => {
    render(
      <LiveTablePage
        counterBills={[]}
        products={[
          { id: "product_tea", name: "Tea", category: "FOOD", priceAmount: 20 },
          { id: "product_water", name: "Water Bottle", category: "BEVERAGES", priceAmount: 20 }
        ]}
        tables={[
          {
            id: "table_1",
            number: "P1",
            gameType: "POOL",
            status: "AVAILABLE",
            hourlyRate: 160,
            currentSession: null,
            recentBill: {
              id: "bill_recent",
              label: "Bill 1",
              openedAt: "2026-07-23T09:00:00.000Z",
              closedAt: "2026-07-23T09:30:00.000Z",
              summary: {
                tableAmount: 80,
                categoryTotals: { FOOD: 20, CIGARETTES: 0, BEVERAGES: 20 },
                itemTotal: 40,
                grandTotal: 120
              },
              items: []
            }
          },
          {
            id: "table_2",
            number: "S1",
            gameType: "SNOOKER",
            status: "OCCUPIED",
            hourlyRate: 350,
            currentSession: {
              id: "session_1",
              status: "ACTIVE",
              customerName: "Riya Shah",
              startedAt: "2026-07-23T10:00:00.000Z",
              plannedEndAt: "2026-07-23T11:00:00.000Z",
              elapsedSeconds: 900,
              billEstimate: 450,
              billSummary: {
                tableAmount: 450,
                categoryTotals: { FOOD: 80, CIGARETTES: 20, BEVERAGES: 40 },
                itemTotal: 140,
                grandTotal: 590
              },
              currentBill: {
                id: "bill_1",
                label: "Bill 1",
                openedAt: "2026-07-23T10:00:00.000Z",
                closedAt: null,
                summary: {
                  tableAmount: 450,
                  categoryTotals: { FOOD: 80, CIGARETTES: 20, BEVERAGES: 40 },
                  itemTotal: 140,
                  grandTotal: 590
                },
                items: [
                  { id: "item_1", name: "Tea", category: "FOOD", quantity: 2, unitPriceAmount: 20, lineTotalAmount: 40 },
                  { id: "item_2", name: "Water Bottle", category: "BEVERAGES", quantity: 2, unitPriceAmount: 20, lineTotalAmount: 40 }
                ]
              },
              assignedStaffName: "Aarav Manager"
            },
            recentBill: null
          },
          {
            id: "ps5_1",
            number: "PS5 1",
            gameType: "PS5",
            status: "AVAILABLE",
            hourlyRate: 200,
            currentSession: null,
            recentBill: null
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Live Floor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Snooker & Pool" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PS5" })).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("S1")).toBeInTheDocument();
    expect(screen.getByText("PS5 1")).toBeInTheDocument();
    expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();
    expect(screen.queryByText("No active session")).not.toBeInTheDocument();
    expect(screen.getByText(/₹200\.00\/hr/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start session for station P1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start session for station PS5 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start counter bill" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add items for station S1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End session for station S1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close bill and continue station S1" })).toBeInTheDocument();
    expect(screen.getByText(/Started/)).toBeInTheDocument();
    expect(screen.getByText("Elapsed 15m 00s")).toBeInTheDocument();
    expect(screen.getByText("Station")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Cigarettes")).toBeInTheDocument();
    expect(screen.getByText("Beverages")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Tea x2")).toBeInTheDocument();
    expect(screen.getByText("Water Bottle x2")).toBeInTheDocument();
    expect(screen.getByText("Last total ₹120.00")).toBeInTheDocument();
    expect(screen.getAllByText("₹590.00").length).toBeGreaterThan(0);
  });

  it("shows only useful table summary counts", () => {
    render(
      <LiveTablePage
        counterBills={[]}
        products={[]}
        tables={[
          { id: "1", number: "P1", gameType: "POOL", status: "AVAILABLE", hourlyRate: 160, currentSession: null, recentBill: null },
          { id: "2", number: "P2", gameType: "POOL", status: "RESERVED", hourlyRate: 160, currentSession: null, recentBill: null },
          { id: "3", number: "S1", gameType: "SNOOKER", status: "OCCUPIED", hourlyRate: 350, currentSession: null, recentBill: null },
          { id: "4", number: "S2", gameType: "SNOOKER", status: "CLEANING", hourlyRate: 350, currentSession: null, recentBill: null },
          { id: "5", number: "S3", gameType: "SNOOKER", status: "MAINTENANCE", hourlyRate: 350, currentSession: null, recentBill: null }
        ]}
      />
    );

    const counts = screen.getByLabelText("Table status counts");
    expect(counts).toHaveTextContent("Available");
    expect(counts).toHaveTextContent("Reserved");
    expect(counts).toHaveTextContent("Occupied");
    expect(counts).not.toHaveTextContent("Cleaning");
    expect(counts).not.toHaveTextContent("Maintenance");
    expect(counts).not.toHaveTextContent("Blocked");
  });
});

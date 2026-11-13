import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LiveTablePage } from "@/features/live-tables/components/live-table-page";

describe("LiveTablePage", () => {
  it("shows an open-ended Pool session with a Stop action", () => {
    render(
      <LiveTablePage
        counterBills={[]}
        businessName="The Nine Snooker & Cafe"
        products={[]}
        tables={[{
          id: "pool_1",
          number: "Pool",
          gameType: "POOL",
          status: "OCCUPIED",
          hourlyRate: 180,
          currentSession: {
            id: "session_pool",
            status: "ACTIVE",
            customerName: "Walk-in customer",
            startedAt: "2026-07-23T10:00:00.000Z",
            plannedEndAt: "2026-07-23T11:00:00.000Z",
            elapsedSeconds: 900,
            ps5MemberCount: null,
            hourlyRateSnapshot: 180,
            billEstimate: 45,
            billSummary: {
              tableAmount: 45,
              categoryTotals: { FOOD: 0, CIGARETTES: 0, BEVERAGES: 0 },
              itemTotal: 0,
              grandTotal: 45
            },
            currentBill: null,
            assignedStaffName: null
          },
          recentBill: null
        }]}
      />
    );

    const poolCard = screen.getByRole("heading", { name: "Pool" }).closest("article");
    expect(poolCard).not.toBeNull();
    expect(poolCard).toHaveTextContent("Started");
    expect(poolCard).not.toHaveTextContent("Ends");
    expect(poolCard).toHaveTextContent("Stop");
    expect(poolCard).not.toHaveTextContent("Extend");
  });

  it("keeps active bill details collapsed until staff asks to see them", async () => {
    const user = userEvent.setup();
    render(
      <LiveTablePage
        counterBills={[]}
        businessName="The Nine Snooker & Cafe"
        products={[
          { id: "product_tea", name: "Tea", category: "FOOD", priceAmount: 20, stockOnHand: 25, stockUnit: "servings", unitsPerPack: 1 },
          { id: "product_water", name: "Water Bottle", category: "BEVERAGES", priceAmount: 20, stockOnHand: 12, stockUnit: "bottles", unitsPerPack: 1 }
        ]}
        tables={[
          {
            id: "table_1",
            number: "Pool",
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
            number: "Royal Snooker 1",
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
              ps5MemberCount: null,
              hourlyRateSnapshot: 350,
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
    expect(screen.getByRole("heading", { name: "The Nine Tables" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Booking QR" })).not.toBeInTheDocument();
    expect(screen.getByText("Pool")).toBeInTheDocument();
    expect(screen.getByText("Royal Snooker 1")).toBeInTheDocument();
    expect(screen.queryByText("PS5 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();
    expect(screen.queryByText("No active session")).not.toBeInTheDocument();
    expect(screen.getByText(/₹160\.00\/hr/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start session for station Pool" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start counter bill" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add items for station Royal Snooker 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop session for station Royal Snooker 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close bill and continue station Royal Snooker 1" })).not.toBeInTheDocument();
    expect(screen.getByText(/Started/)).toBeInTheDocument();
    expect(screen.queryByText(/Ends/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Extend/ })).not.toBeInTheDocument();
    expect(screen.getByText("15:00")).toBeInTheDocument();
    expect(screen.getByText("Elapsed")).toBeInTheDocument();
    expect(screen.getByText("Playing now")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show bill details" })).toBeInTheDocument();
    expect(screen.queryByText("Food")).not.toBeInTheDocument();
    expect(screen.queryByText("Tea x2")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show bill details" }));
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Tea x2")).toBeInTheDocument();
    expect(screen.getByText("Water Bottle x2")).toBeInTheDocument();
    expect(screen.getByText("Last total ₹120.00")).toBeInTheDocument();
    expect(screen.getAllByText("₹590.00").length).toBeGreaterThan(0);
  });

  it("does not render PS5 stations in The Nine's floor", () => {
    render(
      <LiveTablePage
        counterBills={[]}
        products={[]}
        tables={[
          {
            id: "ps5_1",
            number: "PS5 1",
            gameType: "PS5",
            status: "OCCUPIED",
            hourlyRate: 250,
            currentSession: {
              id: "session_ps5",
              status: "ACTIVE",
              customerName: null,
              startedAt: "2026-07-23T10:00:00.000Z",
              plannedEndAt: "2026-07-23T11:00:00.000Z",
              elapsedSeconds: 1500,
              ps5MemberCount: 4,
              hourlyRateSnapshot: 250,
              billEstimate: 104.17,
              billSummary: {
                tableAmount: 104.17,
                categoryTotals: { FOOD: 0, CIGARETTES: 0, BEVERAGES: 0 },
                itemTotal: 0,
                grandTotal: 104.17
              },
              currentBill: null,
              assignedStaffName: "Aarav Manager"
            },
            recentBill: null
          }
        ]}
      />
    );

    expect(screen.queryByText("PS5 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Live total")).not.toBeInTheDocument();
  });

  it("does not show summary status counts", () => {
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

    expect(screen.queryByLabelText("Table status counts")).not.toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });
});

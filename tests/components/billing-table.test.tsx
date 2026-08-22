import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BillingTable } from "@/features/billing/components/billing-table";
import type { BillingRecord } from "@/features/billing/types";

describe("BillingTable", () => {
  const mockRecords: BillingRecord[] = [
    {
      id: "bill_1",
      label: "Bill 1",
      kind: "SESSION",
      status: "CLOSED",
      tableNumber: "P1",
      sessionLabel: "15 Jan → 11:30",
      openedAt: "2026-01-15T10:00:00.000Z",
      closedAt: "2026-01-15T11:30:00.000Z",
      totalAmount: 315,
      tableAmount: 175,
      itemTotal: 140,
      items: [
        { id: "item_1", name: "Tea", category: "FOOD" as const, quantity: 2, unitPrice: 30, lineTotal: 60 },
        { id: "item_2", name: "Water Bottle", category: "BEVERAGES" as const, quantity: 2, unitPrice: 20, lineTotal: 40 }
      ],
      categorySummaries: [
        { category: "FOOD" as const, total: 60 },
        { category: "BEVERAGES" as const, total: 40 }
      ],
      assignedStaffName: "Aarav Manager",
      customerName: "Riya Shah",
      customerPhone: "9876543210"
    },
    {
      id: "bill_2",
      label: "Bill 2",
      kind: "COUNTER",
      status: "OPEN",
      tableNumber: null,
      sessionLabel: null,
      openedAt: "2026-01-15T14:00:00.000Z",
      closedAt: null,
      totalAmount: 80,
      tableAmount: 0,
      itemTotal: 80,
      items: [{ id: "item_3", name: "Sandwich", category: "FOOD" as const, quantity: 1, unitPrice: 80, lineTotal: 80 }],
      categorySummaries: [{ category: "FOOD" as const, total: 80 }],
      assignedStaffName: "Riya Staff",
      customerName: null,
      customerPhone: null
    }
  ];

  it("renders table header columns", () => {
    render(<BillingTable records={mockRecords} expandedId={null} onToggle={() => {}} />);

    expect(screen.getByText("Date & Time")).toBeInTheDocument();
    expect(screen.getByText("Kind")).toBeInTheDocument();
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders bill rows with key details", () => {
    render(<BillingTable records={mockRecords} expandedId={null} onToggle={() => {}} />);

    expect(screen.getByText("Session")).toBeInTheDocument();
    expect(screen.getByText("Counter")).toBeInTheDocument();
    expect(screen.getByText("Table P1")).toBeInTheDocument();
    expect(screen.getByText("Aarav Manager")).toBeInTheDocument();
    expect(screen.getByText("Riya Staff")).toBeInTheDocument();
    expect(screen.getByText("₹315.00")).toBeInTheDocument();
    expect(screen.getByText("₹80.00")).toBeInTheDocument();
  });

  it("renders status badges correctly", () => {
    render(<BillingTable records={mockRecords} expandedId={null} onToggle={() => {}} />);

    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("shows item count and item total per row", () => {
    render(<BillingTable records={mockRecords} expandedId={null} onToggle={() => {}} />);

    expect(screen.getByText("2 items · ₹140.00")).toBeInTheDocument();
    expect(screen.getByText("1 items · ₹80.00")).toBeInTheDocument();
  });

  it("shows customer name in expanded row when expanded", () => {
    render(<BillingTable records={mockRecords} expandedId="bill_1" onToggle={() => {}} />);

    // Customer appears in expanded detail section (bold text)
    const rows = screen.getAllByText("Riya Shah");
    expect(rows.length).toBeGreaterThan(1);
    expect(screen.getByText("9876543210")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("shows item breakdown in expanded row", () => {
    render(<BillingTable records={mockRecords} expandedId="bill_1" onToggle={() => {}} />);

    expect(screen.getByText("Item Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Tea")).toBeInTheDocument();
    expect(screen.getByText("₹30.00 each")).toBeInTheDocument();
  });

  it("shows category breakdown in expanded row", () => {
    render(<BillingTable records={mockRecords} expandedId="bill_1" onToggle={() => {}} />);

    expect(screen.getByText("By Category")).toBeInTheDocument();
    // Check category summary amounts are present
    const amountElements = screen.getAllByText("₹60.00");
    expect(amountElements.length).toBe(2); // Item breakdown + category summary
  });

  it("shows walk-in when no customer name", () => {
    render(<BillingTable records={mockRecords} expandedId="bill_2" onToggle={() => {}} />);

    expect(screen.getByText("Walk-in")).toBeInTheDocument();
  });

  it("shows session label in expanded row", () => {
    render(<BillingTable records={mockRecords} expandedId="bill_1" onToggle={() => {}} />);

    expect(screen.getByText("15 Jan → 11:30")).toBeInTheDocument();
  });

  it("renders empty state when no records", () => {
    render(<BillingTable records={[]} expandedId={null} onToggle={() => {}} />);

    expect(screen.getByText("No billing records found")).toBeInTheDocument();
  });
});
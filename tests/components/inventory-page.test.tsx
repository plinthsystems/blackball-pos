import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InventoryPage } from "@/features/inventory/inventory-page";

describe("InventoryPage", () => {
  it("shows unit totals, restock dates, pack quantities and category filters", () => {
    render(
      <InventoryPage
        products={[
          { id: "c1", name: "Compact", category: "CIGARETTES", priceAmount: 12, stockOnHand: 40, stockUnit: "sticks", unitsPerPack: 10, stockUpdatedAt: "2026-11-13T08:00:00.000Z" },
          { id: "b1", name: "Water", category: "BEVERAGES", priceAmount: 20, stockOnHand: 12, stockUnit: "bottles", unitsPerPack: 6, stockUpdatedAt: null }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
    expect(screen.getAllByText("40 sticks")).toHaveLength(2);
    expect(screen.getAllByText("12 bottles")).toHaveLength(2);
    expect(screen.getByText(/4 full packs/)).toBeInTheDocument();
    expect(screen.getByText(/Not recorded/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cigarettes/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cigarettes/ }));
    expect(screen.getByText("Compact")).toBeInTheDocument();
    expect(screen.queryByText("Water")).not.toBeInTheDocument();
  });
});

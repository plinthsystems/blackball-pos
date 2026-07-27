import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MenuSettingsPage } from "@/features/settings/menu-settings-page";

describe("MenuSettingsPage", () => {
  it("renders menu products with add and update controls", () => {
    render(
      <MenuSettingsPage
        products={[
          { id: "product_1", name: "Water Bottle", category: "BEVERAGES", priceAmount: 20, active: true },
          { id: "product_2", name: "Sandwich", category: "FOOD", priceAmount: 80, active: true }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Menu Settings" })).toBeInTheDocument();
    expect(screen.getByText("Water Bottle")).toBeInTheDocument();
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Update price" })).toHaveLength(2);
  });
});

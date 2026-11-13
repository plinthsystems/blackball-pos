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

    expect(screen.getByRole("heading", { name: "Menu" })).toBeInTheDocument();
    expect(screen.getByText("Keep the counter menu quick to ring up. Price changes apply to new bills.")).toBeInTheDocument();
    expect(screen.getByText("Water Bottle")).toBeInTheDocument();
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Update price" })).toHaveLength(2);
  });

  it("keeps business profile and booking QR details out of the store settings", () => {
    render(
      <MenuSettingsPage
        products={[]}
      />
    );

    expect(screen.queryByRole("heading", { name: "Business Profile" })).not.toBeInTheDocument();
    expect(screen.queryByText("Keep your club identity clear without changing the whole software theme.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save profile" })).not.toBeInTheDocument();
    expect(screen.queryByText("Booking link (QR)")).not.toBeInTheDocument();
    expect(screen.queryByText("Customer Online Booking")).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MenuSettingsPage } from "@/features/settings/menu-settings-page";

describe("MenuSettingsPage", () => {
  it("renders menu products with add and update controls", () => {
    render(
      <MenuSettingsPage
        branding={{
          appName: "Cue City POS",
          logoInitials: "CC",
          brandColor: "#14532d",
          accentColor: "#b98922"
        }}
        products={[
          { id: "product_1", name: "Water Bottle", category: "BEVERAGES", priceAmount: 20, active: true },
          { id: "product_2", name: "Sandwich", category: "FOOD", priceAmount: 80, active: true }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Food/Menu" })).toBeInTheDocument();
    expect(screen.getByText("Manage Food, Cigarettes, and Beverages. Price changes affect only new bill items.")).toBeInTheDocument();
    expect(screen.getByText("Water Bottle")).toBeInTheDocument();
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Update price" })).toHaveLength(2);
  });

  it("renders tenant branding controls", () => {
    render(
      <MenuSettingsPage
        branding={{
          appName: "Cue City POS",
          logoInitials: "CC",
          brandColor: "#14532d",
          accentColor: "#b98922"
        }}
        products={[]}
      />
    );

    expect(screen.getByRole("heading", { name: "Branding" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cue City POS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("CC")).toBeInTheDocument();
    expect(screen.getByLabelText("Brand color")).toHaveValue("#14532d");
    expect(screen.getByRole("button", { name: "Save branding" })).toBeInTheDocument();
  });
});

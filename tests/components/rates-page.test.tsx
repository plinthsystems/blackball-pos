import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RatesPage } from "@/features/rates/components/rates-page";

describe("RatesPage", () => {
  it("renders editable hourly rates for tables and PS5", () => {
    render(
      <RatesPage
        rates={[
          { id: "r1", label: "Royal Snooker", gameType: "SNOOKER", pricingGroup: "royal", hourlyRate: 350 },
          { id: "r2", label: "Mini Snooker", gameType: "SNOOKER", pricingGroup: "mini", hourlyRate: 330 },
          { id: "r3", label: "Pool", gameType: "POOL", pricingGroup: "standard", hourlyRate: 160 },
          { id: "r4", label: "PS5 · 1 player", gameType: "PS5", pricingGroup: "players-1", hourlyRate: 100 },
          { id: "r5", label: "PS5 · 2 players", gameType: "PS5", pricingGroup: "players-2", hourlyRate: 150 },
          { id: "r6", label: "PS5 · 3 players", gameType: "PS5", pricingGroup: "players-3", hourlyRate: 200 },
          { id: "r7", label: "PS5 · 4 players", gameType: "PS5", pricingGroup: "players-4", hourlyRate: 250 }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Hourly Rates" })).toBeInTheDocument();
    expect(screen.getByText("Royal Snooker")).toBeInTheDocument();
    expect(screen.getByText("Mini Snooker")).toBeInTheDocument();
    expect(screen.getByText("Pool")).toBeInTheDocument();
    expect(screen.getByText("PS5 · 1 player")).toBeInTheDocument();
    expect(screen.getByText("PS5 · 4 players")).toBeInTheDocument();
    expect(screen.queryByText("Rate for Royal Snooker")).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Rate for Royal Snooker" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Rate for PS5 · 4 players" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Update rate" })).toHaveLength(7);
  });
});

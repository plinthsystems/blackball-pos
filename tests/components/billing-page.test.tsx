import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BillingPage } from "@/features/billing/components/billing-page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/billing",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() })
}));

describe("BillingPage", () => {
  it("renders a clear billing header and closed-bill empty state", () => {
    render(
      <BillingPage
        data={{
          records: [],
          total: 0,
          filters: {},
          staffOptions: [],
          tables: []
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Billing" })).toBeInTheDocument();
    expect(screen.getByText("Closed receipts with table time and item totals.")).toBeInTheDocument();
    expect(screen.getByText("No closed bills found")).toBeInTheDocument();
    expect(screen.queryByText("The Nine Snooker & Cafe")).not.toBeInTheDocument();
  });
});

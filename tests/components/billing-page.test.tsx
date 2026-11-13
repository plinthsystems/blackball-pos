import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BillingPage } from "@/features/billing/components/billing-page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/billing",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() })
}));

describe("BillingPage", () => {
  it("frames billing as a The Nine receipt workspace", () => {
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

    expect(screen.getByText("The Nine Snooker & Cafe")).toBeInTheDocument();
    expect(screen.getByText("Closed sales")).toBeInTheDocument();
    expect(screen.getByText("Table time")).toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("No billing records found")).toBeInTheDocument();
  });
});

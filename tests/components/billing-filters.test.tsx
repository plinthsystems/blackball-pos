import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BillingFilters } from "@/features/billing/components/billing-filters";

const { mockPush, mockSearchParams } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSearchParams: new URLSearchParams()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/billing",
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams
}));

describe("BillingFilters", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams.forEach((_value, key) => mockSearchParams.delete(key));
  });

  afterEach(() => cleanup());

  it("shows only the basic date range and bill type controls", () => {
    render(<BillingFilters />);

    expect(screen.getByRole("group", { name: "Date range" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Bill type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All time" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All bills" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table time" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Counter" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("marks the default date and bill type as selected", () => {
    render(<BillingFilters />);

    expect(screen.getByRole("button", { name: "All time" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All bills" })).toHaveAttribute("aria-pressed", "true");
  });

  it("updates the URL with the selected bill type", () => {
    render(<BillingFilters />);

    fireEvent.click(screen.getByRole("button", { name: "Table time" }));

    expect(mockPush).toHaveBeenCalledWith("/billing?kind=SESSION");
  });

  it("searches bills by customer, table or item name", () => {
    render(<BillingFilters />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search bills by name" }), { target: { value: "Riya Shah" } });
    fireEvent.click(screen.getByRole("button", { name: "Search bills" }));

    expect(mockPush).toHaveBeenCalledWith("/billing?q=Riya+Shah");
  });

  it("applies a date shortcut and retains the current bill type", () => {
    mockSearchParams.set("kind", "COUNTER");
    mockSearchParams.set("page", "3");
    render(<BillingFilters />);

    fireEvent.click(screen.getByRole("button", { name: "7 days" }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toMatch(/^\/billing\?kind=COUNTER&dateFrom=\d{4}-\d{2}-\d{2}&dateTo=\d{4}-\d{2}-\d{2}$/);
  });

  it("shows a clear action only when filters are active", () => {
    const { rerender } = render(<BillingFilters />);
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    mockSearchParams.set("kind", "COUNTER");
    rerender(<BillingFilters />);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(mockPush).toHaveBeenCalledWith("/billing");
  });
});

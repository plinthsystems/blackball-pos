import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BillingFilters } from "@/features/billing/components/billing-filters";

// Mock Next.js navigation hooks
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    usePathname: vi.fn(),
    useRouter: vi.fn(() => ({ push: vi.fn() })),
    useSearchParams: vi.fn(() => new URLSearchParams())
  };
});

describe("BillingFilters", () => {
  const staffOptions = [
    { id: "emp_1", name: "Aarav" },
    { id: "emp_2", name: "Riya" }
  ];
  const tableOptions = [
    { id: "tbl_1", number: "P1" },
    { id: "tbl_2", number: "S1" }
  ];

  it("renders all filter inputs", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    expect(screen.getByRole("button", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.queryByLabelText("Staff")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Table")).not.toBeInTheDocument();
  });

  it("shows quick kind options", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    expect(screen.getByRole("button", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Counter sales" })).toBeInTheDocument();
  });

  it("shows quick category options", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    expect(screen.getByRole("button", { name: "All categories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cigarettes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beverages" })).toBeInTheDocument();
  });

  it("keeps staff and table selection out of the quick billing bar", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    expect(screen.queryByLabelText("Staff")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Table")).not.toBeInTheDocument();
    expect(screen.queryByText("Aarav")).not.toBeInTheDocument();
  });

  it("hides staff filter for STORE_USER role", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="STORE_USER"
      />
    );

    expect(screen.queryByLabelText("Staff")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Table")).not.toBeInTheDocument();
  });

  it("hides table filter for STORE_USER role", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="STORE_USER"
      />
    );

    expect(screen.queryByLabelText("Table")).not.toBeInTheDocument();
  });

  it("shows date input fields", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    expect(screen.getByLabelText("From")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("To")).toHaveAttribute("type", "date");
  });

  it("calls router.push when filter changes", () => {
    const mockPush = vi.fn();

    // Re-import with mocked router
    vi.doMock("next/navigation", () => ({
      usePathname: vi.fn(() => "/billing"),
      useRouter: vi.fn(() => ({ push: mockPush })),
      useSearchParams: vi.fn(() => new URLSearchParams())
    }));

    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    screen.getByRole("button", { name: "Sessions" }).click();
  });
});

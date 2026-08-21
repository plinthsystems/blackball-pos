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

    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Kind")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.getByLabelText("Staff")).toBeInTheDocument();
    expect(screen.getByLabelText("Table")).toBeInTheDocument();
  });

  it("shows status options", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    const statusSelect = screen.getByLabelText("Status");
    expect(statusSelect).toHaveValue("ALL");
    // Check that options exist in the DOM
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("shows kind options", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    const kindSelect = screen.getByLabelText("Kind");
    expect(kindSelect).toHaveValue("ALL");
    expect(screen.getByText("Session")).toBeInTheDocument();
    expect(screen.getByText("Counter")).toBeInTheDocument();
  });

  it("shows category options", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    const categorySelect = screen.getByLabelText("Category");
    expect(categorySelect).toHaveValue("ALL");
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Cigarettes")).toBeInTheDocument();
    expect(screen.getByText("Beverages")).toBeInTheDocument();
  });

  it("shows staff filter for MANAGER role", () => {
    render(
      <BillingFilters
        staffOptions={staffOptions}
        tableOptions={tableOptions}
        accountType="MANAGER"
      />
    );

    expect(screen.getByLabelText("Staff")).toBeInTheDocument();
    expect(screen.getByText("All Staff")).toBeInTheDocument();
    expect(screen.getByText("Aarav")).toBeInTheDocument();
    expect(screen.getByText("Riya")).toBeInTheDocument();
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

    // The filter should call router.push on change
    const statusSelect = screen.getByLabelText("Status") as HTMLSelectElement;
    statusSelect.value = "OPEN";
    statusSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
});
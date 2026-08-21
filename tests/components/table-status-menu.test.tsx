import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TableStatusMenu } from "@/features/live-tables/components/table-status-menu";
import type { LiveTableCardData } from "@/features/live-tables/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}));

const mockUpdateStatus = vi.fn();

vi.mock("@/features/live-tables/actions", () => ({
  updateTableStatusAction: vi.fn((input: unknown) => mockUpdateStatus(input))
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} data-testid="status-button" />
  )
}));

function buildTable(overrides?: Partial<LiveTableCardData>) {
  return {
    id: "table_1",
    number: "P1",
    gameType: "POOL" as const,
    status: "AVAILABLE" as const,
    hourlyRate: 160,
    currentSession: null,
    recentBill: null,
    ...overrides
  };
}

describe("TableStatusMenu", () => {
  afterEach(() => {
    mockUpdateStatus.mockReset();
  });

  it("renders null when canUpdateStatus is false", () => {
    const table = buildTable();
    const { container } = render(<TableStatusMenu table={table} canUpdateStatus={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the status button when canUpdateStatus is true", () => {
    const table = buildTable();
    render(<TableStatusMenu table={table} canUpdateStatus />);
    expect(screen.getByTestId("status-button")).toBeInTheDocument();
  });

  it("shows menu options when button is clicked", async () => {
    const table = buildTable();
    render(<TableStatusMenu table={table} canUpdateStatus />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("status-button"));
    expect(screen.getByText("Manual status override")).toBeInTheDocument();
  });

  it("excludes current status from menu options", async () => {
    const table = buildTable({ status: "AVAILABLE" });
    render(<TableStatusMenu table={table} canUpdateStatus />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("status-button"));
    expect(screen.getByText("Reserved")).toBeInTheDocument();
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
  });

  it("calls updateTableStatusAction when a status is selected", async () => {
    mockUpdateStatus.mockResolvedValue({ ok: true, message: "Updated" });
    const table = buildTable({ status: "AVAILABLE" });
    render(<TableStatusMenu table={table} canUpdateStatus />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("status-button"));
    await user.click(screen.getByText("Reserved"));
    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith({ tableId: "table_1", status: "RESERVED" });
    });
  });

  it("shows error message when update fails", async () => {
    mockUpdateStatus.mockResolvedValue({ ok: false, message: "Failed to update status" });
    const table = buildTable({ status: "AVAILABLE" });
    render(<TableStatusMenu table={table} canUpdateStatus />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("status-button"));
    await user.click(screen.getByText("Reserved"));
    await waitFor(() => {
      expect(screen.getByText("Failed to update status")).toBeInTheDocument();
    });
  });

  it("closes menu after selecting a store", async () => {
    const table = buildTable();
    render(<TableStatusMenu table={table} canUpdateStatus />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("status-button"));
    expect(screen.getByText("Manual status override")).toBeInTheDocument();
    // Click the button again to close
    await user.click(screen.getByTestId("status-button"));
    expect(screen.queryByText("Manual status override")).not.toBeInTheDocument();
  });

  it("handles MAINTENANCE status correctly", async () => {
    const table = buildTable({ status: "MAINTENANCE" });
    render(<TableStatusMenu table={table} canUpdateStatus />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("status-button"));
    expect(screen.queryByText(/Maintenance/)).not.toBeInTheDocument();
    expect(screen.getByText(/Available/)).toBeInTheDocument();
  });

  it("handles BLOCKED status correctly", async () => {
    const table = buildTable({ status: "BLOCKED" });
    render(<TableStatusMenu table={table} canUpdateStatus />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("status-button"));
    expect(screen.queryByText(/Blocked/)).not.toBeInTheDocument();
    expect(screen.getByText(/Available/)).toBeInTheDocument();
  });

  it("handles CLEANING status correctly", async () => {
    const table = buildTable({ status: "CLEANING" });
    render(<TableStatusMenu table={table} canUpdateStatus />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("status-button"));
    expect(screen.queryByText(/Cleaning/)).not.toBeInTheDocument();
    expect(screen.getByText(/Available/)).toBeInTheDocument();
  });
});
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpensePageData } from "@/features/expenses/types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  createExpense: vi.fn()
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }) }));
vi.mock("@/features/expenses/actions", () => ({ createExpenseAction: mocks.createExpense }));

import { ExpensesPage } from "@/features/expenses/components/expenses-page";

const data: ExpensePageData = {
  records: [],
  count: 0,
  totalAmount: 0,
  cashAmount: 0,
  upiAmount: 0,
  filters: { period: "30d", category: "ALL" }
};

describe("ExpensesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createExpense.mockResolvedValue({ ok: true, message: "Expense saved." });
  });

  it("records cash or UPI expenses without a stock link", () => {
    render(<ExpensesPage data={data} products={[]} />);
    expect(screen.getByRole("heading", { name: "Expenses" })).toBeInTheDocument();
    expect(screen.getByText("No expenses in this period")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add expense" }));
    expect(screen.getByRole("dialog", { name: "Add expense" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Paid by/ })).toHaveValue("CASH");
  });

  it("submits a tracked inventory purchase with pack count and stock amount", async () => {
    render(<ExpensesPage data={data} products={[{ id: "cola", name: "Coca-Cola 330 ml", category: "BEVERAGES", stockUnit: "bottles", unitsPerPack: 24 }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add expense" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), { target: { value: "INVENTORY_PURCHASE" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Restock tracked item" }), { target: { value: "cola" } });
    fireEvent.change(screen.getByLabelText("Line amount (₹)"), { target: { value: "700" } });
    fireEvent.change(screen.getByLabelText(/Packs \/ boxes/), { target: { value: "2" } });
    expect(screen.getByText("Adds 48 bottles")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() => expect(mocks.createExpense).toHaveBeenCalledWith(expect.objectContaining({
      category: "INVENTORY_PURCHASE",
      paymentMethod: "CASH",
      items: [{ description: "Coca-Cola 330 ml", amount: 700, productId: "cola", packs: 2 }]
    })));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  });
});

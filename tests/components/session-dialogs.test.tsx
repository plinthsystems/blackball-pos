import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StartWalkInDialog } from "@/features/sessions/components/start-walk-in-dialog";
import { StartCounterBillDialog } from "@/features/sessions/components/start-counter-bill-dialog";

const actions = vi.hoisted(() => ({
  startCounterBillAction: vi.fn()
}));

vi.mock("@/features/live-tables/actions", () => ({
  startCounterBillAction: actions.startCounterBillAction,
  startWalkInSessionAction: vi.fn()
}));

describe("StartWalkInDialog", () => {
  it("shows validation feedback for missing required fields", async () => {
    const user = userEvent.setup();

    render(<StartWalkInDialog tableId="table_1" tableNumber="P1" open onOpenChange={() => undefined} />);
    await user.click(screen.getByRole("button", { name: "Start session" }));

    expect(screen.getByText("Choose a duration.")).toBeInTheDocument();
  });

  it("shows PS5 member choices and a rate preview", async () => {
    const user = userEvent.setup();

    render(<StartWalkInDialog tableId="ps5_1" tableNumber="PS5 1" gameType="PS5" hourlyRate={100} open onOpenChange={() => undefined} />);

    await user.selectOptions(screen.getByLabelText("Members"), "4");

    expect(screen.getByText("PS5 rate: ₹250.00/hr")).toBeInTheDocument();
  });
});

describe("StartCounterBillDialog", () => {
  beforeEach(() => {
    actions.startCounterBillAction.mockReset();
    actions.startCounterBillAction.mockResolvedValue({ ok: true, message: "Counter bill started." });
  });

  it("submits the bill when the Start bill button is clicked", async () => {
    const user = userEvent.setup();

    render(<StartCounterBillDialog />);
    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    const labelInput = screen.getByLabelText("Bill label");
    await user.type(labelInput, "Food parcel");
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    expect(actions.startCounterBillAction).toHaveBeenCalledWith({ label: "Food parcel" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Start bill" })).not.toBeInTheDocument());
  });

  it("submits an empty label when the Start bill button is clicked", async () => {
    const user = userEvent.setup();

    render(<StartCounterBillDialog />);
    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    expect(actions.startCounterBillAction).toHaveBeenCalledWith({ label: "" });
  });

  it("closes when the Cancel button is clicked", async () => {
    const user = userEvent.setup();

    render(<StartCounterBillDialog />);
    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

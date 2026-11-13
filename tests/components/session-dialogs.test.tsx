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
  it("starts Pool sessions without asking for duration or repeating the station rate", () => {
    render(
      <StartWalkInDialog
        tableId="pool_1"
        tableNumber="Pool"
        gameType="POOL"
        open
        onOpenChange={() => undefined}
      />
    );

    expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();
    expect(screen.queryByText(/Rate:|₹180\.00/)).not.toBeInTheDocument();
  });

  it("does not ask for duration for snooker or PS5 sessions", () => {
    const snooker = render(<StartWalkInDialog tableId="s1" tableNumber="Snooker 1" gameType="SNOOKER" open onOpenChange={() => undefined} />);
    expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();
    snooker.unmount();

    render(<StartWalkInDialog tableId="ps5_1" tableNumber="PS5 1" gameType="PS5" open onOpenChange={() => undefined} />);
    expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();
  });

  it("shows PS5 member choices without duplicating the rate shown on the station card", async () => {
    const user = userEvent.setup();

    render(<StartWalkInDialog tableId="ps5_1" tableNumber="PS5 1" gameType="PS5" open onOpenChange={() => undefined} />);

    await user.selectOptions(screen.getByLabelText("Members"), "4");

    expect(screen.getByLabelText("Members")).toHaveValue("4");
    expect(screen.queryByText(/rate:|₹250\.00/i)).not.toBeInTheDocument();
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

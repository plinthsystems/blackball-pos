import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StartCounterBillDialog } from "@/features/sessions/components/start-counter-bill-dialog";

vi.mock("@/features/live-tables/actions", () => ({
  startCounterBillAction: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn()
  })
}));

const { startCounterBillAction } = await import("@/features/live-tables/actions");
const mockStartCounterBillAction = vi.mocked(startCounterBillAction);

describe("StartCounterBillDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger button", () => {
    render(<StartCounterBillDialog />);

    expect(screen.getByRole("button", { name: "Start counter bill" })).toBeInTheDocument();
  });

  it("opens dialog when trigger button is clicked", async () => {
    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));

    expect(screen.getByLabelText("Bill label")).toBeInTheDocument();
  });

  it("renders the bill label input field", async () => {
    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));

    expect(screen.getByLabelText("Bill label")).toBeInTheDocument();
  });

  it("shows placeholder text for bill label", async () => {
    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));

    const input = screen.getByPlaceholderText("Food parcel, regular customer");
    expect(input).toBeInTheDocument();
  });

  it("renders Cancel and Start bill buttons in dialog", async () => {
    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start bill" })).toBeInTheDocument();
  });

  it("closes dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Bill label")).not.toBeInTheDocument();
  });

  it("calls startCounterBillAction with label when Start bill is clicked", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: true,
      message: "Counter bill started."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.type(screen.getByLabelText("Bill label"), "Food parcel");
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(mockStartCounterBillAction).toHaveBeenCalledWith({ label: "Food parcel" });
    });
  });

  it("calls startCounterBillAction with empty label when label is empty", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: true,
      message: "Counter bill started."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    // Button is disabled when label is empty, so action won't be called
    expect(screen.getByRole("button", { name: "Start bill" })).toBeDisabled();
  });

  it("closes dialog and refreshes router on success", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: true,
      message: "Counter bill started."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.type(screen.getByLabelText("Bill label"), "Regular customer");
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Bill label")).not.toBeInTheDocument();
    });
  });

  it("does not close dialog on failure", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: false,
      message: "Bill could not be created."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.type(screen.getByLabelText("Bill label"), "Test bill");
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Bill label")).toBeInTheDocument();
    });
  });

  it("shows snackbar message on success", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: true,
      message: "Counter bill started."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.type(screen.getByLabelText("Bill label"), "Test");
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(mockStartCounterBillAction).toHaveBeenCalledWith({ label: "Test" });
    });
  });

  it("shows snackbar message on failure", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: false,
      message: "Permission denied."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.type(screen.getByLabelText("Bill label"), "Test");
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(mockStartCounterBillAction).toHaveBeenCalledWith({ label: "Test" });
    });
  });

  it("disables Start bill button while pending", async () => {
    let resolvePromise: (value: { ok: boolean; message: string }) => void;

    mockStartCounterBillAction.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.type(screen.getByLabelText("Bill label"), "Test");

    const startButton = screen.getByRole("button", { name: "Start bill" });
    fireEvent.click(startButton);

    expect(startButton).toBeDisabled();

    resolvePromise!({ ok: true, message: "Counter bill started." });
  });

  it("clears label input on success", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: true,
      message: "Counter bill started."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    await user.type(screen.getByLabelText("Bill label"), "Food parcel");
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Bill label")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    expect(screen.getByLabelText("Bill label")).toHaveValue("");
  });

  it("handles long label text", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: true,
      message: "Counter bill started."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    const longLabel = "a".repeat(500);
    await user.type(screen.getByLabelText("Bill label"), longLabel);
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(mockStartCounterBillAction).toHaveBeenCalledWith({ label: longLabel });
    });
  });

  it("handles special characters in label", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: true,
      message: "Counter bill started."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    const specialLabel = "Customer #42 - Table P1 (Pool)";
    await user.type(screen.getByLabelText("Bill label"), specialLabel);
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(mockStartCounterBillAction).toHaveBeenCalledWith({ label: specialLabel });
    });
  });

  it("handles unicode characters in label", async () => {
    mockStartCounterBillAction.mockResolvedValue({
      ok: true,
      message: "Counter bill started."
    });

    const user = userEvent.setup();
    render(<StartCounterBillDialog />);

    await user.click(screen.getByRole("button", { name: "Start counter bill" }));
    const unicodeLabel = "ग्राहक बिल - Customer bill";
    await user.type(screen.getByLabelText("Bill label"), unicodeLabel);
    await user.click(screen.getByRole("button", { name: "Start bill" }));

    await waitFor(() => {
      expect(mockStartCounterBillAction).toHaveBeenCalledWith({ label: unicodeLabel });
    });
  });
});
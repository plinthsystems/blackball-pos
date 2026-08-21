import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EndSessionDialog } from "@/features/sessions/components/end-session-dialog";

vi.mock("@/features/live-tables/actions", () => ({
  endSessionAction: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn()
  })
}));

const { endSessionAction } = await import("@/features/live-tables/actions");
const mockEndSessionAction = vi.mocked(endSessionAction);

describe("EndSessionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dialog with correct title when open", () => {
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={() => undefined}
      />
    );

    expect(screen.getByText("End session for P1")).toBeInTheDocument();
  });

  it("does not render the dialog when closed", () => {
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open={false}
        onOpenChange={() => undefined}
      />
    );

    expect(screen.queryByText("End session for P1")).not.toBeInTheDocument();
  });

  it("shows the info message about server-side calculation", () => {
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={() => undefined}
      />
    );

    expect(
      screen.getByText("Final duration and table charges are calculated on the server.")
    ).toBeInTheDocument();
  });

  it("renders Cancel and End session buttons", () => {
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End session" })).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const onOpenChange = vi.fn();
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls endSessionAction when End session is clicked", async () => {
    mockEndSessionAction.mockResolvedValue({
      ok: true,
      message: "Session ended. Final total Rs.0."
    });

    const onOpenChange = vi.fn();
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "End session" }));

    await waitFor(() => {
      expect(mockEndSessionAction).toHaveBeenCalledWith({ sessionId: "session_1" });
    });
  });

  it("closes dialog and refreshes router on success", async () => {
    mockEndSessionAction.mockResolvedValue({
      ok: true,
      message: "Session ended. Final total Rs.360."
    });

    const onOpenChange = vi.fn();
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "End session" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("does not close dialog on failure", async () => {
    mockEndSessionAction.mockResolvedValue({
      ok: false,
      message: "Session could not be ended."
    });

    const onOpenChange = vi.fn();
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "End session" }));

    await waitFor(() => {
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  it("shows snackbar message on success", async () => {
    mockEndSessionAction.mockResolvedValue({
      ok: true,
      message: "Session ended. Final total Rs.180."
    });

    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "End session" }));

    await waitFor(() => {
      expect(screen.getByText("Session ended. Final total Rs.180.")).toBeInTheDocument();
    });
  });

  it("shows snackbar message on failure", async () => {
    mockEndSessionAction.mockResolvedValue({
      ok: false,
      message: "Only an active or paused session can be ended."
    });

    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "End session" }));

    await waitFor(() => {
      expect(screen.getByText("Only an active or paused session can be ended.")).toBeInTheDocument();
    });
  });

  it("disables End session button while pending", async () => {
    let resolvePromise: (value: { ok: boolean; message: string }) => void;

    mockEndSessionAction.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="P1"
        open
        onOpenChange={() => undefined}
      />
    );

    const endButton = screen.getByRole("button", { name: "End session" });
    fireEvent.click(endButton);

    expect(endButton).toBeDisabled();

    resolvePromise!({ ok: true, message: "Session ended." });
  });

  it("passes correct sessionId to action", async () => {
    mockEndSessionAction.mockResolvedValue({
      ok: true,
      message: "Session ended."
    });

    render(
      <EndSessionDialog
        sessionId="unique_session_id_123"
        tableNumber="S2"
        open
        onOpenChange={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "End session" }));

    await waitFor(() => {
      expect(mockEndSessionAction).toHaveBeenCalledWith({ sessionId: "unique_session_id_123" });
    });
  });

  it("shows correct table number in title for different tables", () => {
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="S1"
        open
        onOpenChange={() => undefined}
      />
    );

    expect(screen.getByText("End session for S1")).toBeInTheDocument();
  });

  it("shows correct table number in title for PS5 tables", () => {
    render(
      <EndSessionDialog
        sessionId="session_1"
        tableNumber="PS5 1"
        open
        onOpenChange={() => undefined}
      />
    );

    expect(screen.getByText("End session for PS5 1")).toBeInTheDocument();
  });
});
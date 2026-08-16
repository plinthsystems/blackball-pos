import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast, type ToastTone } from "@/components/ui/toast";

const LONG_TOAST_MESSAGE =
  "This is a deliberately long toast message that keeps going far beyond any single line " +
  "so we can verify the layout wraps the full text on multiple lines instead of clipping or " +
  "truncating it for the manager reading the notification tray.";

function Harness({ tone }: { tone?: ToastTone }) {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.show({ message: "First toast" })}>Show first</button>
      <button type="button" onClick={() => toast.show({ message: "Second toast" })}>Show second</button>
      <button type="button" onClick={() => toast.show({ message: "Danger toast", tone: "danger" })}>Show danger</button>
      <button type="button" onClick={() => toast.show({ message: "Short toast", durationMs: 250 })}>Show short</button>
      <button type="button" onClick={() => toast.show({ message: "Themed toast", tone })}>Show themed</button>
      <button type="button" onClick={() => toast.show({ message: LONG_TOAST_MESSAGE })}>Show long</button>
    </div>
  );
}

function renderWithProvider(tone?: ToastTone) {
  return render(<ToastProvider><Harness tone={tone} /></ToastProvider>);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("toast system", () => {
  it("shows a toast with the message and a dismiss button", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Show first" }));

    expect(screen.getByText("First toast")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  });

  it("auto-hides a toast after its duration expires", () => {
    vi.useFakeTimers();
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show short" }));
    expect(screen.getByText("Short toast")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250 + 185);
    });

    expect(screen.queryByText("Short toast")).not.toBeInTheDocument();
  });

  it("keeps a toast visible until the default duration expires", () => {
    vi.useFakeTimers();
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show first" }));
    expect(screen.getByText("First toast")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByText("First toast")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1 + 185);
    });
    expect(screen.queryByText("First toast")).not.toBeInTheDocument();
  });

  it("dismisses when the close button is clicked, playing the exit animation first", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Show first" }));

    const card = screen.getByRole("status");
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    // Still in the DOM while the exit animation runs.
    expect(card.closest(".toast-exit")).not.toBeNull();
    expect(screen.getByText("First toast")).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText("First toast")).not.toBeInTheDocument());
  });

  it("stacks multiple toasts with the newest on top", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Show first" }));
    await user.click(screen.getByRole("button", { name: "Show second" }));

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toHaveTextContent("Second toast");
    expect(statuses[1]).toHaveTextContent("First toast");
  });

  it("dismisses the topmost toast when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Show first" }));
    await user.click(screen.getByRole("button", { name: "Show second" }));
    expect(screen.getAllByRole("status")).toHaveLength(2);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Second toast")).not.toBeInTheDocument());
    expect(screen.getByText("First toast")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("First toast")).not.toBeInTheDocument());
  });

  it("renders danger toasts with role alert", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Show danger" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Danger toast");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("pauses the auto-hide timer while hovered and resumes after", () => {
    vi.useFakeTimers();
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show short" }));

    const card = screen.getByRole("status");
    fireEvent.mouseEnter(card);
    act(() => {
      // Hovering longer than the remaining lifetime should freeze the countdown.
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("Short toast")).toBeInTheDocument();

    fireEvent.mouseLeave(card);
    act(() => {
      vi.advanceTimersByTime(250 + 185);
    });
    expect(screen.queryByText("Short toast")).not.toBeInTheDocument();
  });

  it("does not throw when used outside a provider", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Show first" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([
    ["neutral", "info", "border-outline", "status"],
    ["success", "check_circle", "border-lime-300/40", "status"],
    ["danger", "error", "border-rose-400/40", "alert"]
  ] as const)("renders the %s tone with its icon and tone styling", async (tone, icon, toneClass, role) => {
    const user = userEvent.setup();
    renderWithProvider(tone);

    await user.click(screen.getByRole("button", { name: "Show themed" }));

    const card = screen.getByRole(role);
    expect(card).toHaveTextContent("Themed toast");
    expect(card).toHaveClass(toneClass);
    expect(card.querySelector(".material-symbols-outlined")).toHaveTextContent(icon);
  });

  it("keeps visible toasts across a provider re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Show first" }));
    expect(screen.getByText("First toast")).toBeInTheDocument();

    rerender(<ToastProvider><div>Replaced page content</div></ToastProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("First toast");
  });

  it("renders long messages in full instead of truncating them", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Show long" }));

    const card = screen.getByRole("status");
    expect(card).toHaveTextContent(LONG_TOAST_MESSAGE);
    expect(card.querySelector("p")).not.toHaveClass("truncate", "line-clamp-1");
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "@/components/ui/dialog";

function TestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <>
      <button type="button">Outside</button>
      <Dialog open={open} title="Test dialog" onOpenChange={onOpenChange}>
        <button type="button">Inside</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<TestDialog open onOpenChange={onOpenChange} />);
    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes when the backdrop is pressed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<TestDialog open onOpenChange={onOpenChange} />);
    const panel = screen.getByRole("dialog");
    const backdrop = panel.parentElement!;
    await user.pointer({ keys: "[MouseLeft>]", target: backdrop });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("focuses the first focusable element on open", async () => {
    render(<TestDialog open onOpenChange={() => undefined} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus());
  });

  it("traps focus inside the dialog while open", async () => {
    const user = userEvent.setup();

    render(<TestDialog open onOpenChange={() => undefined} />);
    const closeButton = screen.getByRole("button", { name: "Close dialog" });
    const insideButton = screen.getByRole("button", { name: "Inside" });

    await waitFor(() => expect(closeButton).toHaveFocus());
    await user.tab();
    expect(insideButton).toHaveFocus();
    // Tab at the last focusable wraps back to the first.
    await user.tab();
    expect(closeButton).toHaveFocus();
    // Shift-tab at the first focusable wraps to the last.
    await user.tab({ shift: true });
    expect(insideButton).toHaveFocus();
  });

  it("locks body scroll while open and restores it after close", () => {
    const { rerender } = render(<TestDialog open onOpenChange={() => undefined} />);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<TestDialog open={false} onOpenChange={() => undefined} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores focus to the previously focused element after close", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TestDialog open={false} onOpenChange={() => undefined} />);

    const outsideButton = screen.getByRole("button", { name: "Outside" });
    await user.click(outsideButton);
    expect(outsideButton).toHaveFocus();

    rerender(<TestDialog open onOpenChange={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus());

    rerender(<TestDialog open={false} onOpenChange={() => undefined} />);
    await waitFor(() => expect(outsideButton).toHaveFocus());
  });
});

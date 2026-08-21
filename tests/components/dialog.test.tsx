import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  it("closes when the backdrop is pressed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<TestDialog open onOpenChange={onOpenChange} />);
    const panel = screen.getByRole("dialog");
    const backdrop = panel.parentElement!;
    await user.pointer({ keys: "[MouseLeft>]", target: backdrop });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders children only while the dialog is open", () => {
    const { rerender } = render(<TestDialog open={false} onOpenChange={() => undefined} />);
    expect(screen.queryByRole("button", { name: "Inside" })).not.toBeInTheDocument();

    rerender(<TestDialog open onOpenChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();

    rerender(<TestDialog open={false} onOpenChange={() => undefined} />);
    expect(screen.queryByRole("button", { name: "Inside" })).not.toBeInTheDocument();
  });

  it("renders children only while the dialog is open", () => {
    const { rerender } = render(<TestDialog open={false} onOpenChange={() => undefined} />);
    expect(screen.queryByRole("button", { name: "Inside" })).not.toBeInTheDocument();

    rerender(<TestDialog open onOpenChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();

    rerender(<TestDialog open={false} onOpenChange={() => undefined} />);
    expect(screen.queryByRole("button", { name: "Inside" })).not.toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<TestDialog open onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders nothing and never calls onOpenChange while closed", () => {
    const onOpenChange = vi.fn();

    render(<TestDialog open={false} onOpenChange={onOpenChange} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Test dialog" })).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("exposes dialog semantics on the panel", () => {
    render(<TestDialog open onOpenChange={() => undefined} />);

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(panel).toHaveAttribute("aria-label", "Test dialog");
  });

  it("submits an inner form when Enter is pressed in a text input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <Dialog open title="Rename table" onOpenChange={() => undefined}>
        <form onSubmit={onSubmit}>
          <input aria-label="New name" />
          <Button type="submit">Rename</Button>
        </form>
      </Dialog>
    );

    await user.type(screen.getByLabelText("New name"), "Table P1");
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

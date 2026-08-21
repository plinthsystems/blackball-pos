import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children and defaults to type=button", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it.each([
    ["primary", "bg-lime-400"],
    ["secondary", "bg-slate-950"],
    ["danger", "bg-rose-500"],
    ["ghost", "bg-transparent"]
  ] as const)("applies the %s variant styles", (variant, styleClass) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass(styleClass);
  });

  it("passes through an explicit type such as submit", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute("type", "submit");
  });

  it("submits the enclosing form when type=submit is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <input aria-label="Name" />
        <Button type="submit">Create</Button>
      </form>
    );

    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("is disabled and does not fire onClick when the disabled prop is set", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Add item</Button>);
    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders an icon beside the children", () => {
    render(
      <Button icon={<span data-testid="icon" aria-hidden="true">+</span>}>Add item</Button>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add item" })).toHaveTextContent("Add item");
  });

  it("merges a custom className with the base styles", () => {
    render(<Button className="w-full">Wide</Button>);
    const button = screen.getByRole("button", { name: "Wide" });
    expect(button).toHaveClass("w-full", "h-10");
  });
});

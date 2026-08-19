import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MenuGroup } from "@/components/ui/menu";

describe("MenuGroup", () => {
  it("renders its children", () => {
    render(
      <MenuGroup>
        <button type="button">Item A</button>
        <button type="button">Item B</button>
      </MenuGroup>
    );
    expect(screen.getByRole("button", { name: "Item A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Item B" })).toBeInTheDocument();
  });

  it("renders an empty container when given no visible children", () => {
    const { container } = render(<MenuGroup>{null}</MenuGroup>);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toBeEmptyDOMElement();
  });
});

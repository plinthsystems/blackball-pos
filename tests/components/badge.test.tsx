import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders its children as the label", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("uses the neutral tone by default", () => {
    render(<Badge>Neutral</Badge>);
    const badge = screen.getByText("Neutral");
    expect(badge).toHaveClass("border-slate-600", "bg-slate-800", "text-slate-200");
  });

  it.each([
    ["success", "border-lime-300/40", "bg-lime-300/10", "text-lime-200"],
    ["warning", "border-amber-300/40", "bg-amber-300/10", "text-amber-200"],
    ["danger", "border-rose-300/40", "bg-rose-400/10", "text-rose-200"],
    ["info", "border-cyan-300/40", "bg-cyan-300/10", "text-cyan-200"]
  ] as const)("maps the %s tone to its badge classes", (tone, border, bg, text) => {
    render(<Badge tone={tone}>Tone</Badge>);
    const badge = screen.getByText("Tone");
    expect(badge).toHaveClass(border, bg, text);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminShell } from "@/components/app/admin-shell";

describe("AdminShell", () => {
  it("renders a branded shell without redundant operations copy", () => {
    render(
      <AdminShell>
        <div>Content</div>
      </AdminShell>
    );

    expect(screen.getAllByText("BlackBall POS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BB").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
  });
});

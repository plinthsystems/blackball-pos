import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminShell } from "@/components/app/admin-shell";

describe("AdminShell", () => {
  it("renders a branded shell without redundant operations copy", () => {
    render(
      <AdminShell
        tenantBranding={{
          appName: "Cue City POS",
          logoInitials: "CC",
          businessName: "Cue City Sports",
          brandColor: "#14532d",
          accentColor: "#b98922"
        }}
        account={{
          name: "Ravi Manager",
          accountType: "MANAGER",
          permissions: ["dashboard.read", "tables.read", "products.manage", "rates.manage"]
        }}
      >
        <div>Content</div>
      </AdminShell>
    );

    expect(screen.getAllByText("Cue City POS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CC").length).toBeGreaterThan(0);
    expect(screen.queryByText("BlackBall POS")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
  });

  it("shows only live floor navigation to store users without manager permissions", () => {
    render(
      <AdminShell
        tenantBranding={{
          appName: "Rack House",
          logoInitials: "RH",
          businessName: "Rack House",
          brandColor: "#12613d",
          accentColor: "#b98922"
        }}
        account={{
          name: "Store User",
          accountType: "STORE_USER",
          permissions: ["tables.read"]
        }}
      >
        <div>Content</div>
      </AdminShell>
    );

    expect(screen.getByRole("link", { name: /Live Floor/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Dashboard/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Rates/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Food\/Menu/ })).not.toBeInTheDocument();
    expect(screen.getByText("Store User")).toBeInTheDocument();
  });
});

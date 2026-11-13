import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(screen.getByRole("img", { name: "The Nine logo" })).toBeInTheDocument();
    expect(screen.queryByText("Cue City Sports")).not.toBeInTheDocument();
    expect(screen.queryByText("BlackBall POS")).not.toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Admin navigation" })).getByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Change Password/ })).toBeInTheDocument();
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

    const nav = within(screen.getByRole("navigation", { name: "Admin navigation" }));
    expect(nav.getByRole("link", { name: /Live Floor/ })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: /Billing/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Change Password/ })).not.toBeInTheDocument();
    expect(nav.queryByRole("link", { name: /Dashboard/ })).not.toBeInTheDocument();
    expect(nav.queryByRole("link", { name: /Rates/ })).not.toBeInTheDocument();
    expect(nav.queryByRole("link", { name: /Food\/Menu/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Store")).not.toBeInTheDocument();
  });

  it("shows the focused admin navigation for The Nine admins", () => {
    render(
      <AdminShell
        account={{ name: "The Nine Admin", accountType: "STORE_OWNER", permissions: [] }}
      >
        <div>Content</div>
      </AdminShell>
    );

    const nav = within(screen.getByRole("navigation", { name: "Admin navigation" }));
    expect(nav.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: /Live Floor/ })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: /Billing/ })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: "Menu" })).toBeInTheDocument();
    expect(nav.queryByRole("link", { name: /Rates/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Franchise HQ/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Platform Setup/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Admin", { exact: true })).not.toBeInTheDocument();
  });

  it("shows Franchise HQ link for HQ admins", () => {
    render(
      <AdminShell
        account={{
          name: "HQ Director",
          accountType: "HQ_ADMIN",
          permissions: ["hq.dashboard.read", "dashboard.read"]
        }}
      >
        <div>Content</div>
      </AdminShell>
    );

    expect(within(screen.getByRole("navigation", { name: "Admin navigation" })).getByRole("link", { name: /Franchise HQ/ })).toBeInTheDocument();
  });

  it("shows platform setup navigation for platform admins", () => {
    render(
      <AdminShell
        account={{
          name: "Platform Owner",
          accountType: "PLATFORM_ADMIN",
          permissions: ["platform.setup.manage", "dashboard.read"]
        }}
      >
        <div>Content</div>
      </AdminShell>
    );

    expect(within(screen.getByRole("navigation", { name: "Admin navigation" })).getByRole("link", { name: /Platform Setup/ })).toBeInTheDocument();
    expect(screen.queryByText("Platform Admin")).not.toBeInTheDocument();
  });

  it("labels the account pill correctly for every account type", () => {
    const { rerender } = render(
      <AdminShell account={{ name: "Manager", accountType: "MANAGER", permissions: [] }}>
        <div>Content</div>
      </AdminShell>
    );
    expect(screen.queryByText("Store Manager")).not.toBeInTheDocument();

    rerender(
      <AdminShell account={{ name: "Owner", accountType: "STORE_OWNER", permissions: [] }}>
        <div>Content</div>
      </AdminShell>
    );
    expect(screen.queryByText("Admin", { exact: true })).not.toBeInTheDocument();

    rerender(
      <AdminShell account={{ name: "HQ Director", accountType: "HQ_ADMIN", permissions: ["hq.dashboard.read"] }}>
        <div>Content</div>
      </AdminShell>
    );
    expect(screen.queryByText("Franchise HQ Director")).not.toBeInTheDocument();
  });

  it("renders the store switcher when the organization has stores", () => {
    render(
      <AdminShell
        account={{ name: "Legacy Manager", accountType: "MANAGER", permissions: [] }}
        organization={{
          id: "org1",
          name: "BlackBall Franchise",
          type: "FRANCHISE",
          businesses: [{ id: "b1", name: "BlackBall Koramangala", slug: "seed-business" }]
        }}
        businessId="b1"
      >
        <div>Main content</div>
      </AdminShell>
    );

    expect(screen.getByText("BlackBall Koramangala")).toBeInTheDocument();
    expect(screen.getByText("Main content")).toBeInTheDocument();
  });

  it("omits the store switcher without an organization or with zero stores", () => {
    const { rerender } = render(
      <AdminShell>
        <div>Main content</div>
      </AdminShell>
    );
    expect(screen.queryByText("BlackBall Koramangala")).not.toBeInTheDocument();

    rerender(
      <AdminShell
        organization={{ id: "org1", name: "BlackBall Franchise", type: "FRANCHISE", businesses: [] }}
        businessId="b1"
      >
        <div>Main content</div>
      </AdminShell>
    );
    expect(screen.queryByText("BlackBall Koramangala")).not.toBeInTheDocument();
  });
});

describe("AdminShell sign-out flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("location", { href: "http://localhost/dashboard" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to the logout endpoint and redirects to /login", async () => {
    const user = userEvent.setup();
    render(
      <AdminShell>
        <div>Main content</div>
      </AdminShell>
    );

    await user.click(within(screen.getByRole("navigation", { name: "Store navigation" })).getByRole("button", { name: /Logout/ }));

    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(window.location.href).toBe("/login");
  });
});

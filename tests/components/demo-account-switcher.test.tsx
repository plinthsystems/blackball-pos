import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoAccountSwitcher } from "@/components/app/demo-account-switcher";

let locationStub: { href: string };

beforeEach(() => {
  locationStub = { href: "http://localhost/login" };
  vi.stubGlobal("location", locationStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "demo_user_email=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "demo_store_slug=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

describe("DemoAccountSwitcher", () => {
  it("shows the persona matching the current email on the trigger", () => {
    render(<DemoAccountSwitcher currentEmail="owner@cueclub.example" />);

    expect(screen.getByRole("button")).toHaveTextContent("Persona: Rahul Sharma");
  });

  it("falls back to the first demo account when the email is unknown or missing", () => {
    const { rerender } = render(<DemoAccountSwitcher currentEmail="nobody@unknown.example" />);
    expect(screen.getByRole("button")).toHaveTextContent("Persona: Vikram Malhotra");

    rerender(<DemoAccountSwitcher />);
    expect(screen.getByRole("button")).toHaveTextContent("Persona: Vikram Malhotra");
  });

  it("opens the menu with all three demo account sections", async () => {
    const user = userEvent.setup();
    render(<DemoAccountSwitcher />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Franchise HQ Directors")).toBeInTheDocument();
    expect(screen.getByText("Franchise Outlet Managers")).toBeInTheDocument();
    expect(screen.getByText("Independent SaaS Club Owners")).toBeInTheDocument();
    // Trigger shows the default first account, so Vikram Malhotra appears twice.
    expect(screen.getAllByRole("button", { name: /Vikram Malhotra/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Rahul Sharma/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Arjun Reddy/ })).toHaveLength(1);
  });

  it("marks the active account in its section", async () => {
    const user = userEvent.setup();
    render(<DemoAccountSwitcher currentEmail="owner@cueclub.example" />);

    await user.click(screen.getByRole("button"));

    const rahulButton = screen
      .getAllByRole("button", { name: /Rahul Sharma/ })
      .find((button) => button.className.includes("border-cyan-500/50"));
    expect(rahulButton).toBeDefined();
    const vikramButton = screen.getByRole("button", { name: /Vikram Malhotra/ });
    expect(vikramButton.className).not.toContain("border-amber-500/50");
  });

  it("switching to an HQ account sets the email cookie, clears the store cookie, and opens /hq/dashboard", async () => {
    const user = userEvent.setup();
    document.cookie = "demo_store_slug=seed-business; path=/";
    // currentEmail points elsewhere so the trigger never matches the HQ item.
    render(<DemoAccountSwitcher currentEmail="owner@cueclub.example" />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /Vikram Malhotra/ }));

    expect(document.cookie).toContain("demo_user_email=hq.blackball@example.com");
    expect(document.cookie).not.toContain("demo_store_slug");
    expect(window.location.href).toBe("/hq/dashboard");
  });

  it("switching to an outlet manager sets both cookies and opens /dashboard", async () => {
    const user = userEvent.setup();
    render(<DemoAccountSwitcher />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /Rahul Sharma/ }));

    expect(document.cookie).toContain("demo_user_email=owner@cueclub.example");
    expect(document.cookie).toContain("demo_store_slug=seed-business");
    expect(window.location.href).toBe("/dashboard");
  });

  it("switching to an independent owner sets both cookies and opens /dashboard", async () => {
    const user = userEvent.setup();
    render(<DemoAccountSwitcher />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /Arjun Reddy/ }));

    expect(document.cookie).toContain("demo_user_email=owner@royalsnooker.example");
    expect(document.cookie).toContain("demo_store_slug=saas-royal-snooker");
    expect(window.location.href).toBe("/dashboard");
  });

  it("closes the menu via the close button", async () => {
    const user = userEvent.setup();
    render(<DemoAccountSwitcher />);

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Franchise HQ Directors")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "close" }));
    expect(screen.queryByText("Franchise HQ Directors")).not.toBeInTheDocument();
  });
});

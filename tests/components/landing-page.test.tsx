import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}));

describe("LandingPage", () => {
  it("renders the BlackBall brand header", () => {
    render(<LandingPage />);

    expect(screen.getByText("BlackBall")).toBeInTheDocument();
    const headerBB = document.querySelector("header .rounded-2xl");
    expect(headerBB?.textContent?.includes("BB")).toBe(true);
    expect(screen.getByText("Cue Sports & Multi-Outlet Enterprise Platform")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features");
    expect(screen.getByRole("link", { name: "Franchise & SaaS" })).toHaveAttribute("href", "#solutions");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    expect(screen.getByRole("link", { name: "Testimonials" })).toHaveAttribute("href", "#testimonials");
  });

  it("renders Sign In link to /login", () => {
    render(<LandingPage />);

    const signInLinks = screen.getAllByRole("link", { name: "Sign In" });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0]).toHaveAttribute("href", "/login");
  });

  it("renders Demo Playground link to /magic-login", () => {
    render(<LandingPage />);

    const demoLinks = Array.from(document.querySelectorAll('a[href="/magic-login"]'));
    expect(demoLinks.length).toBeGreaterThan(0);
  });

  it("renders hero section with main heading", () => {
    render(<LandingPage />);

    expect(screen.getByText("Automate Table Timers.")).toBeInTheDocument();
    expect(screen.getByText("Scale Multi-Outlet Revenue.")).toBeInTheDocument();
  });

  it("renders hero description", () => {
    render(<LandingPage />);

    expect(
      screen.getByText(/The all-in-one POS & Enterprise SaaS designed for pool clubs/)
    ).toBeInTheDocument();
  });

  it("renders trial CTA button", () => {
    render(<LandingPage />);

    const trialBtn = screen.getByRole("link", { name: /Start Free 14-Day Trial/ });
    expect(trialBtn).toHaveAttribute("href", "/login");
  });

  it("renders interactive demo CTA button", () => {
    render(<LandingPage />);

    const demoBtn = screen.getByRole("link", { name: /Explore Interactive Demo/ });
    expect(demoBtn).toHaveAttribute("href", "/magic-login");
  });

  it("renders trust badges", () => {
    render(<LandingPage />);

    expect(screen.getByText("Instant Setup")).toBeInTheDocument();
    expect(screen.getByText("Multi-Outlet HQ Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware Thermal Printing")).toBeInTheDocument();
  });

  it("renders features section with heading", () => {
    render(<LandingPage />);

    expect(screen.getByText("Everything You Need to Run & Grow Your Club")).toBeInTheDocument();
  });

  it("renders all three feature cards", () => {
    render(<LandingPage />);

    expect(screen.getByText("Automated Minute Timers")).toBeInTheDocument();
    expect(screen.getByText("Franchise Multi-Outlet HQ")).toBeInTheDocument();
    expect(screen.getByText("Integrated F&B POS Billing")).toBeInTheDocument();
  });

  it("renders solutions section", () => {
    render(<LandingPage />);

    expect(screen.getByText("Whether Single Store or Enterprise Franchise")).toBeInTheDocument();
    expect(screen.getByText("Single-Store B2B SaaS")).toBeInTheDocument();
    expect(screen.getByText("Multi-Outlet Enterprise HQ")).toBeInTheDocument();
  });

  it("renders pricing section with heading", () => {
    render(<LandingPage />);

    expect(screen.getByText("Flexible Plans for Clubs of All Sizes")).toBeInTheDocument();
  });

  it("renders all three pricing plans", () => {
    render(<LandingPage />);

    expect(screen.getByText("Starter Club")).toBeInTheDocument();
    expect(screen.getByText("Pro Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Franchise Chain")).toBeInTheDocument();
  });

  it("renders annual pricing by default (annualBilling state defaults to true)", () => {
    const { container } = render(<LandingPage />);
    expect(container.innerHTML).toContain("1,599");
    expect(container.innerHTML).toContain("3,999");
  });

  it("shows annual pricing after toggle", async () => {
    const { container } = render(<LandingPage />);
    expect(container.innerHTML).toContain("1,599");

    const toggle = screen.getByRole("button");
    await fireEvent.click(toggle);

    expect(container.innerHTML).toContain("1,999");
    expect(container.innerHTML).toContain("4,999");
  });

  it("shows Save 20% badge on annual pricing", () => {
    render(<LandingPage />);

    const toggle = screen.getByRole("button");
    expect(toggle).toBeInTheDocument();

    expect(screen.getByText("Save 20%")).toBeInTheDocument();
  });

  it("renders testimonials section", () => {
    render(<LandingPage />);

    expect(screen.getByText("Hear From Venue Directors")).toBeInTheDocument();
    expect(screen.getByText("Vikram Malhotra")).toBeInTheDocument();
    expect(screen.getByText("Arjun Reddy")).toBeInTheDocument();
    expect(screen.getByText("Anish Roy")).toBeInTheDocument();
  });

  it("renders footer with copyright", () => {
    render(<LandingPage />);

    expect(screen.getByText(/© \d{4} BlackBall POS & SaaS/)).toBeInTheDocument();
  });

  it("renders footer links", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Dev Magic Login" })).toHaveAttribute("href", "/magic-login");
  });

  it("renders Most Popular badge on Pro plan", () => {
    render(<LandingPage />);

    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("renders Pro plan CTA to /login", () => {
    render(<LandingPage />);

    const proLink = screen.getByRole("link", { name: /Start Pro 14-Day Free Trial/ });
    expect(proLink).toHaveAttribute("href", "/login");
  });

  it("renders Starter plan CTA to /login", () => {
    render(<LandingPage />);

    const starterLink = screen.getByRole("link", { name: "Choose Starter" });
    expect(starterLink).toHaveAttribute("href", "/login");
  });

  it("renders Franchise Chain Contact Sales CTA to /login", () => {
    render(<LandingPage />);

    const franchiseLink = screen.getByRole("link", { name: "Contact Sales" });
    expect(franchiseLink).toHaveAttribute("href", "/login");
  });

  it("renders mock table grid in hero preview", () => {
    render(<LandingPage />);

    expect(screen.getByText("Table 01 (English Snooker)")).toBeInTheDocument();
    expect(screen.getByText("Table 02 (French Pool)")).toBeInTheDocument();
    expect(screen.getByText("Table 03 (Mini Snooker)")).toBeInTheDocument();
    expect(screen.getByText("Station 01 (PS5 Console)")).toBeInTheDocument();
  });

  it("renders live sync badge in mock preview", () => {
    render(<LandingPage />);

    expect(screen.getByText("Live Sync Active")).toBeInTheDocument();
  });

  it("renders business model cards with feature lists", () => {
    render(<LandingPage />);

    expect(screen.getByText("Live Floor Grid & Table Timers")).toBeInTheDocument();
    expect(screen.getByText("Cafe POS & Inventory Tracking")).toBeInTheDocument();
    expect(screen.getByText(/Master HQ Dashboard/)).toBeInTheDocument();
    expect(screen.getByText("Central Outlet Switcher & Comparison")).toBeInTheDocument();
  });

  it("renders plan feature lists for Starter", () => {
    render(<LandingPage />);

    expect(screen.getByText("Up to 8 Tables / Consoles")).toBeInTheDocument();
    expect(screen.getByText("Live Floor Timers & POS Billing")).toBeInTheDocument();
    expect(screen.getByText("Standard Daily Reports")).toBeInTheDocument();
    expect(screen.getByText("Email Support")).toBeInTheDocument();
  });

  it("renders plan feature lists for Pro", () => {
    render(<LandingPage />);

    expect(screen.getByText("Unlimited Tables & PS5 Consoles")).toBeInTheDocument();
    expect(screen.getByText("Multi-Outlet HQ Access")).toBeInTheDocument();
    expect(screen.getByText("Integrated F&B POS & Thermal Printing")).toBeInTheDocument();
    expect(screen.getByText("Role-Based Security & Audit Logs")).toBeInTheDocument();
    expect(screen.getByText("24/7 Priority Support")).toBeInTheDocument();
  });

  it("renders plan feature lists for Franchise Chain", () => {
    render(<LandingPage />);

    expect(screen.getByText("Everything in Pro Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Custom Franchise Royalty Tracking")).toBeInTheDocument();
    expect(screen.getByText("Custom API & Hardware Integrations")).toBeInTheDocument();
    expect(screen.getByText("Dedicated Account Manager")).toBeInTheDocument();
  });

  it("renders custom pricing for Franchise Chain plan", () => {
    render(<LandingPage />);

    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText(/volume pricing/)).toBeInTheDocument();
  });

  it("renders testimonials with company names", () => {
    render(<LandingPage />);

    expect(screen.getByText("HQ Director, BlackBall Franchise Group")).toBeInTheDocument();
    expect(screen.getByText("Owner, Royal Snooker Club (JP Nagar)")).toBeInTheDocument();
    expect(screen.getByText("HQ Director, CueNation Franchise Group")).toBeInTheDocument();
  });

  it("renders the #1 OS badge in hero", () => {
    render(<LandingPage />);

    expect(screen.getByText("#1 Operating System for Pool, Snooker & PS5 Gaming Lounges")).toBeInTheDocument();
  });

  it("renders the POS & SaaS badge in header", () => {
    render(<LandingPage />);

    expect(screen.getByText("POS & SaaS")).toBeInTheDocument();
  });
});
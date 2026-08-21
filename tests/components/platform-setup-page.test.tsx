import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PlatformFranchiseSetupPage,
  PlatformSaasSetupPage,
  PlatformSetupPage,
  type SetupOutletSummary
} from "@/features/platform/components/platform-setup-page";

const plans = [
  { id: "plan-professional-monthly", name: "Professional", code: "professional", baseAmount: 3999 },
  { id: "plan-franchise-monthly", name: "Franchise Platform", code: "franchise", baseAmount: 15000 }
];

const organizations = [
  { id: "org_blackball", name: "BlackBall Franchise Group", slug: "blackball-franchise", type: "FRANCHISE" as const }
];

const createdOutlet: SetupOutletSummary = {
  id: "business-1",
  name: "Cue Club Main",
  slug: "cue-club-main",
  email: "owner@cueclub.example",
  createdAt: "2026-08-11T10:00:00.000Z",
  organization: { name: "Cue Club", type: "INDEPENDENT_SAAS" },
  franchisee: null,
  subscriptions: [{ status: "ACTIVE", plan: { name: "Professional" } }],
  employees: [
    { email: "owner@cueclub.example", accountType: "STORE_OWNER" },
    { email: "staff@cueclub.example", accountType: "STORE_USER" }
  ]
};

describe("PlatformSetupPage", () => {
  it("shows a setup home with separate SaaS and franchise paths", () => {
    render(
      <PlatformSetupPage
        organizations={organizations}
        summary={{ organizations: 5, franchisees: 4, outlets: 8, plans: 4 }}
      />
    );

    expect(screen.getByRole("heading", { name: "Enterprise Setup Home" })).toBeInTheDocument();
    expect(screen.getByText("Operating models")).toBeInTheDocument();
    expect(screen.getByText("Platform Owner -> Organization/Brand -> Franchisee -> Outlet -> Store Team")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create SaaS Club" })).toHaveAttribute("href", "/platform/setup/saas");
    expect(screen.getByRole("link", { name: "Create Franchise Outlet" })).toHaveAttribute("href", "/platform/setup/franchise");
    expect(screen.queryByLabelText("Club or brand name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create SaaS setup" })).not.toBeInTheDocument();
  });
});

describe("PlatformSaasSetupPage", () => {
  it("renders the focused SaaS setup form and success handoff", () => {
    render(
      <PlatformSaasSetupPage
        plans={plans}
        recentOutlets={[createdOutlet]}
        createdOutlet={createdOutlet}
      />
    );

    expect(screen.getByRole("heading", { name: "SaaS Club Setup" })).toBeInTheDocument();
    expect(screen.getByText("Cue Club Main is ready")).toBeInTheDocument();
    expect(screen.getByText("owner@cueclub.example")).toBeInTheDocument();
    expect(screen.getByText("staff@cueclub.example")).toBeInTheDocument();
    expect(screen.getByText("Check email / temporary credential")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Tenant Dashboard" })).toHaveAttribute("href", "/dashboard?store=cue-club-main");
    expect(screen.getByLabelText("Club or brand name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create SaaS setup" })).toBeInTheDocument();
  });
});

describe("PlatformFranchiseSetupPage", () => {
  it("renders the focused franchise setup form and success handoff", () => {
    const franchiseOutlet: SetupOutletSummary = {
      ...createdOutlet,
      organization: { name: "BlackBall Franchise Group", type: "FRANCHISE" },
      franchisee: { name: "Bangalore Central Franchisee", email: "owner@franchisee.example" }
    };

    render(
      <PlatformFranchiseSetupPage
        plans={plans}
        organizations={organizations}
        recentOutlets={[franchiseOutlet]}
        createdOutlet={franchiseOutlet}
      />
    );

    expect(screen.getByRole("heading", { name: "Franchise Outlet Setup" })).toBeInTheDocument();
    expect(screen.getByText("Cue Club Main franchise outlet is ready")).toBeInTheDocument();
    expect(screen.getByText("Bangalore Central Franchisee")).toBeInTheDocument();
    expect(screen.getByLabelText("Royalty percent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create franchise setup" })).toBeInTheDocument();
  });
});

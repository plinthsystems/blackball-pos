import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformSetupPage } from "@/features/platform/components/platform-setup-page";

describe("PlatformSetupPage", () => {
  it("explains SaaS, owned outlet, and franchise setup paths", () => {
    render(
      <PlatformSetupPage
        plans={[
          { id: "plan_professional", name: "Professional", code: "professional", baseAmount: 3999 },
          { id: "plan_franchise", name: "Franchise Platform", code: "franchise", baseAmount: 15000 }
        ]}
        organizations={[
          { id: "org_blackball", name: "BlackBall Franchise Group", slug: "blackball-franchise", type: "FRANCHISE" }
        ]}
        summary={{ organizations: 5, franchisees: 4, outlets: 8, plans: 4 }}
      />
    );

    expect(screen.getByRole("heading", { name: "Enterprise Setup Command Center" })).toBeInTheDocument();
    expect(screen.getByText("Organizations")).toBeInTheDocument();
    expect(screen.getByText("Franchisees")).toBeInTheDocument();
    expect(screen.getByText("Outlets")).toBeInTheDocument();
    expect(screen.getByText("Plans")).toBeInTheDocument();
    expect(screen.getByText("Operating models")).toBeInTheDocument();
    expect(screen.getByText("Sell as SaaS")).toBeInTheDocument();
    expect(screen.getByText("Manage owned outlets")).toBeInTheDocument();
    expect(screen.getByText("Run franchise network")).toBeInTheDocument();
    expect(screen.getByText("Hierarchy and data scope")).toBeInTheDocument();
    expect(screen.getByText("Platform Owner -> Organization/Brand -> Franchisee -> Outlet -> Store Team")).toBeInTheDocument();
    expect(screen.getByText("Platform Admin")).toBeInTheDocument();
    expect(screen.getByText("Franchise HQ")).toBeInTheDocument();
    expect(screen.getByText("Franchisee Owner")).toBeInTheDocument();
    expect(screen.getByText("Store Owner / Manager")).toBeInTheDocument();
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getAllByText("What this creates")).toHaveLength(2);
    expect(screen.getByText("Demo and login guide")).toBeInTheDocument();
    expect(screen.getByLabelText("Club or brand name")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner email")).toBeInTheDocument();
    expect(screen.getByLabelText("Royalty percent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create SaaS setup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create franchise setup" })).toBeInTheDocument();
  });
});

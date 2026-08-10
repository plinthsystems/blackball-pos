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
      />
    );

    expect(screen.getByRole("heading", { name: "Platform Setup" })).toBeInTheDocument();
    expect(screen.getByText("Sell to one club")).toBeInTheDocument();
    expect(screen.getByText("Setup my own outlets")).toBeInTheDocument();
    expect(screen.getByText("Setup franchise")).toBeInTheDocument();
    expect(screen.getByText("Create SaaS club")).toBeInTheDocument();
    expect(screen.getByText("Create franchise outlet")).toBeInTheDocument();
    expect(screen.getByLabelText("Club or brand name")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner email")).toBeInTheDocument();
    expect(screen.getByLabelText("Royalty percent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create SaaS setup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create franchise setup" })).toBeInTheDocument();
  });
});

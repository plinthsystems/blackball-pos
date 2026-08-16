import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreSwitcher } from "@/components/app/store-switcher";

const stores = [
  { id: "b1", name: "BlackBall Koramangala", slug: "seed-business" },
  { id: "b2", name: "BlackBall MG Road", slug: "outlet-mg-road" }
];

// jsdom navigation is not implemented; stub it so href assignments are recorded.
let locationStub: { href: string };

beforeEach(() => {
  locationStub = { href: "http://localhost/dashboard" };
  vi.stubGlobal("location", locationStub);
  vi.mocked(usePathname).mockReturnValue("/dashboard");
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "demo_store_slug=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

describe("StoreSwitcher", () => {
  it("renders a muted chip with a fallback label when there are no stores", () => {
    render(<StoreSwitcher currentBusinessId="b1" stores={[]} />);

    expect(screen.getByText("Store")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a muted chip with the store name when there is only one store", () => {
    render(<StoreSwitcher currentBusinessId="b1" stores={[stores[0]]} />);

    expect(screen.getByText("BlackBall Koramangala")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the current store on the trigger button", () => {
    render(<StoreSwitcher currentBusinessId="b2" stores={stores} />);

    expect(screen.getByRole("button")).toHaveTextContent("BlackBall MG Road");
  });

  it("opens and closes the menu from the trigger", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="b1" stores={stores} />);

    const trigger = screen.getByRole("button");
    await user.click(trigger);
    expect(screen.getByText("Individual Outlets")).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByText("Individual Outlets")).not.toBeInTheDocument();
  });

  it("lists every store and marks the current one with a check", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="b1" stores={stores} organizationName="BlackBall Franchise" />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("BlackBall Franchise")).toBeInTheDocument();
    expect(screen.getByText("Switch Context")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /BlackBall Koramangala/ })).toHaveLength(2); // trigger + item
    expect(screen.getAllByRole("button", { name: /BlackBall MG Road/ })).toHaveLength(1);
    // Only the selected store shows a check mark.
    expect(screen.getAllByText("check")).toHaveLength(1);
  });

  it("selecting a store sets the store cookie and navigates to its live tables", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="b1" stores={stores} />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /BlackBall MG Road/ }));

    expect(document.cookie).toContain("demo_store_slug=outlet-mg-road");
    expect(window.location.href).toBe("/live-tables?store=outlet-mg-road");
    expect(screen.queryByText("Individual Outlets")).not.toBeInTheDocument(); // menu closed
  });

  it("shows the HQ view trigger and navigates without a store query from an HQ page", async () => {
    const user = userEvent.setup();
    vi.mocked(usePathname).mockReturnValue("/hq/dashboard");
    render(<StoreSwitcher currentBusinessId="b1" stores={stores} organizationType="FRANCHISE" />);

    const trigger = screen.getByRole("button");
    expect(trigger).toHaveTextContent("All Outlets (HQ View)");
    expect(trigger).toHaveTextContent("corporate_fare");

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /BlackBall MG Road/ }));

    expect(document.cookie).toContain("demo_store_slug=outlet-mg-road");
    expect(window.location.href).toBe("/live-tables");
  });

  it("navigates to the HQ dashboard via the All Outlets (HQ Master) option", async () => {
    const user = userEvent.setup();
    vi.mocked(usePathname).mockReturnValue("/hq/dashboard");
    render(
      <StoreSwitcher
        currentBusinessId="b1"
        stores={stores}
        organizationName="BlackBall Franchise Group"
        organizationType="FRANCHISE"
      />
    );

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /All Outlets \(HQ Master\)/ }));

    expect(window.location.href).toBe("/hq/dashboard");
  });

  it("shows the Franchise badge only for FRANCHISE organizations", () => {
    const { rerender } = render(<StoreSwitcher currentBusinessId="b1" stores={stores} organizationType="FRANCHISE" />);
    expect(screen.getByText("Franchise")).toBeInTheDocument();

    rerender(<StoreSwitcher currentBusinessId="b1" stores={stores} organizationType="INDEPENDENT_SAAS" />);
    expect(screen.queryByText("Franchise")).not.toBeInTheDocument();
  });

  it("hides the HQ master option for independent organizations", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="b1" stores={stores} organizationType="INDEPENDENT_SAAS" />);

    await user.click(screen.getByRole("button"));

    expect(screen.queryByRole("button", { name: /All Outlets \(HQ Master\)/ })).not.toBeInTheDocument();
  });
});

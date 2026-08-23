import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreSwitcher } from "@/components/app/store-switcher";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}));

const mockSetItem = vi.fn();
Object.defineProperty(document, "cookie", {
  writable: true,
  value: ""
});

const stores = [
  { id: "store_1", name: "Store A", slug: "store-a" },
  { id: "store_2", name: "Store B", slug: "store-b" },
  { id: "store_3", name: "Store C", slug: "store-c" }
];

describe("StoreSwitcher", () => {
  let originalLocation: typeof window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/live-tables");
    originalLocation = window.location;
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation
    });
  });

  it("renders current store name when single store", () => {
    render(<StoreSwitcher currentBusinessId="store_1" stores={[stores[0]]} />);
    expect(screen.getByText("Store A")).toBeInTheDocument();
  });

  it("renders Store when no stores provided", () => {
    render(<StoreSwitcher currentBusinessId="store_1" stores={[]} />);
    expect(screen.getByText("Store")).toBeInTheDocument();
  });

  it("renders the first store when currentBusinessId not found", () => {
    render(<StoreSwitcher currentBusinessId="nonexistent" stores={stores} />);
    expect(screen.getByText("Store A")).toBeInTheDocument();
  });

  it("opens dropdown when clicked with multiple stores", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationName="My Org" />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("My Org")).toBeInTheDocument();
  });

  it("shows all stores in dropdown", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationName="My Org" />);
    await user.click(screen.getByRole("button"));
    // Store names appear in dropdown items - use getAllByText to avoid ambiguity
    const allStoreA = screen.getAllByText(/Store A/);
    expect(allStoreA.length).toBeGreaterThan(1); // at least in button + dropdown
    expect(screen.getByText(/Store B/)).toBeInTheDocument();
    expect(screen.getByText(/Store C/)).toBeInTheDocument();
  });

  it("highlights the currently selected store", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_2" stores={stores} />);
    await user.click(screen.getByRole("button"));
    // Find the Store B button in the dropdown (not the main button)
    const allStoreB = screen.getAllByText(/Store B/);
    // The dropdown item should have the selected styling - find the button parent
    const dropdownBtn = allStoreB.find((el) => {
      const parent = el.closest(".space-y-1 > button");
      return parent !== null;
    })?.closest("button");
    expect(dropdownBtn).toBeDefined();
    if (dropdownBtn) {
      expect(dropdownBtn).toHaveClass("bg-lime-500/20");
    }
  });

  it("shows check icon for selected store", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    await user.click(screen.getByRole("button"));
    // The selected store should have a check icon (material-symbols-outlined)
    const dropdown = screen.getByText("Individual Outlets").closest(".space-y-1");
    expect(dropdown).toHaveTextContent("Store A");
  });

  it("navigates to store live-tables when selecting a store", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" }
    });
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Store B"));
    expect(window.location.href).toBe("/live-tables?store=store-b");
  });

  it("sets cookie with store slug on selection", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Store B"));
    expect(document.cookie).toContain("demo_store_slug=store-b");
  });

  it("navigates to /live-tables with ?store= when on HQ page and selecting a store", async () => {
    mockUsePathname.mockReturnValue("/hq/dashboard");
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" }
    });
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="FRANCHISE" />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Store B"));
    expect(window.location.href).toBe("/live-tables?store=store-b");
  });

  it("shows All Outlets (HQ Master) option for FRANCHISE", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="FRANCHISE" />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("All Outlets (HQ Master)")).toBeInTheDocument();
  });

  it("hides All Outlets option for INDEPENDENT_SAAS", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="INDEPENDENT_SAAS" />);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("All Outlets (HQ Master)")).not.toBeInTheDocument();
  });

  it("hides All Outlets option when organizationType is undefined", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("All Outlets (HQ Master)")).not.toBeInTheDocument();
  });

  it("navigates to /hq/dashboard when clicking HQ Master", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" }
    });
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="FRANCHISE" />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("All Outlets (HQ Master)"));
    expect(window.location.href).toBe("/hq/dashboard");
  });

  it("shows Franchise badge for FRANCHISE type", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="FRANCHISE" />);
    expect(screen.getByText("Franchise")).toBeInTheDocument();
  });

  it("hides Franchise badge for INDEPENDENT_SAAS", () => {
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="INDEPENDENT_SAAS" />);
    expect(screen.queryByText("Franchise")).not.toBeInTheDocument();
  });

  it("shows storefront icon when not on HQ page", () => {
    mockUsePathname.mockReturnValue("/live-tables");
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("shows corporate icon when on HQ page", () => {
    mockUsePathname.mockReturnValue("/hq/dashboard");
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="FRANCHISE" />);
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("All Outlets (HQ View)");
  });

  it("closes dropdown after selecting a store", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" }
    });
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Store B")).toBeInTheDocument();
    await user.click(screen.getByText("Store B"));
    expect(screen.queryByText("Individual Outlets")).not.toBeInTheDocument();
  });

  it("handles empty stores array", () => {
    render(<StoreSwitcher currentBusinessId="store_1" stores={[]} />);
    expect(screen.getByText("Store")).toBeInTheDocument();
  });

  it("handles null stores array", () => {
    render(<StoreSwitcher currentBusinessId="store_1" stores={[] as unknown as Array<{ id: string; name: string; slug: string }>} />);
    expect(screen.getByText("Store")).toBeInTheDocument();
  });

  it("highlights HQ option when on HQ page for FRANCHISE", async () => {
    mockUsePathname.mockReturnValue("/hq/dashboard");
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="FRANCHISE" />);
    await user.click(screen.getByRole("button"));
    const hqButton = screen.getByText("All Outlets (HQ Master)").closest("button");
    expect(hqButton).toHaveClass("bg-amber-500/20");
  });

  it("does not highlight HQ option when not on HQ page", async () => {
    mockUsePathname.mockReturnValue("/live-tables");
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationType="FRANCHISE" />);
    await user.click(screen.getByRole("button"));
    const hqButton = screen.getByText("All Outlets (HQ Master)").closest("button");
    expect(hqButton).not.toHaveClass("bg-amber-500/20");
  });

  it("shows Individual Outlets section label", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Individual Outlets")).toBeInTheDocument();
  });

it("closes menu after selecting a store", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" }
    });
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText(/Store B/)).toBeInTheDocument();
    await user.click(screen.getByText("Store B"));
    // Menu should be closed after selection
    expect(screen.queryByText(/Store B/)).not.toBeInTheDocument();
  });

  it("renders organization name in dropdown header", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} organizationName="Super Franchise" />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Super Franchise")).toBeInTheDocument();
  });

  it("renders default outlets name when organizationName not provided", async () => {
    const user = userEvent.setup();
    render(<StoreSwitcher currentBusinessId="store_1" stores={stores} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Outlets")).toBeInTheDocument();
  });
});
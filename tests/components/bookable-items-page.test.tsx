import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BookableItemsPage } from "@/features/tables/components/bookable-items-page";
import type { BookableItem } from "@/features/tables/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}));

vi.mock("@/features/tables/actions", () => ({
  createBookableItemAction: vi.fn(),
  setBookableItemActiveAction: vi.fn(),
  updateBookableItemAction: vi.fn()
}));

const sampleItems: BookableItem[] = [
  {
    id: "t1",
    number: "Royal Snooker 1",
    gameType: "SNOOKER",
    pricingGroup: "royal",
    status: "AVAILABLE",
    active: true,
    hourlyRate: 350
  },
  {
    id: "t2",
    number: "Pool Table A",
    gameType: "POOL",
    pricingGroup: "standard",
    status: "AVAILABLE",
    active: true,
    hourlyRate: 160
  },
  {
    id: "t3",
    number: "PS5 Console 1",
    gameType: "PS5",
    pricingGroup: "players-2",
    status: "AVAILABLE",
    active: false,
    hourlyRate: 150
  }
];

describe("BookableItemsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading and business name", () => {
    const { container } = render(<BookableItemsPage items={sampleItems} businessName="Royal Snooker Club" />);

    expect(screen.getByRole("heading", { name: "Bookable Items" })).toBeInTheDocument();
    expect(container.innerHTML).toContain("Royal Snooker Club");
  });

  it("shows empty state message when no items", () => {
    render(<BookableItemsPage items={[]} businessName="My Club" />);

    expect(screen.getByText("No bookable items yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Use the form below to add your first table or console/)
    ).toBeInTheDocument();
  });

  it("renders item list with active count", () => {
    const { container } = render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    expect(screen.getByText("Your inventory (2 active)")).toBeInTheDocument();
    expect(container.innerHTML).toContain("Royal Snooker 1");
    expect(container.innerHTML).toContain("Pool Table A");
  });

  it("shows all item columns in the table", () => {
    const { container } = render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    expect(container.innerHTML).toContain("Item");
    expect(container.innerHTML).toContain("Type");
    expect(container.innerHTML).toContain("Rate group");
    expect(container.innerHTML).toContain("Hourly rate");
    expect(container.innerHTML).toContain("Status");
    expect(container.innerHTML).toContain("Actions");
  });

  it("displays hourly rates with money format", () => {
    render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    expect(screen.getByText("₹350.00")).toBeInTheDocument();
    expect(screen.getByText("₹160.00")).toBeInTheDocument();
  });

  it("shows 'No rate set' for zero hourly rate", () => {
    const zeroRate: BookableItem[] = [
      {
        id: "t4",
        number: "Test Table",
        gameType: "POOL",
        pricingGroup: "standard",
        status: "AVAILABLE",
        active: true,
        hourlyRate: 0
      }
    ];
    render(<BookableItemsPage items={zeroRate} businessName="My Club" />);

    expect(screen.getByText("No rate set")).toBeInTheDocument();
  });

  it("shows game type labels", () => {
    const { container } = render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    expect(container.innerHTML).toContain("Snooker");
    expect(container.innerHTML).toContain("Pool");
    expect(container.innerHTML).toContain("PS5");
  });

  it("shows pricing group labels", () => {
    const { container } = render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    expect(container.innerHTML).toContain("Royal");
    expect(container.innerHTML).toContain("Standard");
    expect(container.innerHTML).toContain("2 players");
  });

  it("shows inactive items with reduced opacity", () => {
    const { container } = render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    expect(container.innerHTML).toContain("PS5 Console 1");
    const ps5Row = screen.getByRole("button", { name: "Restore" }).closest(".grid");
    expect(ps5Row).toHaveClass("opacity-60");
  });

  it("shows Restore button for inactive items", () => {
    render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    const restoreButton = screen.getByRole("button", { name: "Restore" });
    expect(restoreButton).toBeInTheDocument();
  });

  it("hides Remove button for inactive items", () => {
    render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    expect(removeButtons).toHaveLength(2);
  });

  it("disables edit inputs for inactive items", () => {
    render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    const ps5Row = screen.getByRole("button", { name: "Restore" }).closest(".grid");
    const inputs = ps5Row?.querySelectorAll("input");
    inputs?.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("renders add item form with all fields", () => {
    render(<BookableItemsPage items={[]} businessName="My Club" />);

    expect(screen.getByRole("heading", { name: "Add a bookable item" })).toBeInTheDocument();
    expect(screen.getByLabelText("Item name")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Rate group")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("disables Add item button when name is empty", () => {
    render(<BookableItemsPage items={[]} businessName="My Club" />);

    const addButton = screen.getByRole("button", { name: "Add item" });
    expect(addButton).toBeDisabled();
  });

  it("enables Add item button when name has content", async () => {
    render(<BookableItemsPage items={[]} businessName="My Club" />);

    const input = screen.getByLabelText("Item name");
    await userEvent.type(input, "New Table");

    const addButton = screen.getByRole("button", { name: "Add item" });
    expect(addButton).not.toBeDisabled();
  });

  it("calls createBookableItemAction when Add item is clicked", async () => {
    const { createBookableItemAction } = await import("@/features/tables/actions");
    vi.mocked(createBookableItemAction).mockResolvedValueOnce({
      ok: true,
      message: "Item added"
    });

    render(<BookableItemsPage items={[]} businessName="My Club" />);

    const input = screen.getByLabelText("Item name");
    await userEvent.type(input, "Royal Snooker 1");

    await userEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(createBookableItemAction).toHaveBeenCalledWith({
      number: "Royal Snooker 1",
      gameType: "POOL",
      pricingGroup: "standard"
    });
  });

  it("shows snackbar message after action", async () => {
    const { createBookableItemAction } = await import("@/features/tables/actions");
    vi.mocked(createBookableItemAction).mockResolvedValueOnce({
      ok: true,
      message: "Item added successfully"
    });

    render(<BookableItemsPage items={[]} businessName="My Club" />);

    const input = screen.getByLabelText("Item name");
    await userEvent.type(input, "New Table");

    await userEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(screen.getByText("Item added successfully")).toBeInTheDocument();
  });

  it("shows danger snackbar on failure", async () => {
    const { createBookableItemAction } = await import("@/features/tables/actions");
    vi.mocked(createBookableItemAction).mockResolvedValueOnce({
      ok: false,
      message: "could not add item — name already exists"
    });

    render(<BookableItemsPage items={[]} businessName="My Club" />);

    const input = screen.getByLabelText("Item name");
    await userEvent.type(input, "Duplicate");

    await userEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(screen.getByText("could not add item — name already exists")).toBeInTheDocument();
  });

  it("calls setBookableItemActiveAction when Restore is clicked", async () => {
    const { setBookableItemActiveAction } = await import("@/features/tables/actions");
    vi.mocked(setBookableItemActiveAction).mockResolvedValueOnce({
      ok: true,
      message: "Item restored"
    });

    render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    await userEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(setBookableItemActiveAction).toHaveBeenCalledWith({
      id: "t3",
      active: true
    });
  });

  it("calls setBookableItemActiveAction when Remove is clicked", async () => {
    const { setBookableItemActiveAction } = await import("@/features/tables/actions");
    vi.mocked(setBookableItemActiveAction).mockResolvedValueOnce({
      ok: true,
      message: "Item removed"
    });

    render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await userEvent.click(removeButtons[0]);

    expect(setBookableItemActiveAction).toHaveBeenCalledWith({
      id: "t1",
      active: false
    });
  });

  it("calls updateBookableItemAction when Save is clicked on active item", async () => {
    const { updateBookableItemAction } = await import("@/features/tables/actions");
    vi.mocked(updateBookableItemAction).mockResolvedValueOnce({
      ok: true,
      message: "Item updated"
    });

    render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    await userEvent.click(saveButtons[0]);

    expect(updateBookableItemAction).toHaveBeenCalledWith({
      id: "t1",
      number: "Royal Snooker 1",
      gameType: "SNOOKER",
      pricingGroup: "royal"
    });
  });

  it("disables Save button for inactive items", () => {
    const { container } = render(<BookableItemsPage items={sampleItems} businessName="My Club" />);

    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    expect(saveButtons).toHaveLength(3);
  });

  it("sets game type default to POOL in add form", () => {
    render(<BookableItemsPage items={[]} businessName="My Club" />);

    const select = screen.getByLabelText("Type");
    expect(select).toHaveValue("POOL");
  });

  it("renders all three game types in the type selector", () => {
    render(<BookableItemsPage items={[]} businessName="My Club" />);

    const select = screen.getByLabelText("Type");
    expect(select).toHaveValue("POOL");
    expect(select).toContainHTML("Pool");
    expect(select).toContainHTML("Snooker");
    expect(select).toContainHTML("PS5");
  });
});
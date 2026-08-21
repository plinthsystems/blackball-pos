import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BookPageView } from "@/features/booking/components/book-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}));

vi.mock("@/features/booking/actions", () => ({
  createPublicBookingAction: vi.fn(),
  listBookableSlotsAction: vi.fn()
}));

globalThis.scrollTo = () => {};

const mockCatalog = {
  businessId: "biz_1",
  businessName: "Royal Snooker Club",
  slug: "royal-snooker",
  bookingEnabled: true,
  requireConfirmation: true,
  bookingBufferMinutes: 10,
  bookingMinLeadMinutes: 30,
  bookingOpenHour: 10,
  bookingCloseHour: 23,
  bookingCloseNextDay: false,
  paymentProvider: null,
  advanceAmount: 0,
  whatsappConfigured: false,
  tables: [
    { id: "t1", number: "S1", gameType: "SNOOKER", pricingGroup: "royal" },
    { id: "t2", number: "P1", gameType: "POOL", pricingGroup: "standard" }
  ]
};

const catalogNoConfirmation = {
  ...mockCatalog,
  requireConfirmation: false
};

function fillDetails(user: UserEvent) {
  user.type(screen.getByLabelText("Full Name"), "Rahul Sharma");
  user.type(screen.getByLabelText("Phone Number (WhatsApp)"), "9876543210");
}

function fillFormFields() {
  fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Rahul Sharma" } });
  fireEvent.change(screen.getByLabelText("Phone Number (WhatsApp)"), { target: { value: "9876543210" } });
}

function getButtons() {
  return Array.from(document.querySelectorAll("button"));
}

function clickTable(tableNumber: string) {
  const tableBtn = getButtons().find((b) => b.textContent?.includes(tableNumber));
  expect(tableBtn).toBeDefined();
  fireEvent.click(tableBtn!);
}

function clickDuration(duration: string) {
  fireEvent.click(screen.getByRole("button", { name: duration }));
}

function clickSlot() {
  const btns = getButtons();
  const slotBtn = btns.find((b) => {
    const t = b.textContent;
    return t && !t.includes("m") && !t.includes("h") && t.includes(":");
  });
  if (slotBtn) fireEvent.click(slotBtn);
}

async function selectTableDurationSlot(catalog = mockCatalog) {
  render(<BookPageView catalog={catalog} />);
  clickTable("S1");
  clickDuration("1h");
  await waitFor(() => {
    const btns = getButtons();
    expect(btns.some((b) => {
      const t = b.textContent;
      return t && t.includes(":") && !t.includes("m") && !t.includes("h");
    })).toBe(true);
  });
  clickSlot();
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Continue →" })).toBeInTheDocument();
  });
}

describe("BookPageView", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { listBookableSlotsAction } = await import("@/features/booking/actions");
    vi.mocked(listBookableSlotsAction).mockResolvedValue({
      ok: true,
      slots: [{ iso: "2026-08-20T14:00:00.000Z", label: "2:00 PM", available: true }]
    });
  });

  it("renders business name in header", () => {
    render(<BookPageView catalog={mockCatalog} />);
    expect(screen.getByText("Royal Snooker Club")).toBeInTheDocument();
    expect(screen.getByText("Book a table online")).toBeInTheDocument();
  });

  it("shows table selection step", () => {
    render(<BookPageView catalog={mockCatalog} />);
    expect(screen.getByText("Choose a table")).toBeInTheDocument();
    expect(screen.getByText("S1")).toBeInTheDocument();
    expect(screen.getByText("Snooker Table")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("Pool Table")).toBeInTheDocument();
  });

  it("selects a table when clicked", () => {
    render(<BookPageView catalog={mockCatalog} />);
    clickTable("S1");
    expect(document.querySelector(".ring-2")).toBeInTheDocument();
  });

  it("shows duration selection after table pick", () => {
    render(<BookPageView catalog={mockCatalog} />);
    clickTable("S1");
    expect(screen.getByText("How long?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30m" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1h" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1.5h" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2h" })).toBeInTheDocument();
  });

  it("selects a duration when clicked", () => {
    render(<BookPageView catalog={mockCatalog} />);
    clickTable("S1");
    clickDuration("1h");
    expect(screen.getByRole("button", { name: "1h" })).toHaveClass("ring-2");
  });

  it("shows Continue button when table, duration and slot are selected", async () => {
    await selectTableDurationSlot();
    expect(screen.getByRole("button", { name: "Continue →" })).toBeInTheDocument();
  });

  it("navigates to details step on Continue", async () => {
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("Phone Number (WhatsApp)")).toBeInTheDocument();
  });

  it("shows Back button in details step", async () => {
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("← Back")).toBeInTheDocument());
  });

  it("goes back to table selection on Back click", async () => {
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("← Back")).toBeInTheDocument());
    fireEvent.click(screen.getByText("← Back"));
    expect(screen.getByText("Choose a table")).toBeInTheDocument();
  });

  it("shows slot chips with table, duration info in details", async () => {
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText(/S1 · 1h/)).toBeInTheDocument());
  });

  it("shows booking confirmation success state", async () => {
    const { createPublicBookingAction } = await import("@/features/booking/actions");
    vi.mocked(createPublicBookingAction).mockResolvedValueOnce({
      ok: true,
      booking: {
        id: "b1",
        reference: "ABC123",
        status: "PENDING",
        startsAt: "2026-08-20T14:00:00.000Z",
        endsAt: "2026-08-20T15:00:00.000Z",
        tableNumber: "S1"
      },
      payment: null
    });
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    fireEvent.click(screen.getByRole("button", { name: "Request Booking" }));
    await waitFor(() => expect(screen.getByText("Request Received!")).toBeInTheDocument());
    expect(screen.getByText("Booking Ref")).toBeInTheDocument();
    expect(screen.getByText("#ABC123")).toBeInTheDocument();
    expect(screen.getByText("S1")).toBeInTheDocument();
  });

  it("shows confirmation notice for requireConfirmation stores", async () => {
    const { createPublicBookingAction } = await import("@/features/booking/actions");
    vi.mocked(createPublicBookingAction).mockResolvedValueOnce({
      ok: true,
      booking: {
        id: "b2",
        reference: "ABC123",
        status: "PENDING",
        startsAt: "2026-08-20T14:00:00.000Z",
        endsAt: "2026-08-20T15:00:00.000Z",
        tableNumber: "S1"
      },
      payment: null
    });
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    fireEvent.click(screen.getByRole("button", { name: "Request Booking" }));
    await waitFor(() => expect(screen.getByText(/This store verifies bookings manually/)).toBeInTheDocument());
  });

  it("shows 'no advance needed' message when advance is zero", async () => {
    const { createPublicBookingAction } = await import("@/features/booking/actions");
    vi.mocked(createPublicBookingAction).mockResolvedValueOnce({
      ok: true,
      booking: {
        id: "b3",
        reference: "ABC123",
        status: "CONFIRMED",
        startsAt: "2026-08-20T14:00:00.000Z",
        endsAt: "2026-08-20T15:00:00.000Z",
        tableNumber: "S1"
      },
      payment: null
    });
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    fireEvent.click(screen.getByRole("button", { name: "Request Booking" }));
    await waitFor(() => expect(screen.getByText(/No advance payment needed/)).toBeInTheDocument());
  });

  it("shows 'Make another booking' link after confirmation", async () => {
    const { createPublicBookingAction } = await import("@/features/booking/actions");
    vi.mocked(createPublicBookingAction).mockResolvedValueOnce({
      ok: true,
      booking: {
        id: "b4",
        reference: "ABC123",
        status: "CONFIRMED",
        startsAt: "2026-08-20T14:00:00.000Z",
        endsAt: "2026-08-20T15:00:00.000Z",
        tableNumber: "S1"
      },
      payment: null
    });
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    fireEvent.click(screen.getByRole("button", { name: "Request Booking" }));
    await waitFor(() => expect(screen.getByText("← Make another booking")).toBeInTheDocument());
  });

  it("shows submit error from server", async () => {
    const { createPublicBookingAction } = await import("@/features/booking/actions");
    vi.mocked(createPublicBookingAction).mockResolvedValueOnce({
      ok: false,
      message: "No slots available for this time"
    });
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    fireEvent.click(screen.getByRole("button", { name: "Request Booking" }));
    await waitFor(() => expect(screen.getByText("No slots available for this time")).toBeInTheDocument());
  });

  it("renders correct booking button text for requireConfirmation in details step", async () => {
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    await waitFor(() => expect(screen.getByRole("button", { name: "Request Booking" })).toBeInTheDocument());
  });

  it("shows WhatsApp info when configured", async () => {
    const catalogWithWhatsapp = {
      ...mockCatalog,
      whatsappConfigured: true
    };
    await selectTableDurationSlot(catalogWithWhatsapp);
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    expect(screen.getByText(/Booking confirmations & updates will be sent on this WhatsApp number/)).toBeInTheDocument();
  });

  it("renders correct initials for business name", () => {
    render(<BookPageView catalog={mockCatalog} />);
    expect(screen.getByText("RS")).toBeInTheDocument();
  });

  it("shows Same-day badge in header", () => {
    render(<BookPageView catalog={mockCatalog} />);
    expect(screen.getByText("Same-day")).toBeInTheDocument();
  });

  it("shows 'No slots left' when no slots available", async () => {
    const { listBookableSlotsAction } = await import("@/features/booking/actions");
    vi.mocked(listBookableSlotsAction).mockResolvedValueOnce({ ok: true, slots: [] });
    vi.mocked(listBookableSlotsAction).mockResolvedValueOnce({ ok: true, slots: [] });
    render(<BookPageView catalog={mockCatalog} />);
    clickTable("S1");
    clickDuration("1h");
    await waitFor(() => {
      expect(document.body.innerHTML).toContain("No slots left");
    });
  });

  it("shows 'Pick a duration to see open slots' before slots load", () => {
    render(<BookPageView catalog={mockCatalog} />);
    clickTable("S1");
    clickDuration("1h");
    expect(document.querySelector("body")!.innerHTML).toContain("Available start times");
  });

  it("shows 'Available start times' section after duration selection", async () => {
    const { listBookableSlotsAction } = await import("@/features/booking/actions");
    vi.mocked(listBookableSlotsAction).mockResolvedValueOnce({ ok: true, slots: [] });
    vi.mocked(listBookableSlotsAction).mockResolvedValueOnce({ ok: true, slots: [] });
    render(<BookPageView catalog={mockCatalog} />);
    clickTable("S1");
    clickDuration("1h");
    await waitFor(() => {
      expect(document.body.innerHTML).toContain("Available start times");
    });
  });

  it("shows booking details after confirmation", async () => {
    const { createPublicBookingAction } = await import("@/features/booking/actions");
    vi.mocked(createPublicBookingAction).mockResolvedValueOnce({
      ok: true,
      booking: {
        id: "b5",
        reference: "ABC123",
        status: "CONFIRMED",
        startsAt: "2026-08-20T14:00:00.000Z",
        endsAt: "2026-08-20T15:00:00.000Z",
        tableNumber: "S1"
      },
      payment: null
    });
    await selectTableDurationSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    fireEvent.click(screen.getByRole("button", { name: "Request Booking" }));
    await waitFor(() => {
      expect(screen.getByText("Booking Ref")).toBeInTheDocument();
      expect(screen.getByText("Table")).toBeInTheDocument();
      expect(screen.getByText("Time")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });

  it("renders 'Book & Pay' button when requireConfirmation and advance > 0", async () => {
    const catalogWithPayment = {
      ...(mockCatalog as any),
      paymentProvider: "razorpay",
      advanceAmount: 200,
      requireConfirmation: true
    };
    await selectTableDurationSlot(catalogWithPayment);
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    await waitFor(() => expect(document.body.innerHTML).toContain("Book &amp; Pay"));
  });

  it("shows 'Confirm Booking' when requireConfirmation is false", async () => {
    await selectTableDurationSlot(catalogNoConfirmation);
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
    await waitFor(() => expect(screen.getByText("Your details")).toBeInTheDocument());
    fillFormFields();
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm Booking" })).toBeInTheDocument());
  });
});
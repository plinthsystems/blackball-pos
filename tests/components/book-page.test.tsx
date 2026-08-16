import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookPageView } from "@/features/booking/components/book-page";
import type { PublicBookCatalog } from "@/features/booking/queries";

const actions = vi.hoisted(() => ({
  listBookableSlotsAction: vi.fn(),
  createPublicBookingAction: vi.fn()
}));

vi.mock("@/features/booking/actions", () => ({
  listBookableSlotsAction: actions.listBookableSlotsAction,
  createPublicBookingAction: actions.createPublicBookingAction
}));

const catalog: PublicBookCatalog = {
  businessId: "biz_1",
  businessName: "Cue Club",
  slug: "cue-club",
  bookingEnabled: true,
  requireConfirmation: false,
  bookingBufferMinutes: 10,
  bookingMinLeadMinutes: 0,
  bookingOpenHour: 0,
  bookingCloseHour: 24,
  bookingCloseNextDay: false,
  paymentProvider: null,
  advanceAmount: 0,
  whatsappConfigured: false,
  tables: [{ id: "table_1", number: "P1", gameType: "POOL", pricingGroup: "standard" }]
};

describe("BookPageView", () => {
  beforeEach(() => {
    actions.listBookableSlotsAction.mockReset();
    actions.createPublicBookingAction.mockReset();
    // Only the active business window returns a slot — the next-window call
    // returns nothing so each slot renders exactly once.
    actions.listBookableSlotsAction
      .mockResolvedValueOnce({
        slots: [{ iso: "2026-08-16T11:00:00.000Z", label: "4:30 PM", available: true }]
      })
      .mockResolvedValue({ slots: [] });
    actions.createPublicBookingAction.mockResolvedValue({
      ok: true,
      message: "Booking confirmed.",
      booking: {
        reference: "ABC123",
        status: "CONFIRMED",
        startsAt: "2026-08-16T11:00:00.000Z",
        endsAt: "2026-08-16T12:00:00.000Z",
        tableNumber: "P1"
      },
      payment: null
    });
  });

  it("submits the booking with Enter in the details step", async () => {
    const user = userEvent.setup();

    render(<BookPageView catalog={catalog} />);

    await user.click(screen.getByRole("button", { name: /P1/ }));
    await user.click(screen.getByRole("button", { name: "1h" }));
    await user.click(await screen.findByRole("button", { name: "4:30 PM" }));
    await user.click(screen.getByRole("button", { name: "Continue →" }));

    await user.type(screen.getByLabelText("Full Name"), "Rahul Sharma");
    await user.type(screen.getByLabelText("Phone Number (WhatsApp)"), "9876543210");
    await user.keyboard("{Enter}");

    expect(actions.createPublicBookingAction).toHaveBeenCalledWith({
      businessSlug: "cue-club",
      tableId: "table_1",
      startsAt: "2026-08-16T11:00:00.000Z",
      durationMinutes: 60,
      name: "Rahul Sharma",
      phone: "9876543210"
    });
    await waitFor(() => expect(screen.getByText("Booking Confirmed!")).toBeInTheDocument());
  });
});

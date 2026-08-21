import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffBookingsPanel } from "@/features/booking/components/staff-bookings";

vi.mock("@/features/booking/actions", () => ({
  confirmBookingAction: vi.fn(),
  cancelBookingAction: vi.fn(),
  markBookingPaidAction: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn()
  })
}));

const { confirmBookingAction, cancelBookingAction, markBookingPaidAction } = await import("@/features/booking/actions");
const mockConfirmBooking = vi.mocked(confirmBookingAction);
const mockCancelBooking = vi.mocked(cancelBookingAction);
const mockMarkBookingPaid = vi.mocked(markBookingPaidAction);

const sampleBooking = {
  id: "booking_1",
  status: "PENDING",
  paymentStatus: "UNPAID",
  paymentProvider: "razorpay",
  advanceAmount: 180,
  startsAt: "2026-01-15T10:00:00Z",
  endsAt: "2026-01-15T11:00:00Z",
  tableNumber: "P1",
  gameType: "POOL",
  customerName: "John Doe",
  customerPhone: "+919876543210",
  reference: "BK1234"
};

describe("StaffBookingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no bookings", () => {
    render(<StaffBookingsPanel bookings={[]} />);

    expect(screen.getByText("No upcoming bookings")).toBeInTheDocument();
    expect(
      screen.getByText("Share the store booking link with customers to start receiving reservations.")
    ).toBeInTheDocument();
  });

  it("renders booking details", () => {
    const { container } = render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(container.textContent).toContain("John Doe");
    expect(container.textContent).toContain("P1");
    expect(container.textContent).toContain("Ref #BK1234");
  });

  it("shows customer phone when available", () => {
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(screen.getByText("John Doe · +919876543210")).toBeInTheDocument();
  });

  it("hides customer phone when null", () => {
    const bookingNoPhone = { ...sampleBooking, customerPhone: null };
    render(<StaffBookingsPanel bookings={[bookingNoPhone]} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("John Doe ·")).not.toBeInTheDocument();
  });

  it("shows status badge for PENDING", () => {
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows status badge for CONFIRMED", () => {
    const confirmed = { ...sampleBooking, status: "CONFIRMED" };
    render(<StaffBookingsPanel bookings={[confirmed]} />);

    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("shows status badge for CHECKED_IN", () => {
    const checkedIn = { ...sampleBooking, status: "CHECKED_IN" };
    render(<StaffBookingsPanel bookings={[checkedIn]} />);

    expect(screen.getByText("Checked In")).toBeInTheDocument();
  });

  it("shows status badge for PLAYING", () => {
    const playing = { ...sampleBooking, status: "PLAYING" };
    render(<StaffBookingsPanel bookings={[playing]} />);

    expect(screen.getByText("Playing")).toBeInTheDocument();
  });

  it("shows status badge for COMPLETED", () => {
    const completed = { ...sampleBooking, status: "COMPLETED" };
    render(<StaffBookingsPanel bookings={[completed]} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows status badge for CANCELLED", () => {
    const cancelled = { ...sampleBooking, status: "CANCELLED" };
    render(<StaffBookingsPanel bookings={[cancelled]} />);

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("shows default status for unknown status", () => {
    const unknown = { ...sampleBooking, status: "UNKNOWN" };
    render(<StaffBookingsPanel bookings={[unknown]} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows game type label for POOL", () => {
    const { container } = render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(container.textContent).toContain("Pool");
  });

  it("shows game type label for SNOOKER", () => {
    const snooker = { ...sampleBooking, gameType: "SNOOKER" };
    const { container } = render(<StaffBookingsPanel bookings={[snooker]} />);

    expect(container.textContent).toContain("Snooker");
  });

  it("shows game type label for PS5", () => {
    const ps5 = { ...sampleBooking, gameType: "PS5" };
    const { container } = render(<StaffBookingsPanel bookings={[ps5]} />);

    expect(container.textContent).toContain("PS5");
  });

  it("shows raw game type for unknown game type", () => {
    const unknown = { ...sampleBooking, gameType: "UNKNOWN" };
    const { container } = render(<StaffBookingsPanel bookings={[unknown]} />);

    expect(container.textContent).toContain("UNKNOWN");
  });

  it("shows payment due badge when advanceAmount > 0 and not paid", () => {
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(screen.getByText("Due ₹180.00 (razorpay)")).toBeInTheDocument();
  });

  it("shows payment paid badge when paymentStatus is PAID", () => {
    const paid = { ...sampleBooking, paymentStatus: "PAID" };
    render(<StaffBookingsPanel bookings={[paid]} />);

    expect(screen.getByText("Paid ₹180.00")).toBeInTheDocument();
  });

  it("hides payment badge when advanceAmount is 0", () => {
    const noAdvance = { ...sampleBooking, advanceAmount: 0, paymentStatus: "UNPAID" };
    render(<StaffBookingsPanel bookings={[noAdvance]} />);

    expect(screen.queryByText("Due ₹0.00")).not.toBeInTheDocument();
    expect(screen.queryByText("Paid ₹0.00")).not.toBeInTheDocument();
  });

  it("shows payment provider when available", () => {
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(screen.getByText("Due ₹180.00 (razorpay)")).toBeInTheDocument();
  });

  it("hides payment provider when null", () => {
    const noProvider = { ...sampleBooking, paymentProvider: null };
    render(<StaffBookingsPanel bookings={[noProvider]} />);

    expect(screen.getByText("Due ₹180.00")).toBeInTheDocument();
    expect(screen.queryByText("Due ₹180.00 (razorpay)")).not.toBeInTheDocument();
  });

  it("shows Confirm button for PENDING booking", () => {
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("shows Cancel button for PENDING booking", () => {
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows Cancel button for CONFIRMED booking", () => {
    const confirmed = { ...sampleBooking, status: "CONFIRMED" };
    render(<StaffBookingsPanel bookings={[confirmed]} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows Cancel button for CHECKED_IN booking", () => {
    const checkedIn = { ...sampleBooking, status: "CHECKED_IN" };
    render(<StaffBookingsPanel bookings={[checkedIn]} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("does not show Cancel button for PLAYING booking", () => {
    const playing = { ...sampleBooking, status: "PLAYING" };
    render(<StaffBookingsPanel bookings={[playing]} />);

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("does not show Cancel button for COMPLETED booking", () => {
    const completed = { ...sampleBooking, status: "COMPLETED" };
    render(<StaffBookingsPanel bookings={[completed]} />);

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("does not show Cancel button for CANCELLED booking", () => {
    const cancelled = { ...sampleBooking, status: "CANCELLED" };
    render(<StaffBookingsPanel bookings={[cancelled]} />);

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("does not show Confirm button for CONFIRMED booking", () => {
    const confirmed = { ...sampleBooking, status: "CONFIRMED" };
    render(<StaffBookingsPanel bookings={[confirmed]} />);

    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("shows Mark paid button when advance > 0 and not paid", () => {
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    expect(screen.getByRole("button", { name: "Mark paid (cash)" })).toBeInTheDocument();
  });

  it("does not show Mark paid button when paymentStatus is PAID", () => {
    const paid = { ...sampleBooking, paymentStatus: "PAID" };
    render(<StaffBookingsPanel bookings={[paid]} />);

    expect(screen.queryByRole("button", { name: "Mark paid (cash)" })).not.toBeInTheDocument();
  });

  it("does not show Mark paid button when advanceAmount is 0", () => {
    const noAdvance = { ...sampleBooking, advanceAmount: 0 };
    render(<StaffBookingsPanel bookings={[noAdvance]} />);

    expect(screen.queryByRole("button", { name: "Mark paid (cash)" })).not.toBeInTheDocument();
  });

  it("calls confirmBookingAction when Confirm is clicked", async () => {
    mockConfirmBooking.mockResolvedValue({ ok: true, message: "Booking confirmed." });

    const user = userEvent.setup();
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockConfirmBooking).toHaveBeenCalledWith({ bookingId: "booking_1" });
    });
  });

  it("calls cancelBookingAction when Cancel is clicked", async () => {
    mockCancelBooking.mockResolvedValue({ ok: true, message: "Booking cancelled." });

    const user = userEvent.setup();
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(mockCancelBooking).toHaveBeenCalledWith({ bookingId: "booking_1" });
    });
  });

  it("calls markBookingPaidAction when Mark paid is clicked", async () => {
    mockMarkBookingPaid.mockResolvedValue({ ok: true, message: "Booking marked as paid." });

    const user = userEvent.setup();
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    await user.click(screen.getByRole("button", { name: "Mark paid (cash)" }));

    await waitFor(() => {
      expect(mockMarkBookingPaid).toHaveBeenCalledWith({ bookingId: "booking_1" });
    });
  });

  it("disables buttons while pending", async () => {
    let resolvePromise: (value: { ok: boolean; message: string }) => void;

    mockConfirmBooking.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const user = userEvent.setup();
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmButton);

    expect(confirmButton).toBeDisabled();

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(cancelButton).toBeDisabled();

    resolvePromise!({ ok: true, message: "Done." });
  });

  it("shows message banner on action result", async () => {
    mockConfirmBooking.mockResolvedValue({ ok: true, message: "Booking confirmed." });

    const user = userEvent.setup();
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(screen.getByText("Booking confirmed.")).toBeInTheDocument();
    });
  });

  it("shows message banner on failure", async () => {
    mockConfirmBooking.mockResolvedValue({ ok: false, message: "Booking could not be updated." });

    const user = userEvent.setup();
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(screen.getByText("Booking could not be updated.")).toBeInTheDocument();
    });
  });

  it("renders multiple bookings", () => {
    const bookings = [
      { ...sampleBooking, id: "booking_1", reference: "BK0001" },
      { ...sampleBooking, id: "booking_2", reference: "BK0002", status: "CONFIRMED" },
      { ...sampleBooking, id: "booking_3", reference: "BK0003", status: "COMPLETED" }
    ];

    const { container } = render(<StaffBookingsPanel bookings={bookings} />);

    expect(container.textContent).toContain("John Doe");
    expect(container.textContent).toContain("Ref #BK0001");
    expect(container.textContent).toContain("Ref #BK0002");
    expect(container.textContent).toContain("Ref #BK0003");
  });

  it("formats date correctly in time display", () => {
    render(<StaffBookingsPanel bookings={[sampleBooking]} />);

    const timeElement = screen.getByText(/Jan ·/);
    expect(timeElement).toBeInTheDocument();
  });

  it("handles zero advance amount", () => {
    const zeroAdvance = { ...sampleBooking, advanceAmount: 0 };
    render(<StaffBookingsPanel bookings={[zeroAdvance]} />);

    expect(screen.queryByText("Due ₹0.00")).not.toBeInTheDocument();
    expect(screen.queryByText("Paid ₹0.00")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark paid (cash)" })).not.toBeInTheDocument();
  });

  it("handles large advance amount", () => {
    const largeAdvance = { ...sampleBooking, advanceAmount: 9999.99 };
    const { container } = render(<StaffBookingsPanel bookings={[largeAdvance]} />);

    expect(container.textContent).toContain("₹9999.99");
  });
});
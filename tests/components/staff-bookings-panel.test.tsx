import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StaffBookingsPanel } from "@/features/booking/components/staff-bookings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}));

vi.mock("@/features/booking/actions", () => ({
  confirmBookingAction: vi.fn(),
  cancelBookingAction: vi.fn(),
  markBookingPaidAction: vi.fn()
}));

const sampleBookings = [
  {
    id: "b1",
    status: "PENDING",
    paymentStatus: "UNPAID",
    paymentProvider: "RAZORPAY",
    advanceAmount: 200,
    startsAt: "2026-08-20T14:00:00.000Z",
    endsAt: "2026-08-20T15:00:00.000Z",
    tableNumber: "S1",
    gameType: "SNOOKER",
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    reference: "ABC123"
  },
  {
    id: "b2",
    status: "CONFIRMED",
    paymentStatus: "PAID",
    paymentProvider: null,
    advanceAmount: 200,
    startsAt: "2026-08-20T16:00:00.000Z",
    endsAt: "2026-08-20T17:30:00.000Z",
    tableNumber: "P1",
    gameType: "POOL",
    customerName: "Walk-in Guest",
    customerPhone: null,
    reference: "DEF456"
  }
];

describe("StaffBookingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders booking list for upcoming bookings", () => {
    render(<StaffBookingsPanel bookings={sampleBookings} />);

    expect(screen.getByText("S1")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("Rahul Sharma · 9876543210")).toBeInTheDocument();
    expect(screen.getByText("Walk-in Guest")).toBeInTheDocument();
    expect(screen.getByText("Ref #ABC123")).toBeInTheDocument();
    expect(screen.getByText("Ref #DEF456")).toBeInTheDocument();
  });

  it("shows Pending and Confirmed status badges", () => {
    render(<StaffBookingsPanel bookings={sampleBookings} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("shows paid advance amount for paid bookings", () => {
    render(<StaffBookingsPanel bookings={sampleBookings} />);

    expect(screen.getByText("Paid ₹200.00")).toBeInTheDocument();
  });

  it("shows unpaid advance amount with provider", () => {
    render(<StaffBookingsPanel bookings={sampleBookings} />);

    expect(screen.getByText("Due ₹200.00 (RAZORPAY)")).toBeInTheDocument();
  });

  it("shows Confirm button for PENDING bookings", () => {
    render(<StaffBookingsPanel bookings={sampleBookings} />);

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("shows Cancel button for PENDING and CONFIRMED bookings", () => {
    render(<StaffBookingsPanel bookings={sampleBookings} />);

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    expect(cancelButtons).toHaveLength(2);
  });

  it("shows Mark paid button for unpaid bookings with advance", () => {
    render(<StaffBookingsPanel bookings={sampleBookings} />);

    expect(screen.getByRole("button", { name: "Mark paid (cash)" })).toBeInTheDocument();
  });

  it("hides Mark paid button for already paid bookings", () => {
    const paidOnly = [
      {
        ...sampleBookings[1],
        id: "b2-paid",
        paymentStatus: "PAID",
        advanceAmount: 200,
        paymentProvider: "STRIPE"
      }
    ];
    render(<StaffBookingsPanel bookings={paidOnly} />);

    expect(screen.queryByRole("button", { name: "Mark paid (cash)" })).not.toBeInTheDocument();
  });

  it("renders empty state when no bookings", () => {
    render(<StaffBookingsPanel bookings={[]} />);

    expect(screen.getByText("No upcoming bookings")).toBeInTheDocument();
    expect(
      screen.getByText(/Share the store booking link with customers/)
    ).toBeInTheDocument();
  });

  it("displays correct game type labels", () => {
    render(<StaffBookingsPanel bookings={sampleBookings} />);

    expect(screen.getByText(/Snooker/)).toBeInTheDocument();
    expect(screen.getByText(/Pool/)).toBeInTheDocument();
  });

  it("handles unknown game types gracefully", () => {
    const unknownGame = [
      {
        ...sampleBookings[0],
        id: "b3",
        gameType: "CARROM",
        reference: "GHI789"
      }
    ];
    render(<StaffBookingsPanel bookings={unknownGame} />);

    expect(screen.getByText(/CARROM/)).toBeInTheDocument();
  });

  it("calls confirmBookingAction when Confirm is clicked", async () => {
    const { confirmBookingAction } = await import("@/features/booking/actions");
    vi.mocked(confirmBookingAction).mockResolvedValueOnce({
      ok: true,
      message: "Booking confirmed"
    });

    render(<StaffBookingsPanel bookings={sampleBookings} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(confirmBookingAction).toHaveBeenCalledWith({ bookingId: "b1" });
  });

  it("calls cancelBookingAction when Cancel is clicked", async () => {
    const { cancelBookingAction } = await import("@/features/booking/actions");
    vi.mocked(cancelBookingAction).mockResolvedValueOnce({
      ok: true,
      message: "Booking cancelled"
    });

    render(<StaffBookingsPanel bookings={sampleBookings} />);

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    await userEvent.click(cancelButtons[0]);

    expect(cancelBookingAction).toHaveBeenCalledWith({ bookingId: "b1" });
  });

  it("calls markBookingPaidAction when Mark paid is clicked", async () => {
    const { markBookingPaidAction } = await import("@/features/booking/actions");
    vi.mocked(markBookingPaidAction).mockResolvedValueOnce({
      ok: true,
      message: "Marked as paid"
    });

    render(<StaffBookingsPanel bookings={sampleBookings} />);

    await userEvent.click(screen.getByRole("button", { name: "Mark paid (cash)" }));

    expect(markBookingPaidAction).toHaveBeenCalledWith({ bookingId: "b1" });
  });

  it("shows message after action completes", async () => {
    const { confirmBookingAction } = await import("@/features/booking/actions");
    vi.mocked(confirmBookingAction).mockResolvedValueOnce({
      ok: true,
      message: "Booking confirmed successfully"
    });

    render(<StaffBookingsPanel bookings={sampleBookings} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByText(/Booking confirmed successfully/)).toBeInTheDocument();
  });

  it("disables action buttons while pending", async () => {
    const { confirmBookingAction } = await import("@/features/booking/actions");
    const pendingPromise = new Promise<{ ok: boolean; message: string }>((resolve) => {
      setTimeout(() => resolve({ ok: true, message: "Done" }), 500);
    });
    vi.mocked(confirmBookingAction).mockReturnValueOnce(pendingPromise as any);

    render(<StaffBookingsPanel bookings={sampleBookings} />);

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    expect(confirmBtn).not.toBeDisabled();

    await userEvent.click(confirmBtn);
    expect(confirmBtn).toBeDisabled();
  });
});
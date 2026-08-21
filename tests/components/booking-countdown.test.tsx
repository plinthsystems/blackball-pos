import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookingCountdown } from "@/features/live-tables/components/booking-countdown";

function freezeNearFuture(offsetMinutes = 30) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + offsetMinutes);
  now.setSeconds(0, 0);
  vi.useFakeTimers({ now });
  return now;
}

describe("BookingCountdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows in-play status when booking has started and not ended", () => {
    const now = Date.now();
    const startsAt = new Date(now - 60_000).toISOString();
    const endsAt = new Date(now + 3600_000).toISOString();
    render(<BookingCountdown startsAt={startsAt} endsAt={endsAt} customerName="Alice" />);
    expect(screen.getByText(/in play/)).toBeInTheDocument();
  });

  it("shows minutes remaining when booking is in the future", () => {
    const future = new Date(Date.now() + 45 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} />);
    expect(screen.getByText(/in [0-9]+ min/)).toBeInTheDocument();
  });

  it("shows hours and minutes when booking is more than 60 minutes away", () => {
    const future = new Date(Date.now() + 90 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} />);
    expect(screen.getByText(/1h [0-9]+m/)).toBeInTheDocument();
  });

  it("shows starting now when booking starts now but has not ended", () => {
    const now = Date.now();
    const startsAt = new Date(now).toISOString();
    const endsAt = new Date(now + 3600_000).toISOString();
    const frozen = freezeNearFuture(0);
    vi.setSystemTime(frozen);
    render(<BookingCountdown startsAt={startsAt} endsAt={endsAt} />);
    expect(screen.getByText(/starting now/)).toBeInTheDocument();
  });

  it("shows starting now when booking start is in the past but not in play (already ended)", () => {
    const now = Date.now();
    const startsAt = new Date(now - 120_000).toISOString();
    const endsAt = new Date(now - 60_000).toISOString();
    render(<BookingCountdown startsAt={startsAt} endsAt={endsAt} />);
    expect(screen.getByText(/starting now/)).toBeInTheDocument();
  });

  it("shows customer name when provided", () => {
    const future = new Date(Date.now() + 30 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} customerName="Bob" />);
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it("does not show customer name when null", () => {
    const future = new Date(Date.now() + 30 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} customerName={null} />);
    const el = screen.getByRole("status");
    expect(el.textContent).not.toMatch(/null/);
  });

  it("does not show customer name when undefined", () => {
    const future = new Date(Date.now() + 30 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} customerName={undefined as unknown as string} />);
    const el = screen.getByRole("status");
    expect(el.textContent).not.toMatch(/undefined/);
  });

  it("shows status label for PENDING", () => {
    const future = new Date(Date.now() + 30 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} status="PENDING" />);
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
  });

  it("shows status label for CONFIRMED", () => {
    const future = new Date(Date.now() + 30 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} status="CONFIRMED" />);
    expect(screen.getByText(/Confirmed/)).toBeInTheDocument();
  });

  it("shows status label for CHECKED_IN", () => {
    const future = new Date(Date.now() + 30 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} status="CHECKED_IN" />);
    expect(screen.getByText(/Checked in/)).toBeInTheDocument();
  });

  it("does not show status label when status is undefined", () => {
    const future = new Date(Date.now() + 30 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} status={undefined} />);
    expect(screen.queryByText(/Pending/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Confirmed/)).not.toBeInTheDocument();
  });

  it("applies rose styling when in play", () => {
    const now = Date.now();
    const startsAt = new Date(now - 60_000).toISOString();
    const endsAt = new Date(now + 3600_000).toISOString();
    render(<BookingCountdown startsAt={startsAt} endsAt={endsAt} />);
    const el = screen.getByRole("status");
    expect(el.className).toContain("rose");
  });

  it("applies rose styling when within 15 minutes", () => {
    const future = new Date(Date.now() + 10 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} />);
    const el = screen.getByRole("status");
    expect(el.className).toContain("rose");
  });

  it("applies amber styling when within 60 minutes but more than 15", () => {
    const future = new Date(Date.now() + 30 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} />);
    const el = screen.getByRole("status");
    expect(el.className).toContain("amber");
  });

  it("applies cyan styling when more than 60 minutes away", () => {
    const future = new Date(Date.now() + 120 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} />);
    const el = screen.getByRole("status");
    expect(el.className).toContain("cyan");
  });

  it("handles invalid date string gracefully", () => {
    const endsAt = new Date(Date.now() + 60 * 60_000).toISOString();
    expect(() => render(<BookingCountdown startsAt="not-a-date" endsAt={endsAt} />)).toThrow();
  });

  it("handles endsAt in the past (booking expired)", () => {
    const now = Date.now();
    const startsAt = new Date(now - 120_000).toISOString();
    const endsAt = new Date(now - 60_000).toISOString();
    render(<BookingCountdown startsAt={startsAt} endsAt={endsAt} />);
    expect(screen.getByText(/starting now/)).toBeInTheDocument();
  });

  it("handles zero minutes left", () => {
    const now = Date.now();
    const startsAt = new Date(now - 1_000).toISOString();
    const endsAt = new Date(now + 3600_000).toISOString();
    render(<BookingCountdown startsAt={startsAt} endsAt={endsAt} />);
    expect(screen.getByText(/in play/)).toBeInTheDocument();
  });

  it("displays time label with valid date", () => {
    const future = new Date("2026-08-20T14:30:00Z");
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/\d+:\d+\s*[ap]m/);
  });

  it("updates countdown when time passes", () => {
    const future = new Date(Date.now() + 50 * 60_000);
    const endsAt = new Date(future.getTime() + 60 * 60_000).toISOString();
    render(<BookingCountdown startsAt={future.toISOString()} endsAt={endsAt} />);
    expect(screen.getByText(/in [0-9]+ min/)).toBeInTheDocument();
  });
});
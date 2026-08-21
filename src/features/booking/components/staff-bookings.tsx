"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBookingAction, confirmBookingAction, markBookingPaidAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type StaffBooking = {
  id: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string | null;
  advanceAmount: number;
  startsAt: string;
  endsAt: string;
  tableNumber: string;
  gameType: string;
  customerName: string;
  customerPhone: string | null;
  reference: string;
};

const statusTones: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  PENDING: { label: "Pending", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  CHECKED_IN: { label: "Checked In", tone: "info" },
  PLAYING: { label: "Playing", tone: "info" },
  COMPLETED: { label: "Completed", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "danger" }
};

const gameTypeLabels: Record<string, string> = {
  POOL: "Pool",
  SNOOKER: "Snooker",
  PS5: "PS5"
};

export function StaffBookingsPanel({ bookings }: { bookings: StaffBooking[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    action: (input: { bookingId: string }) => Promise<{ ok: boolean; message: string }>,
    bookingId: string
  ) {
    startTransition(async () => {
      const result = await action({ bookingId });
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-material border border-white/10 bg-slate-950 p-10 text-center">
        <p className="text-3xl">🗓️</p>
        <p className="mt-3 text-sm font-bold text-slate-300">No upcoming bookings</p>
        <p className="mt-1 text-xs text-slate-500">
          Share the store booking link with customers to start receiving reservations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="rounded-material border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</p>
      )}
      {bookings.map((booking) => {
        const status = statusTones[booking.status] ?? statusTones.PENDING;
        return (
          <div
            key={booking.id}
            className="rounded-material border border-white/10 bg-slate-950 p-4 shadow-[0_0_24px_rgba(34,211,238,0.05)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-white">
                    {booking.tableNumber} <span className="text-xs font-bold text-slate-500">({gameTypeLabels[booking.gameType] ?? booking.gameType})</span>
                  </p>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {booking.advanceAmount > 0 && (
                    <Badge tone={booking.paymentStatus === "PAID" ? "success" : "warning"}>
                      {booking.paymentStatus === "PAID"
                        ? `Paid ₹${booking.advanceAmount.toFixed(2)}`
                        : `Due ₹${booking.advanceAmount.toFixed(2)}${booking.paymentProvider ? ` (${booking.paymentProvider})` : ""}`}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-lg font-black text-cyan-300">
                  {formatWhen(booking.startsAt, booking.endsAt)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {booking.customerName}
                  {booking.customerPhone ? ` · ${booking.customerPhone}` : ""}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Ref #{booking.reference}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {booking.status === "PENDING" && (
                    <Button
                      type="button"
                      className="h-8 border-emerald-400 bg-emerald-500 px-3 text-xs hover:bg-emerald-400"
                      disabled={isPending}
                      onClick={() => run(confirmBookingAction, booking.id)}
                    >
                      Confirm
                    </Button>
                  )}
                  {["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status) && (
                    <Button
                      type="button"
                      className="h-8 border-rose-400/40 bg-rose-500/10 px-3 text-xs text-rose-200 hover:bg-rose-500/20"
                      disabled={isPending}
                      onClick={() => run(cancelBookingAction, booking.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                {booking.advanceAmount > 0 && booking.paymentStatus !== "PAID" && (
                  <Button
                    type="button"
                    className="h-8 border-emerald-400/40 bg-emerald-500/10 px-3 text-xs text-emerald-200 hover:bg-emerald-500/20"
                    disabled={isPending}
                    onClick={() => run(markBookingPaidAction, booking.id)}
                  >
                    Mark paid (cash)
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatWhen(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time.format(start)} - ${time.format(end)}`;
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBookingAction, confirmBookingAction, markBookingPaidAction } from "../actions";

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

const statusStyles: Record<string, { label: string; classes: string }> = {
  PENDING: { label: "Pending", classes: "border-amber-300/40 bg-amber-300/10 text-amber-200" },
  CONFIRMED: { label: "Confirmed", classes: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" },
  CHECKED_IN: { label: "Checked In", classes: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200" },
  PLAYING: { label: "Playing", classes: "border-violet-300/40 bg-violet-300/10 text-violet-200" },
  COMPLETED: { label: "Completed", classes: "border-slate-600 bg-slate-800 text-slate-300" },
  CANCELLED: { label: "Cancelled", classes: "border-rose-400/40 bg-rose-400/10 text-rose-200" }
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
      <div className="rounded-xl border border-white/10 bg-slate-950 p-10 text-center">
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
        <p className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</p>
      )}
      {bookings.map((booking) => {
        const style = statusStyles[booking.status] ?? statusStyles.PENDING;
        return (
          <div
            key={booking.id}
            className="rounded-xl border border-white/10 bg-slate-950 p-4 shadow-[0_0_24px_rgba(34,211,238,0.05)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-white">
                    {booking.tableNumber} <span className="text-xs font-bold text-slate-500">({gameTypeLabels[booking.gameType] ?? booking.gameType})</span>
                  </p>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.classes}`}>
                    {style.label}
                  </span>
                  {booking.advanceAmount > 0 && (
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        booking.paymentStatus === "PAID"
                          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                          : "border-amber-400/50 bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      {booking.paymentStatus === "PAID"
                        ? `Paid ₹${booking.advanceAmount.toFixed(2)}`
                        : `Due ₹${booking.advanceAmount.toFixed(2)}${booking.paymentProvider ? ` (${booking.paymentProvider})` : ""}`}
                    </span>
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
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(confirmBookingAction, booking.id)}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  )}
                  {["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status) && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(cancelBookingAction, booking.id)}
                      className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-black text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {booking.advanceAmount > 0 && booking.paymentStatus !== "PAID" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(markBookingPaidAction, booking.id)}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    Mark paid (cash)
                  </button>
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

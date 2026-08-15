"use client";

import { useEffect, useState } from "react";

export function BookingCountdown({
  startsAt,
  endsAt,
  customerName,
  status
}: {
  startsAt: string;
  endsAt: string;
  customerName?: string | null;
  status?: "PENDING" | "CONFIRMED" | "CHECKED_IN";
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const msLeft = start.getTime() - Date.now();
  const minutesLeft = Math.max(0, Math.floor(msLeft / 60_000));
  const inPlay = msLeft <= 0 && Date.now() < end.getTime();
  const timeLabel = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(start);

  let tone: string;
  if (inPlay || minutesLeft <= 15) {
    tone = "border-rose-400/70 bg-rose-500/15 text-rose-200 animate-pulse";
  } else if (minutesLeft <= 60) {
    tone = "border-amber-400/70 bg-amber-500/15 text-amber-200";
  } else {
    tone = "border-cyan-400/50 bg-cyan-500/10 text-cyan-100";
  }

  const statusLabel = status ? { PENDING: "Pending", CONFIRMED: "Confirmed", CHECKED_IN: "Checked in" }[status] : null;
  const customerText = customerName ? ` · ${customerName}` : "";

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${tone}`} role="status">
      {inPlay ? (
        <span>
          📅 Booking {timeLabel}{customerText} · in play
        </span>
      ) : minutesLeft > 0 ? (
        <span>
          📅 Next booking {timeLabel}{customerText}{statusLabel ? ` · ${statusLabel}` : ""} · in{" "}
          {minutesLeft < 60 ? `${minutesLeft} min` : `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m`}
        </span>
      ) : (
        <span>
          📅 Booking {timeLabel}{customerText} · starting now
        </span>
      )}
    </div>
  );
}

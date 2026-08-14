"use client";

import { useEffect, useState } from "react";

export function BookingCountdown({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const minutesLeft = Math.max(0, Math.floor((start.getTime() - Date.now()) / 60_000));
  const timeLabel = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(start);

  let tone: string;
  if (minutesLeft <= 30) {
    tone = "border-rose-400/60 bg-rose-500/15 text-rose-200 animate-pulse";
  } else if (minutesLeft <= 90) {
    tone = "border-amber-400/60 bg-amber-500/15 text-amber-200";
  } else {
    tone = "border-cyan-400/50 bg-cyan-500/10 text-cyan-100";
  }

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${tone}`} role="status">
      {minutesLeft > 0 ? (
        <span>
          📅 Booking {timeLabel} · in {minutesLeft < 60 ? `${minutesLeft} min` : `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m`}
        </span>
      ) : (
        <span>
          📅 Booking {timeLabel} · starting now{Date.now() < end.getTime() ? " (in play)" : ""}
        </span>
      )}
    </div>
  );
}

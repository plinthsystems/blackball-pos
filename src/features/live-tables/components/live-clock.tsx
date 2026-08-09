"use client";

import { useEffect, useState } from "react";

export function LiveClock({ initialSeconds, variant = "inline" }: { initialSeconds: number; variant?: "inline" | "digital" }) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (variant === "digital") {
    return (
      <div>
        <div className="font-mono text-4xl font-black leading-none tracking-normal text-lime-300 drop-shadow-[0_0_14px_rgba(190,242,100,0.38)]">
          {formatDigitalElapsed(seconds)}
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-lime-100/70">Elapsed</div>
      </div>
    );
  }

  return <span>Elapsed {formatElapsed(seconds)}</span>;
}

export function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, totalSeconds % 60);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatDigitalElapsed(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

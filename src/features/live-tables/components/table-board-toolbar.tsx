"use client";

import type { LiveTableCardData, LiveTableStatus } from "../types";

const labels: Record<LiveTableStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked"
};

const visibleSummaryStatuses: LiveTableStatus[] = ["AVAILABLE", "RESERVED", "OCCUPIED"];

export function TableBoardToolbar({ tables }: { tables: LiveTableCardData[] }) {
  const counts = tables.reduce<Record<LiveTableStatus, number>>(
    (acc, table) => {
      acc[table.status] += 1;
      return acc;
    },
    { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, CLEANING: 0, MAINTENANCE: 0, BLOCKED: 0 }
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-normal text-white">Live Floor</h1>
        <p className="text-sm font-semibold text-lime-100/60">Real-time operational view for staff</p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Table status counts">
        {visibleSummaryStatuses.map((status) => (
          <span key={status} className="inline-flex gap-1 rounded-full border border-lime-300/20 bg-slate-950/80 px-3 py-1 text-xs font-bold text-slate-200">
            <span>{labels[status]}</span>
            <strong className="text-lime-300">{counts[status]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

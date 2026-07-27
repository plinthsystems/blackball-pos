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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline bg-surface px-4 py-3">
      <div>
        <h1 className="text-xl font-semibold">Live Tables</h1>
        <p className="text-sm text-neutral-500">Real-time operational view for staff</p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Table status counts">
        {visibleSummaryStatuses.map((status) => (
          <span key={status} className="inline-flex gap-1 rounded-full border border-outline px-3 py-1 text-xs text-neutral-700">
            <span>{labels[status]}</span>
            <strong>{counts[status]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

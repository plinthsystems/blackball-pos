"use client";

import type { LiveTableCardData } from "../types";
import { TableCard } from "./table-card";

export function TableGrid({ tables }: { tables: LiveTableCardData[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 p-4">
      {tables.map((table) => (
        <TableCard key={table.id} table={table} />
      ))}
    </div>
  );
}

"use client";

import type { LiveTableCardData } from "../types";
import { TableCard } from "./table-card";

export function TableGrid({ tables, onAddItems, isHqAdmin }: { tables: LiveTableCardData[]; onAddItems: (billId: string, label: string) => void; isHqAdmin?: boolean }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 p-4">
      {tables.map((table) => (
        <TableCard key={table.id} table={table} onAddItems={onAddItems} isHqAdmin={isHqAdmin} />
      ))}
    </div>
  );
}

"use client";

import type { LiveTableCardData, ProductOption } from "../types";
import { TableCard } from "./table-card";

export function TableGrid({ tables, products, isHqAdmin }: { tables: LiveTableCardData[]; products: ProductOption[]; isHqAdmin?: boolean }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 p-4">
      {tables.map((table) => (
        <TableCard key={table.id} table={table} products={products} isHqAdmin={isHqAdmin} />
      ))}
    </div>
  );
}

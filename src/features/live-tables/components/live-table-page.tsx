"use client";

import type { LiveTableCardData, ProductOption } from "../types";
import { TableBoardToolbar } from "./table-board-toolbar";
import { TableGrid } from "./table-grid";

export function LiveTablePage({ tables, products }: { tables: LiveTableCardData[]; products: ProductOption[] }) {
  return (
    <section className="overflow-hidden rounded-material border border-outline bg-surface shadow-sm">
      <TableBoardToolbar tables={tables} />
      <TableGrid tables={tables} products={products} />
    </section>
  );
}

"use client";

import type { LiveTableCardData } from "../types";
import { TableBoardToolbar } from "./table-board-toolbar";
import { TableGrid } from "./table-grid";

export function LiveTablePage({ tables }: { tables: LiveTableCardData[] }) {
  return (
    <section className="overflow-hidden rounded-material border border-outline bg-surface shadow-sm">
      <TableBoardToolbar tables={tables} />
      <TableGrid tables={tables} />
    </section>
  );
}

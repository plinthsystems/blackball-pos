"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatClockTime } from "@/lib/time";
import type { LiveTableCardData, LiveTableStatus, ProductCategory, ProductOption } from "../types";
import { TableStatusMenu } from "./table-status-menu";
import { StartWalkInDialog } from "@/features/sessions/components/start-walk-in-dialog";
import { ExtendSessionDialog } from "@/features/sessions/components/extend-session-dialog";
import { EndSessionDialog } from "@/features/sessions/components/end-session-dialog";
import { AddSessionItemDialog } from "@/features/sessions/components/add-session-item-dialog";

const statusTone: Record<LiveTableStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  AVAILABLE: "success",
  RESERVED: "info",
  OCCUPIED: "warning",
  CLEANING: "neutral",
  MAINTENANCE: "danger",
  BLOCKED: "neutral"
};

const statusLabel: Record<LiveTableStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked"
};

const billCategoryLabels: Record<ProductCategory, string> = {
  CAFE: "Cafe",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

const billCategories: ProductCategory[] = ["CAFE", "CIGARETTES", "BEVERAGES"];

export function TableCard({ table, products }: { table: LiveTableCardData; products: ProductOption[] }) {
  const [startOpen, setStartOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const session = table.status === "OCCUPIED" ? table.currentSession : null;

  return (
    <article className="rounded-material border border-outline bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{table.number}</h2>
          <p className="text-sm text-neutral-500">{table.gameType === "POOL" ? "Pool" : "Snooker"}</p>
        </div>
        <Badge tone={statusTone[table.status]}>Status: {statusLabel[table.status]}</Badge>
      </div>
      <div className="mt-4 min-h-24 text-sm text-neutral-700">
        {session ? (
          <div className="space-y-1">
            <p className="break-words font-medium">{session.customerName ?? "Walk-in customer"}</p>
            <p>Started {formatClockTime(new Date(session.startedAt))}</p>
            <p>Ends {formatClockTime(new Date(session.plannedEndAt))}</p>
            <div className="mt-3 rounded-material border border-outline bg-neutral-50 p-3">
              <div className="flex justify-between gap-3">
                <span>Table</span>
                <strong>{formatMoney(session.billSummary.tableAmount)}</strong>
              </div>
              {billCategories.map((category) => (
                <div key={category} className="flex justify-between gap-3">
                  <span>{billCategoryLabels[category]}</span>
                  <strong>{formatMoney(session.billSummary.categoryTotals[category])}</strong>
                </div>
              ))}
              <div className="mt-2 flex justify-between gap-3 border-t border-outline pt-2 text-neutral-900">
                <span>Total</span>
                <strong>{formatMoney(session.billSummary.grandTotal)}</strong>
              </div>
            </div>
            <p className="break-words">Staff {session.assignedStaffName ?? "Unassigned"}</p>
          </div>
        ) : (
          <p className="text-neutral-500">No active session</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {session ? (
          <>
            <Button className="h-9 px-3" aria-label={`Add items for table ${table.number}`} onClick={() => setItemsOpen(true)}>
              Add items
            </Button>
            <Button variant="primary" className="h-9 px-3" aria-label={`End session for table ${table.number}`} onClick={() => setEndOpen(true)}>
              End
            </Button>
            <Button className="h-9 px-3" onClick={() => setExtendOpen(true)}>Extend</Button>
          </>
        ) : table.status === "AVAILABLE" ? (
          <Button variant="primary" className="h-9 px-3" aria-label={`Start session for table ${table.number}`} onClick={() => setStartOpen(true)}>
            Start
          </Button>
        ) : null}
        <TableStatusMenu table={table} />
      </div>
      <StartWalkInDialog tableId={table.id} tableNumber={table.number} open={startOpen} onOpenChange={setStartOpen} />
      {session ? (
        <>
          <AddSessionItemDialog
            sessionId={session.id}
            tableNumber={table.number}
            products={products}
            open={itemsOpen}
            onOpenChange={setItemsOpen}
          />
          <ExtendSessionDialog sessionId={session.id} tableNumber={table.number} open={extendOpen} onOpenChange={setExtendOpen} />
          <EndSessionDialog sessionId={session.id} tableNumber={table.number} open={endOpen} onOpenChange={setEndOpen} />
        </>
      ) : null}
    </article>
  );
}

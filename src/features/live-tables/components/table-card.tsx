"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { closeBillAndContinueSessionAction } from "../actions";
import { LiveClock } from "./live-clock";

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
  FOOD: "Food",
  CAFE: "Food",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

const billCategories: Array<"FOOD" | "CIGARETTES" | "BEVERAGES"> = ["FOOD", "CIGARETTES", "BEVERAGES"];

export function TableCard({ table, products }: { table: LiveTableCardData; products: ProductOption[] }) {
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const session = table.status === "OCCUPIED" ? table.currentSession : null;
  const bill = session?.currentBill ?? null;

  return (
    <article className={`rounded-material border p-4 shadow-sm ${session ? "border-primary/30 bg-blue-50/40" : "border-outline bg-surface"}`}>
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
            <p><LiveClock initialSeconds={session.elapsedSeconds} /></p>
            <p>Ends {formatClockTime(new Date(session.plannedEndAt))}</p>
            <div className="mt-3 rounded-material border border-outline bg-surface p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-medium">{bill?.label ?? "Current bill"}</span>
                <strong>{formatMoney(session.billSummary.grandTotal)}</strong>
              </div>
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
            {bill?.items.length ? (
              <div className="mt-3 space-y-1 rounded-material border border-outline bg-surface p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Ordered items</p>
                {bill.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span>{item.name} x{item.quantity}</span>
                    <strong>{formatMoney(item.lineTotalAmount)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="break-words">Staff {session.assignedStaffName ?? "Unassigned"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-neutral-500">No active session</p>
            {table.recentBill ? <p className="font-medium text-neutral-800">Last total {formatMoney(table.recentBill.summary.grandTotal)}</p> : null}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {session ? (
          <>
            <Button className="h-9 px-3" aria-label={`Add items for table ${table.number}`} onClick={() => setItemsOpen(true)}>
              Add items
            </Button>
            <Button
              className="h-9 px-3"
              aria-label={`Close bill and continue table ${table.number}`}
              onClick={async () => {
                await closeBillAndContinueSessionAction({ sessionId: session.id });
                router.refresh();
              }}
            >
              Close bill
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
            billId={session.currentBill?.id ?? ""}
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

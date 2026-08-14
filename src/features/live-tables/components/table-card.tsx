"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatClockTime } from "@/lib/time";
import type { LiveTableCardData, LiveTableGameType, LiveTableStatus, ProductCategory, ProductOption } from "../types";
import { TableStatusMenu } from "./table-status-menu";
import { BookingCountdown } from "./booking-countdown";
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

const gameTypeLabel: Record<LiveTableGameType, string> = {
  POOL: "Pool",
  SNOOKER: "Snooker",
  PS5: "PS5"
};

export function TableCard({ table, products, isHqAdmin }: { table: LiveTableCardData; products: ProductOption[]; isHqAdmin?: boolean }) {
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const session = table.status === "OCCUPIED" ? table.currentSession : null;
  const bill = session?.currentBill ?? null;
  const sessionRate = session?.hourlyRateSnapshot ?? table.hourlyRate;
  const stationRateLabel =
    table.gameType === "PS5" && session?.ps5MemberCount
      ? `${session.ps5MemberCount} ${session.ps5MemberCount === 1 ? "member" : "members"} · ${formatMoney(sessionRate)}/hr`
      : `${gameTypeLabel[table.gameType]} · ${formatMoney(sessionRate)}/hr`;
  const durationSeconds = session
    ? Math.max(1, Math.floor((new Date(session.plannedEndAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
    : 1;
  const progressPercent = session ? Math.min(100, Math.round((session.elapsedSeconds / durationSeconds) * 100)) : 0;

  return (
    <article
      className={
        session
          ? "relative overflow-hidden rounded-material border border-lime-300/35 bg-slate-950 p-4 text-slate-100 shadow-[0_0_34px_rgba(34,197,94,0.18)]"
          : "rounded-material border border-slate-700/70 bg-slate-900/80 p-4 text-slate-100 shadow-sm"
      }
    >
      {session ? <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-lime-300 via-cyan-300 to-amber-300" /> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-normal text-white">{table.number}</h2>
          <p className={session ? "text-sm font-semibold text-lime-100/80" : "text-sm text-slate-400"}>{stationRateLabel}</p>
        </div>
        <Badge tone={statusTone[table.status]}>{statusLabel[table.status]}</Badge>
      </div>
      {table.upcomingBooking ? (
        <BookingCountdown startsAt={table.upcomingBooking.startsAt} endsAt={table.upcomingBooking.endsAt} />
      ) : null}
      <div className={session ? "mt-4 min-h-24 text-sm text-slate-200" : "mt-4 min-h-24 text-sm text-slate-300"}>
        {session ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-material border border-lime-300/20 bg-white/[0.04] p-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">Playing now</p>
                <p className="mt-1 break-words text-sm font-semibold text-white">{session.customerName ?? "Walk-in customer"}</p>
                <p className="text-xs text-slate-400">Staff {session.assignedStaffName ?? "Unassigned"}</p>
              </div>
              <LiveClock initialSeconds={session.elapsedSeconds} variant="digital" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>Started {formatClockTime(new Date(session.startedAt))}</span>
                <span>Ends {formatClockTime(new Date(session.plannedEndAt))}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-lime-300 via-cyan-300 to-amber-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <div className="rounded-material border border-slate-700 bg-slate-900/90 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{bill?.label ?? "Current bill"}</span>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lime-200/70">Live total</p>
                  <strong className="text-xl text-white">{formatMoney(session.billSummary.grandTotal)}</strong>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <BillMetric label="Station" amount={session.billSummary.tableAmount} />
                {billCategories.map((category) => (
                  <BillMetric key={category} label={billCategoryLabels[category]} amount={session.billSummary.categoryTotals[category]} />
                ))}
                <BillMetric label="Total" amount={session.billSummary.grandTotal} />
              </div>
            </div>
            {bill?.items.length ? (
              <div className="space-y-1 rounded-material border border-slate-700 bg-slate-900/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Ordered items</p>
                {bill.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span>{item.name} x{item.quantity}</span>
                    <strong>{formatMoney(item.lineTotalAmount)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {table.recentBill ? <p className="font-medium text-slate-200">Last total {formatMoney(table.recentBill.summary.grandTotal)}</p> : null}
          </div>
        )}
      </div>
      {!isHqAdmin ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {session ? (
            <>
              <Button className="h-9 px-3" aria-label={`Add items for station ${table.number}`} onClick={() => setItemsOpen(true)}>
                Add items
              </Button>
              <Button
                className="h-9 px-3"
                aria-label={`Close bill and continue station ${table.number}`}
                onClick={async () => {
                  await closeBillAndContinueSessionAction({ sessionId: session.id });
                  router.refresh();
                }}
              >
                Close bill
              </Button>
              <Button variant="primary" className="h-9 px-3" aria-label={`End session for station ${table.number}`} onClick={() => setEndOpen(true)}>
                End
              </Button>
              <Button className="h-9 px-3" onClick={() => setExtendOpen(true)}>Extend</Button>
            </>
          ) : table.status === "AVAILABLE" ? (
            <Button variant="primary" className="h-9 px-3" aria-label={`Start session for station ${table.number}`} onClick={() => setStartOpen(true)}>
              Start
            </Button>
          ) : null}
          <TableStatusMenu table={table} />
        </div>
      ) : (
        <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-amber-300 font-semibold">
          <span>👑 Read-Only HQ Oversight</span>
          <span className="text-[10px] text-slate-400 font-normal">Counter actions disabled for HQ</span>
        </div>
      )}
      <StartWalkInDialog
        tableId={table.id}
        tableNumber={table.number}
        gameType={table.gameType}
        hourlyRate={table.hourlyRate}
        ps5MemberRates={table.ps5MemberRates}
        open={startOpen}
        onOpenChange={setStartOpen}
      />
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

function BillMetric({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-material border border-slate-700/80 bg-slate-950/70 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <strong className="text-sm text-white">{formatMoney(amount)}</strong>
    </div>
  );
}

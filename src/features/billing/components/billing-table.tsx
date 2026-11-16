"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import type { BillingRecord } from "../types";
import { BillPaymentPanel } from "./bill-payment-panel";

const kindLabel: Record<string, string> = {
  SESSION: "Table session",
  COUNTER: "Counter sale"
};

const categoryLabels: Record<string, string> = {
  FOOD: "Food",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

export function BillingTable({ records, expandedId, onToggle }: { records: BillingRecord[]; expandedId: string | null; onToggle: (id: string) => void }) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-12 text-center">
        <span className="material-symbols-outlined text-3xl text-slate-500" aria-hidden="true">receipt_long</span>
        <p className="mt-3 text-sm font-bold text-slate-200">No bills found</p>
        <p className="mt-1 text-xs text-slate-500">Try a different date range or bill type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-white">Bills</h2>
        <span className="text-xs text-slate-500">{records.length} shown · select a receipt for details</span>
      </div>
      <div className="space-y-3">
        {records.map((record) => {
          const isExpanded = expandedId === record.id;
          return (
            <div key={record.id} className={`overflow-hidden rounded-xl border bg-slate-950/80 transition ${isExpanded ? "border-lime-300/40" : "border-slate-800 hover:border-slate-600"}`}>
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "View"} receipt for ${record.tableNumber ?? "counter sale"}, ${formatDate(record.openedAt)}, ${formatMoney(record.totalAmount)}`}
                className="w-full p-4 text-left sm:p-5"
                onClick={() => onToggle(record.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`material-symbols-outlined mt-0.5 text-xl ${isExpanded ? "text-lime-300" : "text-slate-500"}`} aria-hidden="true">{isExpanded ? "expand_less" : "receipt_long"}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-base font-bold text-white">{record.tableNumber ?? "Counter sale"}</p>
                        {record.kind === "SESSION" ? <span className="text-xs text-slate-500">{kindLabel[record.kind]}</span> : null}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${record.status === "OPEN" ? "bg-cyan-400/15 text-cyan-300" : record.status === "CANCELLED" ? "bg-slate-700 text-slate-300" : record.paymentStatus === "PAID" || !record.paymentStatus ? "bg-emerald-400/15 text-emerald-300" : record.paymentStatus === "PARTIAL" ? "bg-amber-400/15 text-amber-300" : "bg-rose-400/15 text-rose-300"}`}>
                          {record.status === "OPEN" ? "In progress" : record.status === "CANCELLED" ? "Cancelled" : record.paymentStatus === "PAID" || !record.paymentStatus ? "Paid" : record.paymentStatus === "PARTIAL" ? "Partially paid" : "Due"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(record.openedAt)}{record.sessionLabel ? ` · ${record.sessionLabel}` : ""}
                        {record.assignedStaffName ? ` · ${record.assignedStaffName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total</p>
                    <strong className="text-xl font-black text-lime-300 sm:text-2xl">{formatMoney(record.totalAmount)}</strong>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 sm:grid-cols-3">
                  <ReceiptMetric label="Table time" value={record.tableDurationMinutes ? `${formatDuration(record.tableDurationSeconds ?? record.tableDurationMinutes * 60)} @ ${formatMoney(record.tableHourlyRate)}/hr` : "—"} />
                  <ReceiptMetric label="Table charge" value={formatMoney(record.tableAmount)} />
                  <ReceiptMetric label="Items" value={`${record.items.length} ${record.items.length === 1 ? "item" : "items"} · ${formatMoney(record.itemTotal)}`} />
                </div>
              </button>
              {isExpanded && <BillDetails record={record} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReceiptMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function BillDetails({ record }: { record: BillingRecord }) {
  const totalItems = record.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="border-x border-b border-slate-700 bg-slate-950/60 px-4 py-4 md:px-8">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer info */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Customer</h4>
          {record.customerName ? (
            <p className="text-sm font-bold text-white">{record.customerName}</p>
          ) : (
            <p className="text-sm text-slate-500">Walk-in</p>
          )}
          {record.customerPhone && <p className="text-xs text-slate-400">{record.customerPhone}</p>}
        </div>

        {/* Session label */}
        {record.sessionLabel && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Session</h4>
            <p className="text-sm text-slate-300">{record.sessionLabel}</p>
          </div>
        )}

        {/* Summary */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Table time</span>
              <span className="text-right text-white font-bold">
                {record.tableDurationMinutes ? `${formatDuration(record.tableDurationSeconds ?? record.tableDurationMinutes * 60)} · ${formatMoney(record.tableHourlyRate)}/hr` : "No table time"}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Table charge</span>
              <span className="text-white font-bold">{formatMoney(record.tableAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Items subtotal ({totalItems})</span>
              <span className="text-white font-bold">{formatMoney(record.itemSubtotal ?? record.itemTotal)}</span>
            </div>
            {(record.discountAmount ?? 0) > 0 ? (
              <div className="flex justify-between text-emerald-300">
                <span>Food menu discount (20%)</span>
                <span className="font-bold">−{formatMoney(record.discountAmount ?? 0)}</span>
              </div>
            ) : null}
            {record.discountAmount ? (
              <div className="flex justify-between text-slate-400">
                <span>Items after discount</span>
                <span className="text-white font-bold">{formatMoney(record.itemTotal)}</span>
              </div>
            ) : null}
            <div className="mt-2 border-t border-slate-700 pt-2 flex justify-between">
              <span className="text-sm font-black text-white">Grand total</span>
              <strong className="text-lg font-black text-lime-300">{formatMoney(record.totalAmount)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Items breakdown */}
      {record.items.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Item Breakdown</h4>
          <div className="space-y-1">
            {record.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-material border border-slate-800 bg-slate-900/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{item.name}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {categoryLabels[item.category] ?? item.category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">×{item.quantity}</span>
                  <span className="text-xs text-slate-400">{formatMoney(item.unitPrice)} each</span>
                  <strong className="text-sm text-white">{formatMoney(item.lineTotal)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {record.categorySummaries.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">By Category</h4>
          <div className="grid gap-2 md:grid-cols-3">
            {record.categorySummaries.map(({ category, total }) => (
              <div key={category} className="rounded-material border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{categoryLabels[category] ?? category}</p>
                <p className="mt-1 text-lg font-black text-lime-300">{formatMoney(total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {record.status === "CLOSED" ? <BillPaymentPanel record={record} /> : null}
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

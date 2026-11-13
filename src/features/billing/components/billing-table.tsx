"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import type { BillingRecord } from "../types";

const statusStyles: Record<string, { label: string; classes: string }> = {
  OPEN: { label: "Open", classes: "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" },
  CLOSED: { label: "Closed", classes: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" },
  CANCELLED: { label: "Cancelled", classes: "border-rose-400/50 bg-rose-400/10 text-rose-200" }
};

const kindLabel: Record<string, string> = {
  SESSION: "Session",
  COUNTER: "Counter"
};

const categoryLabels: Record<string, string> = {
  FOOD: "Food",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

export function BillingTable({ records, expandedId, onToggle }: { records: BillingRecord[]; expandedId: string | null; onToggle: (id: string) => void }) {
  if (records.length === 0) {
    return (
      <div className="rounded-material border border-slate-700 bg-slate-900/80 p-10 text-center">
        <p className="text-3xl">📋</p>
        <p className="mt-3 text-sm font-bold text-slate-300">No billing records found</p>
        <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or date range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Closed bills</h2>
        <span className="text-xs text-slate-500">Select a bill to see the full receipt</span>
      </div>
      <div className="space-y-3">
        {records.map((record) => {
          const isExpanded = expandedId === record.id;
          const style = statusStyles[record.status] ?? statusStyles.OPEN;

          return (
            <div key={record.id}>
              <button
                type="button"
                className={`w-full rounded-material border border-slate-700 bg-slate-900/80 p-4 text-left shadow-material transition-colors hover:border-lime-300/30 hover:bg-slate-800/80 ${isExpanded ? "border-lime-300/40 bg-slate-800/60" : ""}`}
                onClick={() => onToggle(record.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-slate-400">{isExpanded ? "expand_less" : "expand_more"}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-white">{record.tableNumber ?? "Counter sale"}</p>
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">{kindLabel[record.kind] ?? record.kind}</span>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.classes}`}>{style.label}</span>
                      </div>
                      <p className="mt-1 flex flex-wrap gap-x-1 text-xs text-slate-500">
                        <span>{formatDate(record.openedAt)}</span>
                        <span>· {record.closedAt ? `Closed ${formatDate(record.closedAt)}` : "Live bill"}</span>
                        {record.assignedStaffName ? <span>· <span className="text-slate-400">{record.assignedStaffName}</span></span> : null}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Grand total</p>
                    <strong className="text-2xl font-black text-lime-300">{formatMoney(record.totalAmount)}</strong>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-3">
                  <ReceiptMetric label="Table time" value={record.tableDurationMinutes ? `${record.tableDurationMinutes} min · ${formatMoney(record.tableHourlyRate)}/hr` : "No table time"} />
                  <ReceiptMetric label="Table charge" value={formatMoney(record.tableAmount)} />
                  <ReceiptMetric label="Items" value={`${record.items.length} · ${formatMoney(record.itemTotal)}`} />
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
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
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
                {record.tableDurationMinutes ? `${record.tableDurationMinutes} min · ${formatMoney(record.tableHourlyRate)}/hr` : "No table time"}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Table charge</span>
              <span className="text-white font-bold">{formatMoney(record.tableAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Items ({totalItems})</span>
              <span className="text-white font-bold">{formatMoney(record.itemTotal)}</span>
            </div>
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
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

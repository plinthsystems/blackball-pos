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
    <div className="overflow-hidden rounded-material border border-slate-700 bg-slate-900/80 shadow-material">
      {/* Table header */}
      <div className="hidden border-b border-slate-700/70 bg-slate-900/90 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 md:grid md:grid-cols-12">
        <div className="col-span-2">Date & Time</div>
        <div className="col-span-1">Kind</div>
        <div className="col-span-2">Table</div>
        <div className="col-span-1">Staff</div>
        <div className="col-span-2">Items</div>
        <div className="col-span-1">Total</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table body */}
      <div className="divide-y divide-slate-700/50">
        {records.map((record) => {
          const isExpanded = expandedId === record.id;
          const style = statusStyles[record.status] ?? statusStyles.OPEN;

          return (
            <div key={record.id}>
              {/* Row */}
              <div
                className={`group cursor-pointer transition-colors hover:bg-slate-800/50 ${isExpanded ? "bg-slate-800/30" : ""}`}
                onClick={() => onToggle(record.id)}
              >
                <div className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-12">
                  {/* Date & Time */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">{isExpanded ? "expand_less" : "expand_more"}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{formatDate(record.openedAt)}</p>
                      <p className="text-[10px] text-slate-500">
                        {record.closedAt ? `Closed ${formatDate(record.closedAt)}` : "Still open"}
                      </p>
                    </div>
                  </div>

                  {/* Kind */}
                  <div className="col-span-1 flex items-center">
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {kindLabel[record.kind] ?? record.kind}
                    </span>
                  </div>

                  {/* Table */}
                  <div className="col-span-2 flex items-center text-sm text-slate-300">
                    {record.tableNumber ? (
                      <span className="font-bold text-white">Table {record.tableNumber}</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>

                  {/* Staff */}
                  <div className="col-span-1 flex items-center text-sm text-slate-400">
                    {record.assignedStaffName ? <span>{record.assignedStaffName}</span> : <span className="text-slate-600">—</span>}
                  </div>

                  {/* Items */}
                  <div className="col-span-2 flex items-center text-sm text-slate-400">
                    <span>{record.items.length} items · {formatMoney(record.itemTotal)}</span>
                  </div>

                  {/* Total */}
                  <div className="col-span-1 flex items-center">
                    <strong className="text-lg font-black text-lime-300">{formatMoney(record.totalAmount)}</strong>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 flex items-center">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.classes}`}>
                      {style.label}
                    </span>
                  </div>

                  {/* Actions (desktop) */}
                  <div className="col-span-2 hidden items-center justify-end gap-2 md:flex">
                    {record.status === "OPEN" && (
                      <>
                        <span className="text-xs text-amber-300 font-semibold">⏳ Pending</span>
                      </>
                    )}
                    {record.customerName && (
                      <span className="text-xs text-slate-400">{record.customerName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && <BillDetails record={record} />}
            </div>
          );
        })}
      </div>
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
              <span>Items</span>
              <span className="text-white font-bold">{totalItems}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Table charge</span>
              <span className="text-white font-bold">{formatMoney(record.tableAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Items total</span>
              <span className="text-white font-bold">{formatMoney(record.itemTotal)}</span>
            </div>
            <div className="mt-2 border-t border-slate-700 pt-2 flex justify-between">
              <span className="text-sm font-black text-white">Grand Total</span>
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
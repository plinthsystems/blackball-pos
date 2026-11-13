"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { BillingFilters } from "./billing-filters";
import { BillingTable } from "./billing-table";
import type { BillingPageData } from "../types";

export function BillingPage({ data }: { data: BillingPageData }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const toggle = (id: string) => {
    startTransition(() => {
      setExpandedId((prev) => (prev === id ? null : id));
    });
  };

  // Pagination
  const currentPage = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const totalPages = Math.ceil(data.total / (data.filters.pageSize ?? 50));
  const salesTotal = data.records.reduce((sum, record) => sum + record.totalAmount, 0);
  const tableMinutes = data.records.reduce((sum, record) => sum + record.tableDurationMinutes, 0);
  const itemTotal = data.records.reduce((sum, record) => sum + record.itemTotal, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-lime-200/80">The Nine Snooker & Cafe</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-normal text-white">Billing</h1>
          <p className="mt-1 text-sm text-slate-400">Every receipt adds table time and items into one clear total.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Today's sales" value={formatMoney(salesTotal)} hint={`${data.total} record${data.total !== 1 ? "s" : ""}`} />
        <SummaryCard label="Table time" value={`${tableMinutes} min`} hint="from session bills" />
        <SummaryCard label="Items" value={formatMoney(itemTotal)} hint="food, cafe, drinks" />
        <SummaryCard label="Open receipts" value={String(data.records.filter((record) => record.status === "OPEN").length)} hint="still in progress" />
      </div>

      {/* Filters */}
      <BillingFilters
        staffOptions={data.staffOptions}
        tableOptions={data.tables}
        accountType="MANAGER"
      />

      {/* Table */}
      <BillingTable records={data.records} expandedId={expandedId} onToggle={toggle} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={`${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(currentPage - 1) }).toString()}`}>
                <button
                  type="button"
                  disabled={isPending}
                  className="rounded-material border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  ← Previous
                </button>
              </Link>
            )}
            {currentPage < totalPages && (
              <Link href={`${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(currentPage + 1) }).toString()}`}>
                <button
                  type="button"
                  disabled={isPending}
                  className="rounded-material border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Next →
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-lime-300/15 bg-slate-950/80 p-4 shadow-material">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl font-black text-white">{value}</strong>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

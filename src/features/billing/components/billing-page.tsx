"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useSearchParams, usePathname } from "next/navigation";
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-normal text-white">Billing Records</h1>
          <p className="mt-1 text-sm text-slate-400">
            {data.total} record{data.total !== 1 ? "s" : ""} found
          </p>
        </div>
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

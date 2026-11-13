"use client";

import { useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { textInputProps } from "@/components/ui/field";

const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" }
] as const;

const BILL_KINDS = [
  { value: "ALL", label: "All bills" },
  { value: "SESSION", label: "Table time" },
  { value: "COUNTER", label: "Counter" }
] as const;

type DateRange = (typeof DATE_RANGES)[number]["value"];
type BillKind = (typeof BILL_KINDS)[number]["value"];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange(search: URLSearchParams): DateRange | null {
  const from = search.get("dateFrom");
  const to = search.get("dateTo");
  const today = new Date();
  const todayString = formatDate(today);
  if (from === todayString && to === todayString) return "today";
  for (const [value, days] of [["7d", 7], ["30d", 30]] as const) {
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);
    if (from === formatDate(start) && to === todayString) return value;
  }
  return from || to ? null : "all";
}

export function BillingFilters({ total: _total }: {
  total?: number;
  staffOptions?: { id: string; name: string }[];
  tableOptions?: { id: string; number: string }[];
  accountType?: string;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const params = new URLSearchParams(searchParams.toString());
  const activeRange = getDateRange(params);
  const activeKind = (params.get("kind") as BillKind | null) ?? "ALL";
  const hasFilters = Boolean(params.get("dateFrom") || params.get("dateTo") || (activeKind && activeKind !== "ALL") || params.get("q"));

  function apply(next: { range?: DateRange; kind?: BillKind }) {
    const updated = new URLSearchParams(searchParams.toString());
    updated.delete("page");
    if (next.range) {
      if (next.range === "all") {
        updated.delete("dateFrom");
        updated.delete("dateTo");
      } else {
        const days = next.range === "today" ? 1 : next.range === "7d" ? 7 : 30;
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - days + 1);
        updated.set("dateFrom", formatDate(start));
        updated.set("dateTo", formatDate(end));
      }
    }
    if (next.kind) {
      if (next.kind === "ALL") updated.delete("kind");
      else updated.set("kind", next.kind);
    }
    const query = updated.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  function clear() {
    startTransition(() => router.push(pathname));
  }

  function searchBills(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("q") ?? "").trim();
    const updated = new URLSearchParams(searchParams.toString());
    updated.delete("page");
    if (query) updated.set("q", query);
    else updated.delete("q");
    const next = updated.toString();
    startTransition(() => router.push(next ? `${pathname}?${next}` : pathname));
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:p-4" aria-label="Billing filters">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <FilterGroup
          icon="calendar_month"
          label="Date range"
          options={DATE_RANGES.map(({ value, label }) => ({ value, label }))}
          value={activeRange ?? ""}
          onChange={(value) => apply({ range: value as DateRange })}
        />
        <div className="hidden h-10 w-px bg-slate-800 lg:block" aria-hidden="true" />
        <FilterGroup
          icon="receipt_long"
          label="Bill type"
          options={BILL_KINDS.map(({ value, label }) => ({ value, label }))}
          value={activeKind}
          onChange={(value) => apply({ kind: value as BillKind })}
        />
        {hasFilters ? (
          <button type="button" disabled={isPending} onClick={clear} className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-slate-800 px-3 text-xs font-semibold text-slate-400 transition hover:border-slate-600 hover:text-white lg:ml-auto lg:self-center">
            <span className="material-symbols-outlined text-base" aria-hidden="true">filter_alt_off</span>
            Clear filters
          </button>
        ) : null}
      </div>
      <form className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row" onSubmit={searchBills} role="search">
        <label className="sr-only" htmlFor="billing-search">Search bills by name</label>
        <input
          {...textInputProps()}
          key={params.get("q") ?? ""}
          id="billing-search"
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search customer, table or item"
          className="h-10 w-full rounded-material border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500 sm:max-w-md"
        />
        <button type="submit" disabled={isPending} className="h-10 rounded-material border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:border-lime-300/40 hover:text-white disabled:opacity-60">{isPending ? "Searching…" : "Search bills"}</button>
      </form>
    </section>
  );
}

function FilterGroup<T extends readonly { value: string; label: string }[]>({
  icon,
  label,
  options,
  value,
  onChange
}: {
  icon: string;
  label: string;
  options: T;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <span className="material-symbols-outlined text-base text-slate-500" aria-hidden="true">{icon}</span>
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70 ${selected ? "border-lime-300/30 bg-lime-300/10 text-lime-100" : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

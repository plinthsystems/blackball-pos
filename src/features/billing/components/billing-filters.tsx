"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const KIND_OPTIONS = [
  { value: "ALL", label: "All kinds" },
  { value: "SESSION", label: "Sessions" },
  { value: "COUNTER", label: "Counter sales" }
] as const;

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All categories" },
  { value: "FOOD", label: "Food" },
  { value: "CIGARETTES", label: "Cigarettes" },
  { value: "BEVERAGES", label: "Beverages" }
] as const;

function dateInputProps() {
  return {
    type: "date" as const,
    className:
      "h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 focus:border-lime-400 focus:outline-none"
  };
}

export function BillingFilters({
  staffOptions: _staffOptions,
  tableOptions: _tableOptions,
  accountType: _accountType
}: {
  staffOptions: { id: string; name: string }[];
  tableOptions: { id: string; number: string }[];
  accountType: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (params: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [key, value] of Object.entries(params)) {
        if (!value || value === "ALL") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page");
      return next.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string) => {
    const query = createQueryString({ [key]: value });
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const hasActiveFilters = Boolean(
    searchParams?.get("status") ||
      searchParams?.get("kind") ||
      searchParams?.get("category") ||
      searchParams?.get("dateFrom") ||
      searchParams?.get("dateTo")
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-material sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Sale type"
          options={KIND_OPTIONS}
          value={searchParams?.get("kind") ?? "ALL"}
          onChange={(value) => handleFilterChange("kind", value)}
        />
        <FilterGroup
          label="Category"
          options={CATEGORY_OPTIONS}
          value={searchParams?.get("category") ?? "ALL"}
          onChange={(value) => handleFilterChange("category", value)}
        />
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="min-w-36 text-[10px] font-black uppercase tracking-widest text-slate-500">
            From
            <input {...dateInputProps()} aria-label="From" value={searchParams?.get("dateFrom") ?? ""} onChange={(event) => handleFilterChange("dateFrom", event.target.value)} />
          </label>
          <label className="min-w-36 text-[10px] font-black uppercase tracking-widest text-slate-500">
            To
            <input {...dateInputProps()} aria-label="To" value={searchParams?.get("dateTo") ?? ""} onChange={(event) => handleFilterChange("dateTo", event.target.value)} />
          </label>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => router.push(pathname)}
              className="h-10 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 text-xs font-black text-rose-200 transition hover:bg-rose-400/20"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterGroup<T extends readonly { value: string; label: string }[]>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: T;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${selected ? "bg-lime-300 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

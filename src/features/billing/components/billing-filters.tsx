"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" }
] as const;

const KIND_OPTIONS = [
  { value: "ALL", label: "All Kinds" },
  { value: "SESSION", label: "Session" },
  { value: "COUNTER", label: "Counter" }
] as const;

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  { value: "FOOD", label: "Food" },
  { value: "CIGARETTES", label: "Cigarettes" },
  { value: "BEVERAGES", label: "Beverages" }
] as const;

function dateInputProps() {
  return {
    type: "date",
    className:
      "w-40 rounded-material border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-lime-400 focus:outline-none"
  };
}

export function BillingFilters({
  staffOptions,
  tableOptions,
  accountType
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
      const newParams = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      return newParams.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string | undefined) => {
    const queryString = createQueryString({ [key]: value });
    router.push(`${pathname}?${queryString}`);
  };

  const handleClearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters =
    searchParams?.get("status") ||
    searchParams?.get("kind") ||
    searchParams?.get("category") ||
    searchParams?.get("dateFrom") ||
    searchParams?.get("dateTo") ||
    searchParams?.get("staffId") ||
    searchParams?.get("tableId");

  return (
    <div className="rounded-material border border-slate-700 bg-slate-900/80 p-4 shadow-material">
      <div className="flex flex-wrap items-end gap-3">
        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Status
          </label>
          <select
            id="status"
            defaultValue={searchParams?.get("status") ?? "ALL"}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="rounded-material border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-lime-400 focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Kind filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="kind" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Kind
          </label>
          <select
            id="kind"
            defaultValue={searchParams?.get("kind") ?? "ALL"}
            onChange={(e) => handleFilterChange("kind", e.target.value)}
            className="rounded-material border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-lime-400 focus:outline-none"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Category
          </label>
          <select
            id="category"
            defaultValue={searchParams?.get("category") ?? "ALL"}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="rounded-material border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-lime-400 focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label htmlFor="dateFrom" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            From
          </label>
          <input {...dateInputProps()} id="dateFrom" defaultValue={searchParams?.get("dateFrom") ?? ""} onChange={(e) => handleFilterChange("dateFrom", e.target.value)} />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <label htmlFor="dateTo" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            To
          </label>
          <input {...dateInputProps()} id="dateTo" defaultValue={searchParams?.get("dateTo") ?? ""} onChange={(e) => handleFilterChange("dateTo", e.target.value)} />
        </div>

        {/* Staff filter (managers and above) */}
        {accountType !== "STORE_USER" && staffOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="staffId" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Staff
            </label>
            <select
              id="staffId"
              defaultValue={searchParams?.get("staffId") ?? ""}
              onChange={(e) => handleFilterChange("staffId", e.target.value)}
              className="rounded-material border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-lime-400 focus:outline-none"
            >
              <option value="">All Staff</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Table filter (managers and above) */}
        {accountType !== "STORE_USER" && tableOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="tableId" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Table
            </label>
            <select
              id="tableId"
              defaultValue={searchParams?.get("tableId") ?? ""}
              onChange={(e) => handleFilterChange("tableId", e.target.value)}
              className="rounded-material border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-lime-400 focus:outline-none"
            >
              <option value="">All Tables</option>
              {tableOptions.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.number}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="ml-auto rounded-material border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { formatStoreDateKey } from "@/lib/time";
import { createExpenseAction } from "../actions";
import type { ExpenseCategory, ExpenseFilters, ExpensePageData, ExpenseProductOption, ExpenseRecord } from "../types";

const categoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "INVENTORY_PURCHASE", label: "Inventory purchase" },
  { value: "GROCERIES", label: "Groceries" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "RENT", label: "Rent" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" }
];

const periodOptions: Array<{ value: ExpenseFilters["period"]; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" }
];

export function ExpensesPage({ data, products }: { data: ExpensePageData; products: ExpenseProductOption[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateFilters(next: Partial<ExpenseFilters>) {
    const filters = { ...data.filters, ...next };
    const params = new URLSearchParams();
    if (filters.period !== "30d") params.set("period", filters.period);
    if (filters.category !== "ALL") params.set("category", filters.category);
    const query = params.toString();
    startTransition(() => router.push(query ? `/expenses?${query}` : "/expenses"));
  }

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Expenses</h1>
          <p className="mt-1 text-sm text-slate-400">Record purchases and operating costs. Link stock purchases to update Inventory automatically.</p>
        </div>
        <Button type="button" variant="primary" onClick={() => setAddOpen(true)}>Add expense</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total expenses" value={formatMoney(data.totalAmount)} detail={`${data.count} entries in this period`} />
        <SummaryCard label="Paid in cash" value={formatMoney(data.cashAmount)} detail="Cash expenses" />
        <SummaryCard label="Paid by UPI" value={formatMoney(data.upiAmount)} detail="UPI expenses" />
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:p-4" aria-label="Expense filters">
        <div className="space-y-3">
          <FilterPills label="Date" options={periodOptions} value={data.filters.period} onChange={(period) => updateFilters({ period })} pending={isPending} />
          <FilterPills
            label="Category"
            options={[{ value: "ALL" as const, label: "All" }, ...categoryOptions]}
            value={data.filters.category}
            onChange={(category) => updateFilters({ category })}
            pending={isPending}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70" aria-label="Expense list">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <h2 className="font-bold text-white">Recent expenses</h2>
          {data.count > data.records.length ? <span className="text-xs text-slate-500">Showing latest {data.records.length} of {data.count}</span> : null}
        </div>
        {data.records.length ? (
          <div className="divide-y divide-slate-800">
            {data.records.map((expense) => <ExpenseRow key={expense.id} expense={expense} />)}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-200">No expenses in this period</p>
            <p className="mt-1 text-xs text-slate-500">Add a purchase or operating cost to start tracking spend.</p>
          </div>
        )}
      </section>

      <ExpenseFormDialog open={addOpen} onOpenChange={setAddOpen} products={products} />
    </section>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl font-black text-white">{value}</strong>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
  pending
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {options.map((option) => (
        <button key={option.value} type="button" disabled={pending} aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${value === option.value ? "bg-lime-300 text-slate-950" : "border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"}`}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: ExpenseRecord }) {
  return (
    <article className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-white">{expense.vendorName || expense.items.map((item) => item.name).join(", ")}</strong>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">{labelForCategory(expense.category)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatDateTime(expense.spentAt)} · {expense.paymentMethod === "CASH" ? "Cash" : "UPI"}</p>
        </div>
        <strong className="text-lg font-black text-white">{formatMoney(expense.amount)}</strong>
      </div>
      <div className="mt-3 space-y-1 border-t border-slate-800 pt-3">
        {expense.items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-300">
              {item.name}
              {item.packs ? <span className="text-slate-500"> · {item.packs} {item.packs === 1 ? "pack" : "packs"}{item.stockUnitsAdded > 0 ? ` → +${item.stockUnitsAdded} ${item.stockUnit ?? "units"}` : ""}</span> : null}
            </span>
            <span className="font-semibold text-slate-400">{formatMoney(item.amount)}</span>
          </div>
        ))}
        {expense.notes ? <p className="pt-1 text-xs text-slate-500">{expense.notes}</p> : null}
      </div>
    </article>
  );
}

type DraftLine = { id: number; description: string; amount: string; productId: string; packs: string };

function ExpenseFormDialog({ open, onOpenChange, products }: { open: boolean; onOpenChange: (open: boolean) => void; products: ExpenseProductOption[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory>("GROCERIES");
  const [vendorName, setVendorName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [spentAt, setSpentAt] = useState(() => formatStoreDateKey(new Date()));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ id: 1, description: "", amount: "", productId: "", packs: "" }]);
  const [nextLineId, setNextLineId] = useState(2);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const total = Math.round(lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0) * 100) / 100;

  function changeCategory(next: ExpenseCategory) {
    setCategory(next);
    if (next !== "INVENTORY_PURCHASE") {
      setLines((current) => current.map((line) => ({ ...line, productId: "", packs: "" })));
    }
  }

  function changeLine(id: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await createExpenseAction({
        category,
        vendorName,
        paymentMethod,
        spentAt,
        notes,
        items: lines.map((line) => ({
          description: line.description,
          amount: Number(line.amount),
          ...(line.productId ? { productId: line.productId, packs: Number(line.packs) } : {})
        }))
      });
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok) {
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  function updateOpen(nextOpen: boolean) {
    if (isPending) return;
    if (nextOpen) setMessage(null);
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} title="Add expense" onOpenChange={updateOpen} size="wide">
      <form onSubmit={submit} className="space-y-5 pr-1">
        <p className="-mt-1 text-xs leading-relaxed text-slate-400">Record a purchase or running cost. Use <span className="font-semibold text-slate-300">Add item</span> when one receipt covers multiple things.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ExpenseSelect
            label="Category"
            value={category}
            onChange={(value) => changeCategory(value as ExpenseCategory)}
            options={categoryOptions}
          />
          <ExpenseField label="Date">
            <input type="date" value={spentAt} onChange={(event) => setSpentAt(event.target.value)} required className={expenseInputClass} />
          </ExpenseField>
          <ExpenseField label="Supplier / store" hint="Optional">
            <input value={vendorName} onChange={(event) => setVendorName(event.target.value)} maxLength={120} className={expenseInputClass} placeholder="Supplier name" />
          </ExpenseField>
          <ExpenseSelect
            label="Paid by"
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value as "CASH" | "UPI")}
            options={[{ value: "CASH", label: "Cash" }, { value: "UPI", label: "UPI" }]}
          />
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/55 p-4" aria-label="Expense items">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Items in this expense</h3>
              <p className="mt-1 text-xs text-slate-400">Add one or more items from the same purchase.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => { setLines((current) => [...current, { id: nextLineId, description: "", amount: "", productId: "", packs: "" }]); setNextLineId((id) => id + 1); }}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
              Add item
            </Button>
          </div>

          {category === "INVENTORY_PURCHASE" ? (
            <div className="flex gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/5 px-3 py-2.5 text-xs leading-relaxed text-cyan-100">
              <span className="material-symbols-outlined shrink-0 text-base" aria-hidden="true">inventory_2</span>
              <p>Choose a tracked drink or cigarette and enter the number of packs. Inventory increases by packs × units per pack when you save.</p>
            </div>
          ) : null}

          <div className="space-y-3">
            {lines.map((line, index) => {
              const product = products.find((item) => item.id === line.productId);
              return (
                <div key={line.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 sm:p-4">
                  <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
                    <ExpenseField label={`Item ${index + 1}`}>
                      <input value={line.description} onChange={(event) => changeLine(line.id, { description: event.target.value })} maxLength={120} required disabled={Boolean(product)} className={`${expenseInputClass} disabled:cursor-not-allowed disabled:opacity-70`} placeholder="e.g. Milk, cleaning supplies" />
                    </ExpenseField>
                    <ExpenseField label="Amount (₹)">
                      <input type="number" min="0.01" step="0.01" inputMode="decimal" value={line.amount} onChange={(event) => changeLine(line.id, { amount: event.target.value })} required className={expenseInputClass} placeholder="0.00" />
                    </ExpenseField>
                    {lines.length > 1 ? (
                      <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} aria-label={`Remove expense item ${index + 1}`} className="flex h-11 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold text-rose-300 transition hover:bg-rose-300/10 hover:text-rose-200">
                        <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                        Remove
                      </button>
                    ) : null}
                  </div>

                  {category === "INVENTORY_PURCHASE" ? (
                    <div className="grid gap-3 border-t border-slate-800 pt-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                      <ExpenseSelect
                        label="Tracked inventory item"
                        value={line.productId}
                        onChange={(value) => {
                          const selected = products.find((item) => item.id === value);
                          changeLine(line.id, { productId: selected?.id ?? "", description: selected?.name ?? line.description, packs: selected ? (line.packs || "1") : "" });
                        }}
                        options={[{ value: "", label: "No inventory item" }, ...products.map((item) => ({ value: item.id, label: item.name }))]}
                        compact
                      />
                      {product ? (
                        <ExpenseField label="Packs / boxes">
                          <input type="number" min={1} max={999999} step={1} inputMode="numeric" value={line.packs} onChange={(event) => changeLine(line.id, { packs: event.target.value })} required className={expenseInputClass} />
                          <span className="mt-1 block text-[11px] font-medium text-cyan-200">Adds {(Number(line.packs) || 0) * product.unitsPerPack} {product.stockUnit}</span>
                        </ExpenseField>
                      ) : (
                        <p className="self-center text-xs text-slate-500">This item will be recorded as an expense only.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-lime-300/15 bg-lime-300/5 px-4 py-3">
            <span className="text-sm font-semibold text-slate-300">Expense total</span>
            <strong className="text-xl font-black tabular-nums text-lime-200">{formatMoney(total)}</strong>
          </div>
        </section>

        <ExpenseField label="Notes" hint="Optional">
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} className={`${expenseInputClass} h-auto min-h-20 py-2.5`} placeholder="Add a note for this expense" />
        </ExpenseField>
        {message ? <p role="status" className={`text-sm ${message.ok ? "text-lime-200" : "text-rose-300"}`}>{message.text}</p> : null}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-800 bg-slate-950/95 pt-4 backdrop-blur">
          <Button type="button" variant="ghost" disabled={isPending} onClick={() => updateOpen(false)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isPending || total <= 0}>
            {isPending ? <><Spinner />Saving…</> : "Save expense"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const expenseInputClass = "h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 transition focus:border-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/20";

function ExpenseField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-slate-300">
      <span className="flex items-center justify-between gap-2">{label}{hint ? <span className="text-[10px] font-medium text-slate-500">{hint}</span> : null}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ExpenseSelect<T extends string>({ label, value, onChange, options, compact = false }: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  compact?: boolean;
}) {
  return (
    <ExpenseField label={label}>
      <span className="relative block">
        <select value={value} onChange={(event) => onChange(event.target.value as T)} className={`${expenseInputClass} appearance-none pr-10 ${compact ? "h-10" : ""}`}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none text-slate-400" aria-hidden="true">keyboard_arrow_down</span>
      </span>
    </ExpenseField>
  );
}

function labelForCategory(category: ExpenseCategory) {
  return categoryOptions.find((option) => option.value === category)?.label ?? category;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(new Date(iso));
}

function Spinner() {
  return <span aria-hidden="true" className="mr-2 inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

"use client";

import { useState, useTransition, type FormEvent } from "react";
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
    <Dialog open={open} title="Add expense" onOpenChange={updateOpen}>
      <form onSubmit={submit} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-400">Category
            <select value={category} onChange={(event) => changeCategory(event.target.value as ExpenseCategory)} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white">
              {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-400">Date
            <input type="date" value={spentAt} onChange={(event) => setSpentAt(event.target.value)} required className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white" />
          </label>
          <label className="block text-xs font-semibold text-slate-400">Supplier / store (optional)
            <input value={vendorName} onChange={(event) => setVendorName(event.target.value)} maxLength={120} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white" placeholder="Supplier name" />
          </label>
          <label className="block text-xs font-semibold text-slate-400">Paid by
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "CASH" | "UPI")} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white">
              <option value="CASH">Cash</option><option value="UPI">UPI</option>
            </select>
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">Expense items</h3>
            <button type="button" onClick={() => { setLines((current) => [...current, { id: nextLineId, description: "", amount: "", productId: "", packs: "" }]); setNextLineId((id) => id + 1); }} className="text-xs font-bold text-lime-200 hover:text-white">+ Add line</button>
          </div>
          {category === "INVENTORY_PURCHASE" ? <p className="text-xs text-cyan-200">Link each stocked drink or cigarette below. Saving adds packs × units per pack to Inventory.</p> : null}
          {lines.map((line, index) => {
            const product = products.find((item) => item.id === line.productId);
            return (
              <div key={line.id} className="space-y-2 rounded-lg border border-slate-800 p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
                  <label className="block text-[11px] font-semibold text-slate-500">Item / description
                    <input value={line.description} onChange={(event) => changeLine(line.id, { description: event.target.value })} maxLength={120} required disabled={Boolean(product)} className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white disabled:opacity-70" placeholder="e.g. Milk, cleaning supplies" />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-500">Line amount (₹)
                    <input type="number" min="0.01" step="0.01" value={line.amount} onChange={(event) => changeLine(line.id, { amount: event.target.value })} required className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white" placeholder="0.00" />
                  </label>
                  {lines.length > 1 ? <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} aria-label={`Remove expense line ${index + 1}`} className="h-9 px-2 text-xs font-bold text-rose-300 hover:text-rose-200">Remove</button> : null}
                </div>
                {category === "INVENTORY_PURCHASE" ? (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                    <label className="block text-[11px] font-semibold text-slate-500">Restock tracked item
                      <select value={line.productId} onChange={(event) => {
                        const selected = products.find((item) => item.id === event.target.value);
                        changeLine(line.id, { productId: selected?.id ?? "", description: selected?.name ?? line.description, packs: selected ? (line.packs || "1") : "" });
                      }} className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white">
                        <option value="">Choose inventory item</option>
                        {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    {product ? (
                      <label className="block text-[11px] font-semibold text-slate-500">Packs / boxes
                        <input type="number" min={1} max={999999} step={1} value={line.packs} onChange={(event) => changeLine(line.id, { packs: event.target.value })} required className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white" />
                        <span className="mt-1 block text-[10px] font-normal text-cyan-200">Adds {(Number(line.packs) || 0) * product.unitsPerPack} {product.stockUnit}</span>
                      </label>
                    ) : <p className="self-center text-xs text-slate-500">No stock change for this line.</p>}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="flex justify-between border-t border-slate-800 pt-3 text-sm">
            <span className="font-semibold text-slate-400">Expense total</span><strong className="text-lg font-black text-white">{formatMoney(total)}</strong>
          </div>
        </div>

        <label className="block text-xs font-semibold text-slate-400">Notes (optional)
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="Any additional details" />
        </label>
        {message ? <p role="status" className={`text-sm ${message.ok ? "text-lime-200" : "text-rose-300"}`}>{message.text}</p> : null}
        <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
          <Button type="button" variant="ghost" disabled={isPending} onClick={() => updateOpen(false)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isPending || total <= 0}>
            {isPending ? <><Spinner />Saving…</> : "Save expense"}
          </Button>
        </div>
      </form>
    </Dialog>
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

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, textInputProps } from "@/components/ui/field";
import { formatMoney } from "@/lib/money";
import type { ProductCategory } from "@/features/live-tables/types";
import { importInventoryAction, restockProductAction, updateInventoryProductAction } from "@/features/settings/actions";
import { inventoryCsvSample, inventoryCsvTemplate, parseInventoryCsv, type InventoryCsvRow } from "./csv";

export type InventoryProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  priceAmount: number;
  stockOnHand: number;
  stockUnit: string;
  unitsPerPack: number;
  stockUpdatedAt: string | null;
};

const categoryLabels: Record<ProductCategory, string> = {
  FOOD: "Food",
  CAFE: "Food",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

const filters = [
  { value: "ALL", label: "All" },
  { value: "FOOD", label: "Food" },
  { value: "CIGARETTES", label: "Cigarettes" },
  { value: "BEVERAGES", label: "Beverages" }
] as const;

type CategoryFilter = (typeof filters)[number]["value"];

export function InventoryPage({ products }: { products: InventoryProduct[] }) {
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [search, setSearch] = useState("");
  const [importRows, setImportRows] = useState<InventoryCsvRow[] | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const filteredProducts = products.filter((product) =>
    (category === "ALL" || product.category === category || (category === "FOOD" && product.category === "CAFE")) &&
    product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  const totalsByUnit = useMemo(() => {
    const totals = new Map<string, number>();
    for (const product of products) totals.set(product.stockUnit, (totals.get(product.stockUnit) ?? 0) + product.stockOnHand);
    return Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products]);
  const outOfStockCount = products.filter((product) => product.stockOnHand === 0).length;
  const lowStockCount = products.filter((product) => product.stockOnHand > 0 && product.stockOnHand <= product.unitsPerPack).length;

  function selectCsv(file?: File) {
    setImportMessage(null);
    if (!file) return;
    startTransition(async () => {
      try {
        setImportRows(parseInventoryCsv(await file.text()));
      } catch (error) {
        setImportRows(null);
        setImportMessage(error instanceof Error ? error.message : "CSV could not be read.");
      }
    });
  }

  function importCsv() {
    if (!importRows) return;
    startTransition(async () => {
      const result = await importInventoryAction(importRows);
      setImportMessage(result.message);
      if (result.ok) setImportRows(null);
    });
  }

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Inventory</h1>
          <p className="mt-1 text-sm text-slate-400">Stock updates as items are added to bills. Cigarette stock is counted by stick.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(inventoryCsvSample)}`} download="the-nine-inventory-sample.csv" className="inline-flex h-10 items-center rounded-material border border-lime-300/30 bg-lime-300/10 px-3 text-sm font-semibold text-lime-100 hover:bg-lime-300/15">Download sample CSV</a>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(inventoryCsvTemplate)}`} download="the-nine-inventory-template.csv" className="inline-flex h-10 items-center rounded-material border border-slate-700 px-3 text-sm font-semibold text-slate-200 hover:border-lime-300/40 hover:text-white">Blank template</a>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Inventory items" value={String(products.length)} detail="Active menu items" />
        <SummaryCard label="Out of stock" value={String(outOfStockCount)} detail={`${lowStockCount} at one pack or less`} />
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall stock</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {totalsByUnit.length ? totalsByUnit.map(([unit, count]) => <strong key={unit} className="text-sm text-white">{formatUnits(count, unit)}</strong>) : <span className="text-sm text-slate-400">No stock recorded</span>}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4" aria-label="Import inventory CSV">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-white">Import inventory</h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">Columns: name, category, priceAmount per stick/unit, stockUnit, unitsPerPack, and stockOnHand in individual units. Sample prices are placeholders. Matching items have their stock replaced by the file.</p>
          </div>
          <Field label="Choose CSV file">
            <input {...textInputProps()} type="file" accept=".csv,text/csv" aria-label="Choose inventory CSV" onChange={(event) => selectCsv(event.target.files?.[0])} />
          </Field>
        </div>
        {importRows ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
            <p className="text-sm text-amber-100">{importRows.length} rows ready. Stock will be replaced for matching items.</p>
            <Button type="button" variant="primary" disabled={isPending} onClick={importCsv}>{isPending ? "Importing…" : `Import ${importRows.length} items`}</Button>
          </div>
        ) : null}
        {isPending && !importRows ? <p className="mt-3 text-sm text-cyan-200" role="status">Reading CSV…</p> : null}
        {importMessage ? <p className={`mt-3 text-sm ${importMessage.includes("could not") || importMessage.startsWith("CSV") || importMessage.startsWith("Row") ? "text-rose-300" : "text-lime-200"}`} role="status">{importMessage}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70" aria-label="Inventory stock list">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-wrap gap-1.5" aria-label="Filter inventory by category">
            {filters.map((filter) => (
              <button key={filter.value} type="button" aria-pressed={category === filter.value} onClick={() => setCategory(filter.value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${category === filter.value ? "bg-lime-300 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                {filter.label} <span className="ml-1 opacity-70">{filter.value === "ALL" ? products.length : products.filter((product) => product.category === filter.value || (filter.value === "FOOD" && product.category === "CAFE")).length}</span>
              </button>
            ))}
          </div>
          <input {...textInputProps()} className="h-10 w-full rounded-material border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500 sm:max-w-xs" aria-label="Search inventory" placeholder="Search items" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="divide-y divide-slate-800">
          {filteredProducts.map((product) => <InventoryRow key={product.id} product={product} />)}
          {filteredProducts.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">No inventory items match this filter.</p> : null}
        </div>
      </section>
    </section>
  );
}

function InventoryRow({ product }: { product: InventoryProduct }) {
  const router = useRouter();
  const [stockUnit, setStockUnit] = useState(product.stockUnit);
  const [unitsPerPack, setUnitsPerPack] = useState(product.unitsPerPack);
  const [packs, setPacks] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isRestocking, startRestock] = useTransition();
  const isPending = isSaving || isRestocking;
  const lastStocked = product.stockUpdatedAt ? `Stock added ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(product.stockUpdatedAt))}` : "Not recorded";
  const fullPacks = unitsPerPack > 1 ? ` · ${Math.floor(product.stockOnHand / unitsPerPack)} full packs` : "";
  const lowStock = product.stockOnHand <= unitsPerPack;

  function restock() {
    startRestock(async () => {
      const result = await restockProductAction({ id: product.id, packs });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function saveSettings() {
    startSaving(async () => {
      const result = await updateInventoryProductAction({ id: product.id, stockUnit, unitsPerPack });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <article className="grid gap-3 px-4 py-4 text-sm text-slate-200 lg:grid-cols-[minmax(150px,1fr)_150px_200px_220px] lg:items-center">
      <div className="min-w-0">
        <strong className="block truncate text-white">{product.name}</strong>
        <span className="text-xs text-slate-500">{categoryLabels[product.category]} · {formatMoney(product.priceAmount)} / {formatUnit(stockUnit)}</span>
      </div>
      <div>
        <strong className={lowStock ? "text-amber-200" : "text-lime-100"}>{formatUnits(product.stockOnHand, stockUnit)}</strong>
        <span className="block text-[11px] text-slate-500">{product.stockOnHand === 0 ? "Out of stock · " : ""}{lastStocked}{fullPacks}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-slate-500">Stock unit<input {...textInputProps()} id={`stock-unit-${product.id}`} className="mt-1 h-9 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-white" value={stockUnit} onChange={(event) => setStockUnit(event.target.value)} /></label>
        <label className="text-[10px] text-slate-500">Units / pack<input {...textInputProps()} id={`units-pack-${product.id}`} className="mt-1 h-9 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-white" type="number" min={1} value={unitsPerPack} onChange={(event) => setUnitsPerPack(Number(event.target.value))} /></label>
        <Button type="button" className="h-9 px-3" disabled={isPending || !stockUnit.trim() || unitsPerPack < 1} onClick={saveSettings}>{isSaving ? "Saving…" : "Save"}</Button>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-slate-500">Packs to add<input {...textInputProps()} id={`packs-${product.id}`} className="mt-1 h-9 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-white" type="number" min={1} value={packs} onChange={(event) => setPacks(Number(event.target.value))} /></label>
        <Button type="button" variant="primary" className="h-9 px-3" disabled={isPending || packs < 1} onClick={restock}>{isRestocking ? "Adding…" : "Add stock"}</Button>
      </div>
      {message ? <p className="text-xs text-lime-200 lg:col-span-4" role="status">{message}</p> : null}
    </article>
  );
}

function formatUnit(unit: string) {
  return unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

function formatUnits(count: number, unit: string) {
  const label = formatUnit(unit);
  return `${count} ${count === 1 ? label : `${label}s`}`;
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <strong className="mt-1 block text-2xl text-white">{value}</strong>
      <span className="text-xs text-slate-500">{detail}</span>
    </div>
  );
}

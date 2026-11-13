"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, textInputProps } from "@/components/ui/field";
import { Snackbar } from "@/components/ui/snackbar";
import { formatMoney } from "@/lib/money";
import { createOrUpdateProductAction, deactivateProductAction } from "./actions";
import type { ProductCategory } from "@/features/live-tables/types";

export type SettingsProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  priceAmount: number;
  active: boolean;
};

export type SettingsBooking = {
  bookingEnabled: boolean;
  requireConfirmation: boolean;
  bookingBufferMinutes: number;
  bookingMinLeadMinutes: number;
  bookingOpenHour: number;
  bookingCloseHour: number;
  bookingCloseNextDay: boolean;
  paymentProvider: "NONE" | "RAZORPAY" | "STRIPE";
  bookingAdvanceAmount: number;
  availablePaymentProviders: Array<{ code: "NONE" | "RAZORPAY" | "STRIPE"; label: string; ready: boolean }>;
  whatsappConfigured: boolean;
  paymentInfo: string | null;
  bookingLink: string;
};

const categoryLabels: Record<ProductCategory, string> = {
  FOOD: "Food",
  CAFE: "Food",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

const editableCategories: Array<Exclude<ProductCategory, "CAFE">> = ["FOOD", "CIGARETTES", "BEVERAGES"];

export function MenuSettingsPage({
  products
}: {
  products: SettingsProduct[];
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Exclude<ProductCategory, "CAFE">>("FOOD");
  const [priceAmount, setPriceAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | Exclude<ProductCategory, "CAFE">>("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "ALL" || product.category === selectedCategory || (selectedCategory === "FOOD" && product.category === "CAFE");
    return matchesCategory && product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  });
  const categories: Array<{ value: "ALL" | Exclude<ProductCategory, "CAFE">; label: string }> = [
    { value: "ALL", label: "All items" },
    { value: "FOOD", label: "Food" },
    { value: "CIGARETTES", label: "Cigarettes" },
    { value: "BEVERAGES", label: "Beverages" }
  ];

  function addItem() {
    startTransition(async () => {
      const result = await createOrUpdateProductAction({ name, category, priceAmount });
      setMessage(result.message);
      if (result.ok) {
        setName("");
        setPriceAmount(0);
      }
    });
  }

  function updateItem(product: SettingsProduct, nextPrice: number) {
    startTransition(async () => {
      const result = await createOrUpdateProductAction({
        id: product.id,
        name: product.name,
        category: product.category === "CAFE" ? "FOOD" : product.category,
        priceAmount: nextPrice
      });
      setMessage(result.message);
    });
  }

  function removeItem(product: SettingsProduct) {
    startTransition(async () => {
      const result = await deactivateProductAction({ id: product.id });
      setMessage(result.message);
    });
  }

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Menu</h1>
          <p className="mt-1 text-sm text-slate-400">Manage the items your team can add to a bill.</p>
        </div>
        <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-xs font-bold text-lime-100">{products.length} items</span>
      </div>

      <div className="rounded-2xl border border-lime-300/15 bg-slate-950/85 p-4 shadow-material sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="material-symbols-outlined rounded-xl bg-lime-300/10 p-2 text-lime-200">add_circle</span>
          <div><h2 className="font-black text-white">Add a menu item</h2><p className="mt-1 text-xs text-slate-400">Set the name, category and selling price.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_150px_auto]">
          <Field label="Item name">
            <input {...textInputProps()} value={name} placeholder="e.g. Masala soda" onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Category">
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-material border border-slate-600 bg-slate-950 pl-3 pr-10 text-sm leading-normal text-slate-100 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/20" value={category} onChange={(event) => setCategory(event.target.value as Exclude<ProductCategory, "CAFE">)}>
                {editableCategories.map((option) => <option key={option} value={option}>{categoryLabels[option]}</option>)}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400" aria-hidden="true">
                <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
              </span>
            </div>
          </Field>
          <Field label="Selling price (₹)">
            <input {...textInputProps()} type="number" min={0} value={priceAmount} onChange={(event) => setPriceAmount(Number(event.target.value))} />
          </Field>
          <div className="flex items-end"><Button type="button" variant="primary" className="w-full" disabled={isPending || !name.trim()} onClick={addItem}>Add item</Button></div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-wrap gap-1.5" aria-label="Filter menu by category">
            {categories.map((option) => {
              const count = option.value === "ALL" ? products.length : products.filter((product) => product.category === option.value || (option.value === "FOOD" && product.category === "CAFE")).length;
              const active = selectedCategory === option.value;
              return <button key={option.value} type="button" aria-pressed={active} onClick={() => setSelectedCategory(option.value)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${active ? "bg-lime-300 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>{option.label} <span className={active ? "ml-1 opacity-70" : "ml-1 text-slate-600"}>{count}</span></button>;
            })}
          </div>
          <input {...textInputProps()} className="h-10 w-full rounded-material border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500 sm:max-w-xs" placeholder="Search menu items" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="divide-y divide-slate-800">
          {visibleProducts.map((product) => <ProductRow key={product.id} product={product} disabled={isPending} onUpdate={updateItem} onRemove={removeItem} />)}
          {visibleProducts.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">{products.length ? "No items match this filter." : "No menu items yet. Add your first item above."}</p> : null}
        </div>
      </div>
      <Snackbar message={message} tone={message?.includes("could not") ? "danger" : "success"} />
    </section>
  );
}

function ProductRow({
  product,
  disabled,
  onUpdate,
  onRemove
}: {
  product: SettingsProduct;
  disabled: boolean;
  onUpdate: (product: SettingsProduct, nextPrice: number) => void;
  onRemove: (product: SettingsProduct) => void;
}) {
  const [price, setPrice] = useState(product.priceAmount);

  return (
    <div className="grid gap-3 px-4 py-3 text-sm text-slate-200 sm:grid-cols-[minmax(0,1fr)_130px_140px_auto] sm:items-center sm:gap-4">
      <div className="min-w-0"><strong className="block truncate text-white">{product.name}</strong><span className="mt-1 inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400 sm:hidden">{categoryLabels[product.category]}</span></div>
      <span className="hidden text-xs font-semibold text-slate-400 sm:block">{categoryLabels[product.category]}</span>
      <label className="flex items-center gap-2 sm:block"><span className="text-xs text-slate-500 sm:hidden">Price ₹</span><input {...textInputProps()} className="h-10 w-full rounded-material border border-slate-700 bg-slate-900 px-3 text-sm text-white" type="number" min={0} value={price} aria-label={`Price for ${product.name}`} onChange={(event) => setPrice(Number(event.target.value))} /></label>
      <div className="flex gap-2 sm:justify-end">
        <Button type="button" className="h-9 flex-1 px-3 sm:flex-none" disabled={disabled} onClick={() => onUpdate(product, price)}>Save price</Button>
        <Button type="button" variant="ghost" className="h-9 px-3" disabled={disabled} onClick={() => onRemove(product)}>Remove</Button>
      </div>
      <span className="sr-only">{formatMoney(product.priceAmount)}</span>
    </div>
  );
}

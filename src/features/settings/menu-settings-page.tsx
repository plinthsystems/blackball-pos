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
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    <section className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-lime-200/80">The Nine Snooker & Cafe</p>
        <h1 className="mt-1 text-2xl font-black text-white">Menu</h1>
        <p className="mt-1 text-sm text-slate-400">Keep the counter menu quick to ring up. Price changes apply to new bills.</p>
      </div>

      <div>
        <h2 className="text-lg font-black text-white">Counter items</h2>
      </div>

      <div className="grid gap-3 rounded-material border border-lime-300/15 bg-slate-950/80 p-4 shadow-material md:grid-cols-[1fr_180px_140px_auto]">
        <Field label="Item name">
          <input {...textInputProps()} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Category">
          <select
            className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
            value={category}
            onChange={(event) => setCategory(event.target.value as Exclude<ProductCategory, "CAFE">)}
          >
            {editableCategories.map((option) => (
              <option key={option} value={option}>{categoryLabels[option]}</option>
            ))}
          </select>
        </Field>
        <Field label="Price">
          <input {...textInputProps()} type="number" min={0} value={priceAmount} onChange={(event) => setPriceAmount(Number(event.target.value))} />
        </Field>
        <div className="flex items-end">
          <Button type="button" variant="primary" disabled={isPending || !name.trim()} onClick={addItem}>Add item</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-material border border-lime-300/15 bg-slate-950/80 shadow-material">
        <div className="grid grid-cols-[1fr_130px_130px_180px] gap-3 border-b border-lime-300/15 px-4 py-3 text-xs font-bold uppercase text-slate-400">
          <span>Item</span>
          <span>Category</span>
          <span>Price</span>
          <span>Actions</span>
        </div>
        {products.map((product) => (
          <ProductRow key={product.id} product={product} disabled={isPending} onUpdate={updateItem} onRemove={removeItem} />
        ))}
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
    <div className="grid grid-cols-[1fr_130px_130px_180px] items-center gap-3 border-b border-lime-300/10 px-4 py-3 text-sm text-slate-200 last:border-b-0">
      <strong>{product.name}</strong>
      <span>{categoryLabels[product.category]}</span>
      <input
        {...textInputProps()}
        type="number"
        min={0}
        value={price}
        aria-label={`Price for ${product.name}`}
        onChange={(event) => setPrice(Number(event.target.value))}
      />
      <div className="flex gap-2">
        <Button type="button" className="h-9 px-3" disabled={disabled} onClick={() => onUpdate(product, price)}>Update price</Button>
        <Button type="button" variant="ghost" className="h-9 px-3" disabled={disabled} onClick={() => onRemove(product)}>Remove</Button>
      </div>
      <span className="sr-only">{formatMoney(product.priceAmount)}</span>
    </div>
  );
}

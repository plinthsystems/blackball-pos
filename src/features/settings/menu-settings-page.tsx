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

const categoryLabels: Record<ProductCategory, string> = {
  FOOD: "Food",
  CAFE: "Food",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

const editableCategories: Array<Exclude<ProductCategory, "CAFE">> = ["FOOD", "CIGARETTES", "BEVERAGES"];

export function MenuSettingsPage({ products }: { products: SettingsProduct[] }) {
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
        <h1 className="text-2xl font-semibold">Food/Menu</h1>
        <p className="mt-1 text-sm text-neutral-600">Manage Food, Cigarettes, and Beverages. Price changes affect only new bill items.</p>
      </div>

      <div className="grid gap-3 rounded-material border border-outline bg-surface p-4 shadow-sm md:grid-cols-[1fr_180px_140px_auto]">
        <Field label="Item name">
          <input {...textInputProps()} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Category">
          <select
            className="h-10 w-full rounded-material border border-outline bg-surface px-3 text-sm text-neutral-900"
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

      <div className="overflow-hidden rounded-material border border-outline bg-surface shadow-sm">
        <div className="grid grid-cols-[1fr_130px_130px_180px] gap-3 border-b border-outline px-4 py-3 text-xs font-semibold uppercase text-neutral-500">
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
    <div className="grid grid-cols-[1fr_130px_130px_180px] items-center gap-3 border-b border-outline px-4 py-3 text-sm last:border-b-0">
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

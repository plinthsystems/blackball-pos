"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, textInputProps } from "@/components/ui/field";
import { Snackbar } from "@/components/ui/snackbar";
import { formatMoney } from "@/lib/money";
import { createOrUpdateProductAction, deactivateProductAction, updateBrandingAction } from "./actions";
import type { ProductCategory } from "@/features/live-tables/types";

export type SettingsProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  priceAmount: number;
  active: boolean;
};

export type SettingsBranding = {
  appName: string;
  logoInitials: string;
  brandColor: string;
  accentColor: string;
};

const categoryLabels: Record<ProductCategory, string> = {
  FOOD: "Food",
  CAFE: "Food",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

const editableCategories: Array<Exclude<ProductCategory, "CAFE">> = ["FOOD", "CIGARETTES", "BEVERAGES"];

const fallbackBranding: SettingsBranding = {
  appName: "Black Ball",
  logoInitials: "BB",
  brandColor: "#12613d",
  accentColor: "#b98922"
};

export function MenuSettingsPage({ products, branding = fallbackBranding }: { products: SettingsProduct[]; branding?: SettingsBranding }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Exclude<ProductCategory, "CAFE">>("FOOD");
  const [priceAmount, setPriceAmount] = useState(0);
  const [appName, setAppName] = useState(branding.appName);
  const [logoInitials, setLogoInitials] = useState(branding.logoInitials);
  const [brandColor, setBrandColor] = useState(branding.brandColor);
  const [accentColor, setAccentColor] = useState(branding.accentColor);
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

  function saveBranding() {
    startTransition(async () => {
      const result = await updateBrandingAction({ appName, logoInitials, brandColor, accentColor });
      setMessage(result.message);
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Food/Menu</h1>
        <p className="mt-1 text-sm text-neutral-600">Manage Food, Cigarettes, and Beverages. Price changes affect only new bill items.</p>
      </div>

      <div className="space-y-4 rounded-material border border-outline bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Branding</h2>
            <p className="mt-1 text-sm text-neutral-600">Customize the tenant name, initials, and club colors.</p>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full border text-sm font-bold text-white"
            style={{ backgroundColor: brandColor, borderColor: accentColor }}
            aria-hidden="true"
          >
            {logoInitials || "BB"}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_110px_140px_140px_auto]">
          <Field label="Application name">
            <input {...textInputProps()} value={appName} onChange={(event) => setAppName(event.target.value)} />
          </Field>
          <Field label="Logo initials">
            <input
              {...textInputProps()}
              value={logoInitials}
              maxLength={4}
              onChange={(event) => setLogoInitials(event.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Brand color">
            <input
              className="h-10 w-full rounded-material border border-outline bg-surface px-2"
              type="color"
              value={brandColor}
              onChange={(event) => setBrandColor(event.target.value)}
            />
          </Field>
          <Field label="Accent color">
            <input
              className="h-10 w-full rounded-material border border-outline bg-surface px-2"
              type="color"
              value={accentColor}
              onChange={(event) => setAccentColor(event.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="primary" disabled={isPending || !appName.trim() || !logoInitials.trim()} onClick={saveBranding}>
              Save branding
            </Button>
          </div>
        </div>
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

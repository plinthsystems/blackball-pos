"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, textInputProps } from "@/components/ui/field";
import { Snackbar } from "@/components/ui/snackbar";
import { formatMoney } from "@/lib/money";
import { createOrUpdateProductAction, deactivateProductAction, updateBookingSettingsAction, updateBrandingAction } from "./actions";
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

const fallbackBranding: SettingsBranding = {
  appName: "Black Ball",
  logoInitials: "BB",
  brandColor: "#12613d",
  accentColor: "#b98922"
};

export function MenuSettingsPage({
  products,
  branding = fallbackBranding,
  booking
}: {
  products: SettingsProduct[];
  branding?: SettingsBranding;
  booking?: SettingsBooking;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Exclude<ProductCategory, "CAFE">>("FOOD");
  const [priceAmount, setPriceAmount] = useState(0);
  const [appName, setAppName] = useState(branding.appName);
  const [logoInitials, setLogoInitials] = useState(branding.logoInitials);
  const [brandColor, setBrandColor] = useState(branding.brandColor);
  const [accentColor, setAccentColor] = useState(branding.accentColor);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [bookingEnabled, setBookingEnabled] = useState(booking?.bookingEnabled ?? true);
  const [requireConfirmation, setRequireConfirmation] = useState(booking?.requireConfirmation ?? false);
  const [paymentProvider, setPaymentProvider] = useState(booking?.paymentProvider ?? "NONE");
  const [advanceAmount, setAdvanceAmount] = useState(booking?.bookingAdvanceAmount ?? 0);
  const [bufferMinutes, setBufferMinutes] = useState(booking?.bookingBufferMinutes ?? 10);
  const [minLeadMinutes, setMinLeadMinutes] = useState(booking?.bookingMinLeadMinutes ?? 90);
  const [openHour, setOpenHour] = useState(booking?.bookingOpenHour ?? 10);
  const [closeHour, setCloseHour] = useState(booking?.bookingCloseHour ?? 23);
  const [closeNextDay, setCloseNextDay] = useState(booking?.bookingCloseNextDay ?? false);

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

  function saveBookingSettings() {
    startTransition(async () => {
      const result = await updateBookingSettingsAction({
        bookingEnabled,
        requireConfirmation,
        bookingBufferMinutes: Number(bufferMinutes),
        bookingMinLeadMinutes: Number(minLeadMinutes),
        bookingOpenHour: Number(openHour),
        bookingCloseHour: Number(closeHour),
        bookingCloseNextDay: closeNextDay,
        paymentProvider,
        bookingAdvanceAmount: Number(advanceAmount)
      });
      setMessage(result.message);
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Business Profile & Menu</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your outlet identity and billable Food, Cigarettes, and Beverages.</p>
      </div>

      <div className="overflow-hidden rounded-material border border-cyan-300/15 bg-slate-950 shadow-[0_0_34px_rgba(34,211,238,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
          <div className="border-b border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,1))] p-5 lg:border-b-0 lg:border-r">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Business Profile</h2>
            <p className="mt-3 text-xl font-black text-white">Club identity</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Keep your club identity clear without changing the whole software theme.</p>
            <div className="mt-5 rounded-material border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-base font-black text-white shadow-[0_0_26px_rgba(34,211,238,0.18)]"
                  style={{ backgroundColor: brandColor, borderColor: accentColor }}
                  aria-hidden="true"
                >
                  {logoInitials || "BB"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{appName || "Black Ball"}</p>
                  <p className="mt-1 text-xs text-cyan-100/60">Visible in sidebar, header, and receipts</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: brandColor }} />
                <span className="h-2 w-12 rounded-full" style={{ backgroundColor: accentColor }} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-[1fr_120px]">
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
            <Field label="Primary identity color">
              <input
                className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-2"
                type="color"
                value={brandColor}
                onChange={(event) => setBrandColor(event.target.value)}
              />
            </Field>
            <Field label="Receipt accent">
              <input
                className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-2"
                type="color"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
              />
            </Field>
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-cyan-300/10 pt-4">
              <p className="text-xs text-slate-500">The interface stays consistent for staff; this identity appears where customers and managers recognize the outlet.</p>
              <Button type="button" variant="primary" disabled={isPending || !appName.trim() || !logoInitials.trim()} onClick={saveBranding}>
                Save profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-material border border-cyan-300/15 bg-slate-950 shadow-[0_0_34px_rgba(34,211,238,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
          <div className="border-b border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,1))] p-5 lg:border-b-0 lg:border-r">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Customer Online Booking</h2>
            <p className="mt-3 text-xl font-black text-white">Self-service reservations</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Customers book tables from the public link below. No login needed — just a phone number.
            </p>
            {booking && (
              <div className="mt-4 rounded-material border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Booking link (QR)</p>
                <p className="mt-1 break-all font-mono text-xs text-cyan-200">{booking.bookingLink}</p>
              </div>
            )}
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-material border border-white/10 bg-white/[0.03] p-3">
              <span>
                <span className="block text-sm font-black text-white">Accept new bookings</span>
                <span className="text-xs text-slate-400">Disables the public booking page when off</span>
              </span>
              <input
                type="checkbox"
                checked={bookingEnabled}
                onChange={(event) => setBookingEnabled(event.target.checked)}
                className="h-5 w-5 accent-emerald-500"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-material border border-white/10 bg-white/[0.03] p-3">
              <span>
                <span className="block text-sm font-black text-white">Staff verification</span>
                <span className="text-xs text-slate-400">On: bookings stay pending until staff confirms</span>
              </span>
              <input
                type="checkbox"
                checked={requireConfirmation}
                onChange={(event) => setRequireConfirmation(event.target.checked)}
                className="h-5 w-5 accent-amber-500"
              />
            </label>
            <Field label="Cleanup buffer (min)">
              <input {...textInputProps()} type="number" min={0} max={120} value={bufferMinutes} onChange={(event) => setBufferMinutes(Number(event.target.value))} />
            </Field>
            <Field label="Min. lead time (min)">
              <input
                {...textInputProps()}
                type="number"
                min={0}
                max={240}
                value={minLeadMinutes}
                onChange={(event) => setMinLeadMinutes(Number(event.target.value))}
              />
            </Field>
            <Field label="Opens at (24h)">
              <input {...textInputProps()} type="number" min={0} max={23} value={openHour} onChange={(event) => setOpenHour(Number(event.target.value))} />
            </Field>
            <Field label="Closes at (24h)">
              <input
                {...textInputProps()}
                type="number"
                min={closeNextDay ? 0 : openHour + 1}
                max={24}
                value={closeHour}
                onChange={(event) => setCloseHour(Number(event.target.value))}
              />
            </Field>
            <label className="md:col-span-2 flex cursor-pointer items-center justify-between gap-3 rounded-material border border-white/10 bg-white/[0.03] p-3">
              <span>
                <span className="block text-sm font-black text-white">Closes next day</span>
                <span className="text-xs text-slate-400">
                  Enable when the store closes after midnight (e.g. opens 10:00, closes 01:00 next day)
                </span>
              </span>
              <input
                type="checkbox"
                checked={closeNextDay}
                onChange={(event) => setCloseNextDay(event.target.checked)}
                className="h-5 w-5 accent-cyan-500"
              />
            </label>
            <Field label="Payment provider (advance)">
              <select
                className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
                value={paymentProvider}
                onChange={(event) => setPaymentProvider(event.target.value as "NONE" | "RAZORPAY" | "STRIPE")}
              >
                {(booking?.availablePaymentProviders ?? [{ code: "NONE", label: "None — pay at store", ready: true }]).map((provider) => (
                  <option key={provider.code} value={provider.code} disabled={provider.code !== "NONE" && !provider.ready}>
                    {provider.label}{provider.code !== "NONE" && !provider.ready ? " (keys missing)" : ""}
                  </option>
                ))}
              </select>
              {booking?.paymentInfo && (
                <p className="mt-1 text-[11px] text-amber-200/80">{booking.paymentInfo}</p>
              )}
            </Field>
            <Field label="Advance amount (₹)">
              <input
                {...textInputProps()}
                type="number"
                min={0}
                max={100000}
                value={advanceAmount}
                onChange={(event) => setAdvanceAmount(Number(event.target.value))}
              />
            </Field>
            <div className="md:col-span-2">
              <p className="rounded-material border border-slate-700 bg-slate-900 p-3 text-xs text-slate-400">
                {booking?.whatsappConfigured
                  ? "💬 WhatsApp is configured — customers get booking & cancellation messages on their phone."
                  : "🔕 WhatsApp is NOT configured — no SMS/WhatsApp notifications will be sent. Add WHATSAPP_API_URL & WHATSAPP_API_TOKEN in .env to enable."}
              </p>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-cyan-300/10 pt-4">
              <p className="text-xs text-slate-500">
                Same-day start slots only, every 30 minutes between opening and closing hours. Overnight hours supported when &quot;Closes next day&quot; is enabled.
              </p>
              <Button type="button" variant="primary" disabled={isPending} onClick={saveBookingSettings}>
                Save booking preferences
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-black text-white">Food Menu</h2>
        <p className="mt-1 text-sm text-slate-400">Manage Food, Cigarettes, and Beverages. Price changes affect only new bill items.</p>
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

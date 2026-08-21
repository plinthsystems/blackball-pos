"use client";

import { useState } from "react";
import { createPublicBookingAction, listBookableSlotsAction } from "../actions";
import { BOOKING_DURATIONS } from "@/server/domain/booking-slots";
import { getActiveAndNextBusinessWindows } from "@/server/domain/booking-settings";
import type { PublicBookCatalog, PublicSlot } from "../queries";

const gameTypeLabels: Record<string, string> = {
  POOL: "Pool Table",
  SNOOKER: "Snooker Table",
  PS5: "PS5 Station"
};

const durationLabels: Record<number, string> = {
  30: "30m",
  60: "1h",
  90: "1.5h",
  120: "2h"
};

type SelectedSlot = { iso: string; label: string } | null;

type SlotGroup = {
  label: string;
  dateKey: string;
  slots: PublicSlot[];
};

type DoneState = {
  reference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  tableNumber: string;
} | null;

type PaymentState = {
  provider: "razorpay" | "stripe";
  amount: number;
  url: string;
} | null;

export function BookPageView({ catalog }: { catalog: PublicBookCatalog }) {
  const [step, setStep] = useState<"choose" | "details">("choose");
  const [tableId, setTableId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [slotGroups, setSlotGroups] = useState<SlotGroup[] | null>(null);
  const [slot, setSlot] = useState<SelectedSlot>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<DoneState>(null);
  const [payment, setPayment] = useState<PaymentState>(null);

  async function pickTable(nextTableId: string) {
    setTableId(nextTableId);
    setDuration(null);
    setSlotGroups(null);
    setSlot(null);
  }

  async function pickDuration(minutes: number) {
    setDuration(minutes);
    setSlotGroups(null);
    setSlot(null);
    if (tableId) {
      setLoadingSlots(true);
      const now = new Date();
      const [activeWindow, nextWindow] = getActiveAndNextBusinessWindows(
        now,
        catalog.bookingOpenHour,
        catalog.bookingCloseHour,
        catalog.bookingCloseNextDay
      );

      const [activeResult, nextResult] = await Promise.all([
        listBookableSlotsAction({
          tableId,
          dateKey: activeWindow.dateKey,
          durationMinutes: minutes
        }),
        listBookableSlotsAction({
          tableId,
          dateKey: nextWindow.dateKey,
          durationMinutes: minutes
        })
      ]);

      const groups: SlotGroup[] = [];
      if (activeResult.slots.length > 0) {
        groups.push({ label: activeWindow.label, dateKey: activeWindow.dateKey, slots: activeResult.slots });
      }
      if (nextResult.slots.length > 0) {
        groups.push({ label: nextWindow.label, dateKey: nextWindow.dateKey, slots: nextResult.slots });
      }
      setSlotGroups(groups);
      setLoadingSlots(false);
    }
  }

  function formatRange(startIso: string, endIso: string) {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const time = new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    return `${time.format(start)} - ${time.format(end)}`;
  }

  function formatSlotLabel() {
    const table = catalog.tables.find((t) => t.id === tableId);
    const parts: string[] = [];
    if (table) parts.push(table.number);
    if (duration) parts.push(durationLabels[duration]);
    if (slot) parts.push(slot.label);
    return parts.join(" · ");
  }

  async function submitBooking() {
    if (!tableId || !duration || !slot || !name.trim() || !phone.trim()) {
      setSubmitError("Please fill all the details.");
      return;
    }
    setSubmitError(null);
    const result = await createPublicBookingAction({
      businessSlug: catalog.slug,
      tableId,
      startsAt: slot.iso,
      durationMinutes: duration,
      name: name.trim(),
      phone: phone.trim()
    });

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    setDone({
      reference: result.booking.reference,
      status: result.booking.status,
      startsAt: result.booking.startsAt,
      endsAt: result.booking.endsAt,
      tableNumber: result.booking.tableNumber
    });
    setPayment(result.payment);
  }

  const canContinue = Boolean(tableId && duration && slot);
  const canSubmit = Boolean(name.trim() && phone.trim());

  if (done) {
    return (
      <div className="px-4 pb-32 pt-8">
        <div className="mx-auto max-w-sm rounded-2xl border border-emerald-300/25 bg-slate-950 p-6 text-center shadow-[0_0_40px_rgba(16,185,129,0.12)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-4xl">✅</div>
          <h1 className="mt-4 text-2xl font-black text-white">
            {done.status === "PENDING" ? "Request Received!" : "Booking Confirmed!"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {done.status === "PENDING"
              ? "The store will confirm your slot shortly. Please arrive on time."
              : "Your table is reserved. Please arrive on time."}
          </p>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
            <Row label="Booking Ref" value={`#${done.reference}`} />
            <Row label="Table" value={done.tableNumber} />
            <Row label="Time" value={formatRange(done.startsAt, done.endsAt)} />
            <Row label="Status" value={done.status === "PENDING" ? "Pending store confirmation" : "Confirmed"} />
            {payment && (
              <Row
                label="Advance payment"
                value={`₹${payment.amount.toFixed(2)} (${payment.provider.toUpperCase()})`}
              />
            )}
          </div>

          {payment ? (
            <div className="mt-5 rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
              <p className="text-sm font-bold text-white">One last step: pay your advance</p>
              <p className="mt-1 text-xs text-cyan-100/80">
                Your slot is held. Complete the ₹{payment.amount.toFixed(2)} advance to lock it in.
              </p>
              <a
                href={payment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:bg-cyan-400"
              >
                Pay ₹{payment.amount.toFixed(2)} via {payment.provider === "razorpay" ? "Razorpay" : "Stripe"} →
              </a>
              <p className="mt-2 text-[10px] text-cyan-100/60">
                After payment the store gets notified automatically.
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300">
              No advance payment needed — pay at the counter when you arrive.
            </p>
          )}

          {catalog.requireConfirmation && done.status === "PENDING" && (
            <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-xs text-amber-200">
              This store verifies bookings manually. A staff member will confirm your slot before you arrive.
            </p>
          )}

          <a
            href={`/book/${catalog.slug}`}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-200 hover:border-emerald-400/50"
          >
            ← Make another booking
          </a>
        </div>
      </div>
    );
  }

  const detailsStep = step === "details";

  return (
    <div className="min-h-screen bg-[#0d1117] pb-32 text-[#c9d1d9]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-sm items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-slate-900 text-sm font-black text-white">
              {initials(catalog.businessName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-white">{catalog.businessName}</p>
              <p className="text-xs text-slate-400">Book a table online</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200">
            Same-day
          </span>
        </div>
      </header>

      {detailsStep ? (
        <div className="mx-auto max-w-sm px-4 pt-6">
          <button
            type="button"
            onClick={() => setStep("choose")}
            className="mb-4 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-cyan-300 hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-black text-white">Your details</h1>
          <p className="mt-1 text-sm text-slate-400">No account needed — just your name and phone number.</p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Chip label={formatSlotLabel()} highlighted />
            {catalog.paymentProvider && catalog.advanceAmount > 0 && (
              <Chip label={`Advance ₹${catalog.advanceAmount.toFixed(2)}`} highlighted />
            )}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-300">Full Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="mt-1 h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-300">Phone Number (WhatsApp)</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                inputMode="tel"
                className="mt-1 h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
              />
            </label>
            {catalog.whatsappConfigured && (
              <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-2.5 text-[11px] text-emerald-200/80">
                💬 Booking confirmations & updates will be sent on this WhatsApp number.
              </p>
            )}
          </div>

          {submitError && (
            <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{submitError}</p>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-sm px-4 pt-6">
          <section className="rounded-2xl border border-white/10 bg-slate-950 p-4">
            <StepHeading num="1" title="Choose a table" />
            <div className="mt-3 grid grid-cols-1 gap-2.5">
              {catalog.tables.map((table) => {
                const selected = table.id === tableId;
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => pickTable(table.id)}
                    className={`flex min-h-14 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "border-emerald-400/70 bg-emerald-500/10 text-white ring-2 ring-emerald-400/30"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:border-cyan-400/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-base font-black ${
                          selected ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {tableIcon(table.gameType)}
                      </span>
                      <div>
                        <p className="font-black text-white">{table.number}</p>
                        <p className="text-xs text-slate-400">{gameTypeLabels[table.gameType] ?? table.gameType}</p>
                      </div>
                    </div>
                    {selected && <span className="text-xl text-emerald-400">✓</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {tableId && (
            <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-4">
              <StepHeading num="2" title="How long?" />
              <div className="mt-3 grid grid-cols-4 gap-2">
                {BOOKING_DURATIONS.map((minutes) => {
                  const selected = duration === minutes;
                  return (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => pickDuration(minutes)}
                      className={`h-12 rounded-xl border text-sm font-black transition ${
                        selected
                          ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100 ring-2 ring-emerald-400/30"
                          : "border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-400/40"
                      }`}
                    >
                      {durationLabels[minutes]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Choose a start time within business hours.</p>

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Available start times</p>
                {loadingSlots ? (
                  <p className="mt-3 text-sm text-slate-400">Checking availability…</p>
                ) : slotGroups ? (
                  slotGroups.some((g) => g.slots.length > 0) ? (
                    <div className="mt-3 space-y-5">
                      {slotGroups.map((group) => (
                        <div key={group.dateKey}>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {group.slots.map((s) => {
                              const selected = slot?.iso === s.iso;
                              return (
                                <button
                                  key={s.iso}
                                  type="button"
                                  disabled={!s.available}
                                  onClick={() => setSlot({ iso: s.iso, label: s.label })}
                                  className={`h-11 rounded-xl border text-xs font-bold transition ${
                                    selected
                                      ? "border-emerald-400/70 bg-emerald-500/15 text-white ring-2 ring-emerald-400/30"
                                      : s.available
                                        ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-400/50"
                                        : "cursor-not-allowed border-slate-800/60 bg-slate-950 text-slate-600 line-through"
                                  }`}
                                >
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-amber-200/80">No slots left. Try another time.</p>
                  )
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Pick a duration to see open slots.</p>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      <BottomCta
        show={detailsStep ? canSubmit : canContinue}
        label={
          detailsStep
            ? catalog.paymentProvider && catalog.advanceAmount > 0
              ? `Book & Pay ₹${catalog.advanceAmount.toFixed(2)}`
              : catalog.requireConfirmation
                ? "Request Booking"
                : "Confirm Booking"
            : "Continue →"
        }
        summary={detailsStep ? formatSlotLabel() : canContinue ? formatSlotLabel() : ""}
        onClick={() => {
          if (detailsStep) {
            void submitBooking();
          } else {
            window.scrollTo({ top: 0 });
            setStep("details");
          }
        }}
      />
    </div>
  );
}

function BottomCta({
  show,
  label,
  summary,
  onClick
}: {
  show: boolean;
  label: string;
  summary: string;
  onClick: () => void;
}) {
  if (!show) {
    return null;
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0b1220]/95 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto max-w-sm">
        {summary && <p className="mb-2 truncate text-center text-xs font-bold text-emerald-200">{summary}</p>}
        <button
          type="button"
          onClick={onClick}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-emerald-400 px-4 text-base font-black text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.45)] transition active:scale-[0.98] hover:bg-emerald-300"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

function StepHeading({ num, title }: { num: string; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-black text-white">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-black text-cyan-300">
        {num}
      </span>
      {title}
    </h2>
  );
}

function Chip({ label, highlighted = false }: { label: string; highlighted?: boolean }) {
  return (
    <span
      className={`rounded-md border px-2.5 py-1 font-bold ${
        highlighted ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-300"
      }`}
    >
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "BB";
}

function tableIcon(gameType: string) {
  if (gameType === "PS5") return "🎮";
  if (gameType === "SNOOKER") return "🎱";
  return "🎯";
}

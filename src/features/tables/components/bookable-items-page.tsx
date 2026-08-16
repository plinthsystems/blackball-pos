"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, textInputProps } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import { createBookableItemAction, setBookableItemActiveAction, updateBookableItemAction } from "../actions";
import { GAME_TYPE_LABELS, STATUS_LABELS, gameTypeIcon, pricingGroupLabel, pricingGroupOptions } from "../pricing-groups";
import type { BookableGameType, BookableItem } from "../types";

const gameTypes: BookableGameType[] = ["POOL", "SNOOKER", "PS5"];

export function BookableItemsPage({ items, businessName }: { items: BookableItem[]; businessName: string }) {
  const [number, setNumber] = useState("");
  const [gameType, setGameType] = useState<BookableGameType>("POOL");
  const [pricingGroup, setPricingGroup] = useState("standard");
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const activeCount = items.filter((item) => item.active).length;

  function addItem() {
    startTransition(async () => {
      const result = await createBookableItemAction({ number, gameType, pricingGroup });
      toast.show({ message: result.message, tone: result.ok ? "success" : "danger" });
      if (result.ok) {
        setNumber("");
      }
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-normal text-white">Bookable Items</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tables, consoles, and any other station customers can book at {businessName}. New stores start with an empty
          inventory — add your own items here.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-material border border-lime-300/15 bg-slate-950/80 p-6 shadow-material">
          <p className="text-sm font-bold text-slate-200">No bookable items yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Use the form below to add your first table or console. Until you add items, the live floor and the public
            booking page will stay empty.
          </p>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-black text-white">Add a bookable item</h2>
        <p className="mt-1 text-sm text-slate-400">
          Name it anything — "Royal Snooker 1", "PS5 Console 2", "Pool Table A". The hourly rate defaults from the
          station type and group, and can be changed on the Rates page.
        </p>
      </div>

      <div className="grid gap-3 rounded-material border border-lime-300/15 bg-slate-950/80 p-4 shadow-material md:grid-cols-[1fr_200px_200px_auto]">
        <Field label="Item name">
          <input
            {...textInputProps()}
            value={number}
            placeholder="e.g. Royal Snooker 1"
            onChange={(event) => setNumber(event.target.value)}
          />
        </Field>
        <Field label="Type">
          <select
            className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
            value={gameType}
            onChange={(event) => {
              const nextType = event.target.value as BookableGameType;
              setGameType(nextType);
              setPricingGroup(pricingGroupOptions(nextType)[0] ?? "standard");
            }}
          >
            {gameTypes.map((option) => (
              <option key={option} value={option}>
                {GAME_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rate group">
          <select
            className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
            value={pricingGroup}
            onChange={(event) => setPricingGroup(event.target.value)}
          >
            {pricingGroupOptions(gameType).map((option) => (
              <option key={option} value={option}>
                {pricingGroupLabel(option)}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <Button type="button" variant="primary" disabled={isPending || !number.trim()} onClick={addItem}>
            Add item
          </Button>
        </div>
      </div>

      {items.length > 0 ? (
        <div>
          <h2 className="text-lg font-black text-white">Your inventory ({activeCount} active)</h2>
          <div className="mt-3 overflow-hidden rounded-material border border-lime-300/15 bg-slate-950/80 shadow-material">
            <div className="grid gap-3 border-b border-lime-300/15 px-4 py-3 text-xs font-bold uppercase text-slate-400 md:grid-cols-[1fr_150px_140px_110px_120px_160px]">
              <span>Item</span>
              <span>Type</span>
              <span>Rate group</span>
              <span>Hourly rate</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {items.map((item) => (
              <BookableItemRow
                key={item.id}
                item={item}
                isPending={isPending}
                onChanged={(result) => toast.show({ message: result.message, tone: result.ok ? "success" : "danger" })}
              />
            ))}
            <div className="grid gap-3 border-t border-lime-300/10 px-4 py-3 text-xs text-slate-500 md:grid-cols-[1fr_150px_140px_110px_120px_160px]">
              <span>Items shown here are addable by customers on the public booking page.</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BookableItemRow({
  item,
  isPending,
  onChanged
}: {
  item: BookableItem;
  isPending: boolean;
  onChanged: (result: { ok: boolean; message: string }) => void;
}) {
  const [number, setNumber] = useState(item.number);
  const [gameType, setGameType] = useState<BookableGameType>(item.gameType);
  const [pricingGroup, setPricingGroup] = useState(item.pricingGroup);
  const groupOptions = pricingGroupOptions(gameType);

  function save() {
    updateBookableItemAction({ id: item.id, number, gameType, pricingGroup }).then(onChanged);
  }

  function toggleActive() {
    const result = setBookableItemActiveAction({ id: item.id, active: !item.active });
    result.then(onChanged);
  }

  const statusTone = item.status === "AVAILABLE" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30";

  return (
    <div className={`grid gap-3 border-b border-lime-300/10 px-4 py-3 text-sm text-slate-200 last:border-b-0 md:grid-cols-[1fr_150px_140px_110px_120px_160px] md:items-center ${item.active ? "" : "opacity-60"}`}>
      <input {...textInputProps()} aria-label={`Name for ${item.number}`} value={number} onChange={(event) => setNumber(event.target.value)} disabled={!item.active} />
      <select
        className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
        aria-label={`Type for ${item.number}`}
        value={gameType}
        disabled={!item.active}
        onChange={(event) => {
          const nextType = event.target.value as BookableGameType;
          setGameType(nextType);
          const compatible = pricingGroupOptions(nextType).includes(pricingGroup) ? pricingGroup : pricingGroupOptions(nextType)[0] ?? "standard";
          setPricingGroup(compatible);
        }}
      >
        {gameTypes.map((option) => (
          <option key={option} value={option}>
            {GAME_TYPE_LABELS[option]}
          </option>
        ))}
      </select>
      <select
        className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
        aria-label={`Rate group for ${item.number}`}
        value={pricingGroup}
        disabled={!item.active}
        onChange={(event) => setPricingGroup(event.target.value)}
      >
        {groupOptions.map((option) => (
          <option key={option} value={option}>
            {pricingGroupLabel(option)}
          </option>
        ))}
      </select>
      <span className={`text-sm font-black ${item.hourlyRate > 0 ? "text-lime-300" : "text-slate-500"}`}>
        {item.hourlyRate > 0 ? formatMoney(item.hourlyRate) : "No rate set"}
      </span>
      <span className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-slate-400" aria-hidden="true">
          {gameTypeIcon(gameType)}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusTone}`}>
          {item.active ? STATUS_LABELS[item.status] ?? item.status : "Removed"}
        </span>
      </span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-9 px-3" disabled={isPending || !item.active || !number.trim()} onClick={save}>
          Save
        </Button>
        <Button type="button" variant="ghost" className="h-9 px-3" disabled={isPending} onClick={toggleActive}>
          {item.active ? "Remove" : "Restore"}
        </Button>
      </div>
    </div>
  );
}

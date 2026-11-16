"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { CounterBillData, LiveTableCardData, ProductOption } from "../types";
import { TableBoardToolbar } from "./table-board-toolbar";
import { TableGrid } from "./table-grid";
import { StartCounterBillDialog } from "@/features/sessions/components/start-counter-bill-dialog";
import { AddSessionItemDialog } from "@/features/sessions/components/add-session-item-dialog";
import { EditBillItemsDialog } from "@/features/sessions/components/edit-bill-items-dialog";
import { Button } from "@/components/ui/button";
import { closeCounterBillAction } from "../actions";

export function LiveTablePage({
  tables,
  products,
  counterBills,
  isHqAdmin = false,
  canManageItems = false
}: {
  tables: LiveTableCardData[];
  products: ProductOption[];
  counterBills: CounterBillData[];
  isHqAdmin?: boolean;
  canManageItems?: boolean;
  businessName?: string;
}) {
  const [itemsTarget, setItemsTarget] = useState<{ billId: string; label: string } | null>(null);
  const tableStations = tables.filter((table) => table.gameType !== "PS5");
  const emptyInventory = tables.length === 0;

  return (
    <div className="space-y-5">
      {emptyInventory && canManageItems && (
        <div className="rounded-material border border-cyan-400/40 bg-cyan-500/10 p-3 text-xs font-bold text-cyan-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">sports</span>
            <span>No bookable items yet — add your tables and consoles to start the live floor.</span>
          </div>
          <Link href="/tables" className="px-3 py-1.5 rounded-full bg-cyan-400 text-slate-950 font-black text-sm hover:bg-cyan-300 transition">
            Add items
          </Link>
        </div>
      )}
      {isHqAdmin && (
        <div className="rounded-material border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
            <span>👑 Read-Only HQ Executive Oversight View (Franchise HQ Directors can monitor live floor status across outlets).</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">Read-Only</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TableBoardToolbar />
        {!isHqAdmin && <StartCounterBillDialog />}
      </div>
      {counterBills.length > 0 ? (
        <section className="rounded-material border border-lime-300/15 bg-slate-950/80 p-4 shadow-material">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Counter bills</h2>
            <span className="rounded-full bg-lime-300/10 px-2.5 py-1 text-xs font-bold text-lime-100">{counterBills.length} open</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {counterBills.map((bill) => (
              <CounterBillCard key={bill.id} bill={bill} isHqAdmin={isHqAdmin} onAddItems={(label) => setItemsTarget({ billId: bill.id, label })} />
            ))}
          </div>
        </section>
      ) : null}
      <StationSection title="The Nine Tables" tables={tableStations} onAddItems={(billId, label) => setItemsTarget({ billId, label })} isHqAdmin={isHqAdmin} />
      <AddSessionItemDialog
        billId={itemsTarget?.billId ?? ""}
        tableNumber={itemsTarget?.label ?? ""}
        products={products}
        open={Boolean(itemsTarget)}
        onOpenChange={(open) => { if (!open) setItemsTarget(null); }}
      />
    </div>
  );
}

function StationSection({ title, tables, onAddItems, isHqAdmin }: { title: string; tables: LiveTableCardData[]; onAddItems: (billId: string, label: string) => void; isHqAdmin?: boolean }) {
  return (
    <section className="overflow-hidden rounded-material border border-lime-300/15 bg-slate-950/70 shadow-material">
      <div className="border-b border-lime-300/15 px-4 py-3">
        <h2 className="text-lg font-black uppercase tracking-normal text-white">{title}</h2>
      </div>
      <TableGrid tables={tables} onAddItems={onAddItems} isHqAdmin={isHqAdmin} />
    </section>
  );
}

function CounterBillCard({ bill, isHqAdmin, onAddItems }: { bill: CounterBillData; isHqAdmin?: boolean; onAddItems: (label: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const [editItemsOpen, setEditItemsOpen] = useState(false);
  const [applyFoodDiscount, setApplyFoodDiscount] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-material border border-slate-700 bg-slate-900/80 p-3 text-slate-100">
      <div className="flex justify-between gap-3">
        <strong>{bill.label}</strong>
        <strong>{formatMoney(bill.summary.grandTotal)}</strong>
      </div>
      {bill.items.length ? (
        <div className="mt-3 space-y-1 text-sm">
          {bill.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3">
              <span>{item.name} x{item.quantity}</span>
              <strong>{formatMoney(item.lineTotalAmount)}</strong>
            </div>
          ))}
        </div>
      ) : <p className="mt-2 text-sm text-slate-400">No items yet</p>}
      {bill.items.some((item) => item.category === "FOOD" || item.category === "CAFE") ? (
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={applyFoodDiscount} onChange={(event) => setApplyFoodDiscount(event.target.checked)} className="mt-0.5 h-4 w-4 accent-lime-400" />
          <span>Apply 20% food menu discount <span className="text-slate-500">(food/cafe only)</span></span>
        </label>
      ) : null}
      {!isHqAdmin ? (
        <div className="mt-3 flex gap-2">
          <Button type="button" className="h-9 px-3" onClick={() => onAddItems(bill.label)}>Add items</Button>
          {bill.items.length ? <Button type="button" className="h-9 px-3" onClick={() => setEditItemsOpen(true)}>Edit items</Button> : null}
          <Button
            type="button"
            variant="primary"
            className="h-9 px-3"
            disabled={isPending}
            onClick={() => startTransition(async () => {
              const result = await closeCounterBillAction({ billId: bill.id, applyFoodDiscount });
              if (result.ok) setApplyFoodDiscount(false);
              else setMessage(result.message);
            })}
          >
            {isPending ? "Closing…" : "Close bill"}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-amber-300 font-semibold">Read-Only HQ Oversight Mode</p>
      )}
      {message ? <p role="status" className="mt-2 text-xs text-rose-300">{message}</p> : null}
      <EditBillItemsDialog billLabel={bill.label} items={bill.items} open={editItemsOpen} onOpenChange={setEditItemsOpen} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import type { CounterBillData, LiveTableCardData, ProductOption } from "../types";
import { TableBoardToolbar } from "./table-board-toolbar";
import { TableGrid } from "./table-grid";
import { StartCounterBillDialog } from "@/features/sessions/components/start-counter-bill-dialog";
import { AddSessionItemDialog } from "@/features/sessions/components/add-session-item-dialog";
import { Button } from "@/components/ui/button";
import { closeCounterBillAction } from "../actions";

export function LiveTablePage({
  tables,
  products,
  counterBills
}: {
  tables: LiveTableCardData[];
  products: ProductOption[];
  counterBills: CounterBillData[];
}) {
  const tableStations = tables.filter((table) => table.gameType !== "PS5");
  const ps5Stations = tables.filter((table) => table.gameType === "PS5");
  const activeCount = tables.filter((table) => table.status === "OCCUPIED").length;
  const availableCount = tables.filter((table) => table.status === "AVAILABLE").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TableBoardToolbar tables={tables} />
        <StartCounterBillDialog />
      </div>
      <section className="grid gap-3 md:grid-cols-4" aria-label="Live floor summary">
        <SummaryTile label="Active" value={activeCount} tone="lime" />
        <SummaryTile label="Available" value={availableCount} tone="cyan" />
        <SummaryTile label="Counter bills" value={counterBills.length} tone="amber" />
        <SummaryTile label="Stations" value={tables.length} tone="slate" />
      </section>
      <StationSection title="Snooker & Pool" tables={tableStations} products={products} />
      <StationSection title="PS5" tables={ps5Stations} products={products} />
      {counterBills.length > 0 ? (
        <section className="rounded-material border border-lime-300/15 bg-slate-950/80 p-4 shadow-material">
          <h2 className="text-lg font-semibold">Counter bills</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {counterBills.map((bill) => (
              <CounterBillCard key={bill.id} bill={bill} products={products} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "lime" | "cyan" | "amber" | "slate" }) {
  const toneClass = {
    lime: "text-lime-300",
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    slate: "text-slate-100"
  }[tone];

  return (
    <div className="rounded-material border border-lime-300/15 bg-slate-950/80 p-4 shadow-material">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <strong className={`mt-1 block font-mono text-3xl font-black ${toneClass}`}>{value}</strong>
    </div>
  );
}

function StationSection({ title, tables, products }: { title: string; tables: LiveTableCardData[]; products: ProductOption[] }) {
  return (
    <section className="overflow-hidden rounded-material border border-lime-300/15 bg-slate-950/70 shadow-material">
      <div className="border-b border-lime-300/15 px-4 py-3">
        <h2 className="text-lg font-black uppercase tracking-normal text-white">{title}</h2>
      </div>
      <TableGrid tables={tables} products={products} />
    </section>
  );
}

function CounterBillCard({ bill, products }: { bill: CounterBillData; products: ProductOption[] }) {
  const router = useRouter();
  const [itemsOpen, setItemsOpen] = useState(false);

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
      <div className="mt-3 flex gap-2">
        <Button type="button" className="h-9 px-3" onClick={() => setItemsOpen(true)}>Add items</Button>
        <Button
          type="button"
          variant="primary"
          className="h-9 px-3"
          onClick={async () => {
            await closeCounterBillAction({ billId: bill.id });
            router.refresh();
          }}
        >
          Close bill
        </Button>
      </div>
      <AddSessionItemDialog billId={bill.id} tableNumber={bill.label} products={products} open={itemsOpen} onOpenChange={setItemsOpen} />
    </div>
  );
}

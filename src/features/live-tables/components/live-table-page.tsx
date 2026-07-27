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
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-material border border-outline bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline px-4 py-3">
          <TableBoardToolbar tables={tables} />
          <StartCounterBillDialog />
        </div>
        <TableGrid tables={tables} products={products} />
      </section>
      {counterBills.length > 0 ? (
        <section className="rounded-material border border-outline bg-surface p-4 shadow-sm">
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

function CounterBillCard({ bill, products }: { bill: CounterBillData; products: ProductOption[] }) {
  const router = useRouter();
  const [itemsOpen, setItemsOpen] = useState(false);

  return (
    <div className="rounded-material border border-outline p-3">
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
      ) : <p className="mt-2 text-sm text-neutral-500">No items yet</p>}
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

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import type { BillLineItem } from "@/features/live-tables/types";
import { removeBillItemAction, updateBillItemQuantityAction } from "@/features/live-tables/actions";

export function EditBillItemsDialog({
  billLabel,
  items,
  open,
  onOpenChange
}: {
  billLabel: string;
  items: BillLineItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [visibleItems, setVisibleItems] = useState(items);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestInFlight = useRef(false);

  useEffect(() => {
    setVisibleItems(items);
    setQuantities(Object.fromEntries(items.map((item) => [item.id, item.quantity])));
  }, [items]);

  function saveQuantity(item: BillLineItem) {
    const quantity = quantities[item.id];
    if (requestInFlight.current || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || quantity === item.quantity) return;

    requestInFlight.current = true;
    setPendingItemId(item.id);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateBillItemQuantityAction({ billItemId: item.id, quantity });
        setMessage(result.message);
        if (result.ok) {
          setVisibleItems((current) => current.map((currentItem) => currentItem.id === item.id
            ? { ...currentItem, quantity, lineTotalAmount: currentItem.unitPriceAmount * quantity }
            : currentItem));
          router.refresh();
        }
      } catch {
        setMessage("We couldn't confirm the change. Refresh the bill before trying again.");
        router.refresh();
      } finally {
        requestInFlight.current = false;
        setPendingItemId(null);
      }
    });
  }

  function removeItem(item: BillLineItem) {
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setPendingItemId(item.id);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await removeBillItemAction({ billItemId: item.id });
        setMessage(result.message);
        if (result.ok) {
          setVisibleItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
          setQuantities((current) => {
            const next = { ...current };
            delete next[item.id];
            return next;
          });
          router.refresh();
        }
      } catch {
        setMessage("We couldn't confirm removal. Refresh the bill before trying again.");
        router.refresh();
      } finally {
        requestInFlight.current = false;
        setPendingItemId(null);
      }
    });
  }

  return (
    <Dialog
      open={open}
      title={`Edit bill · ${billLabel}`}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <p className="rounded-material border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">No items on this bill.</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {visibleItems.map((item) => {
              const quantity = quantities[item.id] ?? item.quantity;
              const rowPending = isPending && pendingItemId === item.id;
              return (
                <div key={item.id} className="rounded-material border border-slate-700 bg-slate-900/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">{formatMoney(item.unitPriceAmount)} each · current {item.quantity} · {formatMoney(item.lineTotalAmount)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      className="h-8 shrink-0 px-2.5 text-xs"
                      disabled={isPending}
                      onClick={() => removeItem(item)}
                    >
                      {rowPending && message === null ? "Removing…" : "Remove"}
                    </Button>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <label className="min-w-0 flex-1 text-xs font-semibold text-slate-400">
                      Quantity
                      <input
                        className="mt-1 h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-white"
                        type="number"
                        min={1}
                        max={99}
                        value={quantity}
                        disabled={isPending}
                        onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="primary"
                      className="h-10 px-3 text-xs"
                      disabled={isPending || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || quantity === item.quantity}
                      onClick={() => saveQuantity(item)}
                    >
                      {rowPending && message === null ? "Saving…" : "Save quantity"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="min-h-5 text-sm text-cyan-200" role="status" aria-live="polite">
          {isPending ? "Updating the bill… please wait." : message}
        </p>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
}

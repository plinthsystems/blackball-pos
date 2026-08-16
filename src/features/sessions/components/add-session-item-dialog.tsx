"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBillItemAction } from "@/features/live-tables/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, textInputProps } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/money";
import type { ProductCategory, ProductOption } from "@/features/live-tables/types";

const categoryLabels: Record<ProductCategory, string> = {
  FOOD: "Food",
  CAFE: "Food",
  CIGARETTES: "Cigarettes",
  BEVERAGES: "Beverages"
};

const categoryOrder: ProductCategory[] = ["FOOD", "CIGARETTES", "BEVERAGES"];

export function AddSessionItemDialog({
  billId,
  tableNumber,
  products,
  open,
  onOpenChange
}: {
  billId: string;
  tableNumber: string;
  products: ProductOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [productId, products]);
  const previewTotal = selectedProduct ? selectedProduct.priceAmount * quantity : 0;

  function addItem() {
    startTransition(async () => {
      const result = await addBillItemAction({ billId, productId, quantity });
      toast.show({ message: result.message, tone: result.ok ? "success" : "danger" });
      if (result.ok) {
        onOpenChange(false);
        setQuantity(1);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Dialog open={open} title={`Add items to ${tableNumber}`} onOpenChange={onOpenChange}>
        {products.length === 0 ? (
          <p className="text-sm text-slate-400">No menu products are active yet.</p>
        ) : (
          <div className="space-y-4">
            <Field label="Item">
              <select
                className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
              >
                {categoryOrder.map((category) => {
                  const options = products.filter((product) => product.category === category);
                  if (options.length === 0) {
                    return null;
                  }

                  return (
                    <optgroup key={category} label={categoryLabels[category]}>
                      {options.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatMoney(product.priceAmount)}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </Field>
            <Field label="Quantity">
              <input
                {...textInputProps()}
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </Field>
            <div className="flex items-center justify-between rounded-material border border-lime-300/20 bg-slate-900 px-3 py-2 text-sm">
              <span className="text-slate-400">Line total</span>
              <strong>{formatMoney(previewTotal)}</strong>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" variant="primary" disabled={isPending || !productId || quantity < 1} onClick={addItem}>
                Add to bill
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

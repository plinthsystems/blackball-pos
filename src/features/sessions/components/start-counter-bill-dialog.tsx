"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, textInputProps } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { startCounterBillAction } from "@/features/live-tables/actions";

export function StartCounterBillDialog() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  function startBill() {
    startTransition(async () => {
      const result = await startCounterBillAction({ label });
      toast.show({ message: result.message, tone: result.ok ? "success" : "danger" });
      if (result.ok) {
        setOpen(false);
        setLabel("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>Start counter bill</Button>
      <Dialog open={open} title="Start counter bill" onOpenChange={setOpen}>
        <div className="space-y-4">
          <Field label="Bill label">
            <input {...textInputProps()} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Food parcel, regular customer" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" variant="primary" disabled={isPending} onClick={startBill}>Start bill</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

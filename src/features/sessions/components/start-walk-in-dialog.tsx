"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { startWalkInSessionAction } from "@/features/live-tables/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, textInputProps } from "@/components/ui/field";
import { Snackbar } from "@/components/ui/snackbar";
import { startWalkInSessionSchema, type StartWalkInSessionInput } from "../schemas";

export function StartWalkInDialog({
  tableId,
  tableNumber,
  open,
  onOpenChange
}: {
  tableId: string;
  tableNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<StartWalkInSessionInput>({
    resolver: zodResolver(startWalkInSessionSchema),
    defaultValues: { tableId, customerName: "", customerPhone: "" }
  });

  function onSubmit(values: StartWalkInSessionInput) {
    startTransition(async () => {
      const result = await startWalkInSessionAction({ ...values, tableId });
      setMessage(result.message);
      if (result.ok) {
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Dialog open={open} title={`Start session for ${tableNumber}`} onOpenChange={onOpenChange}>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" value={tableId} {...register("tableId")} />
          <Field label="Customer name" error={errors.customerName?.message}>
            <input {...textInputProps()} {...register("customerName")} />
          </Field>
          <Field label="Phone" error={errors.customerPhone?.message}>
            <input {...textInputProps()} {...register("customerPhone")} />
          </Field>
          <Field label="Duration" error={errors.durationMinutes ? "Choose a duration." : undefined}>
            <select
              className="h-10 w-full rounded-material border border-outline bg-surface px-3 text-sm text-neutral-900"
              defaultValue=""
              {...register("durationMinutes", { valueAsNumber: true })}
            >
              <option value="">Select duration</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isPending}>Start session</Button>
          </div>
        </form>
      </Dialog>
      <Snackbar message={message} tone={message === "Session started." ? "success" : "danger"} />
    </>
  );
}

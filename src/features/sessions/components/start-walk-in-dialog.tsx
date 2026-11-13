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
import type { LiveTableGameType } from "@/features/live-tables/types";
import { startWalkInSessionSchema, type StartWalkInSessionInput } from "../schemas";

export function StartWalkInDialog({
  tableId,
  tableNumber,
  gameType = "POOL",
  open,
  onOpenChange
}: {
  tableId: string;
  tableNumber: string;
  gameType?: LiveTableGameType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<1 | 2 | 3 | 4>(1);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<StartWalkInSessionInput>({
    resolver: zodResolver(startWalkInSessionSchema),
    defaultValues: { tableId, customerName: "", customerPhone: "", ps5MemberCount: 1, durationMinutes: 60 }
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
          {gameType === "PS5" ? (
            <Field label="Members" error={errors.ps5MemberCount?.message}>
              <select
                className="h-10 w-full rounded-material border border-lime-300/40 bg-slate-950 px-3 text-sm font-semibold text-lime-100"
                value={memberCount}
                {...register("ps5MemberCount", {
                  valueAsNumber: true,
                  onChange: (event) => setMemberCount(Number(event.target.value) as 1 | 2 | 3 | 4)
                })}
              >
                <option value={1}>1 player</option>
                <option value={2}>2 players</option>
                <option value={3}>3 players</option>
                <option value={4}>4 players</option>
              </select>
            </Field>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isPending}>{isPending ? "Starting…" : "Start session"}</Button>
          </div>
        </form>
      </Dialog>
      <Snackbar message={message} tone={message === "Session started." ? "success" : "danger"} />
    </>
  );
}

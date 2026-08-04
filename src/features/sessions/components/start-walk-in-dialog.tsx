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
import { formatMoney } from "@/lib/money";
import type { LiveTableGameType } from "@/features/live-tables/types";
import { startWalkInSessionSchema, type StartWalkInSessionInput } from "../schemas";

export function StartWalkInDialog({
  tableId,
  tableNumber,
  gameType = "POOL",
  hourlyRate = 0,
  ps5MemberRates,
  open,
  onOpenChange
}: {
  tableId: string;
  tableNumber: string;
  gameType?: LiveTableGameType;
  hourlyRate?: number;
  ps5MemberRates?: Record<1 | 2 | 3 | 4, number>;
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
    defaultValues: { tableId, customerName: "", customerPhone: "", ps5MemberCount: 1 }
  });
  const ps5Rates = ps5MemberRates ?? { 1: hourlyRate || 100, 2: 150, 3: 200, 4: 250 };
  const previewRate = gameType === "PS5" ? ps5Rates[memberCount] : hourlyRate;

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
              className="h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
              defaultValue=""
              {...register("durationMinutes", { valueAsNumber: true })}
            >
              <option value="">Select duration</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
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
          <div className="rounded-material border border-lime-300/30 bg-slate-950 px-3 py-2 text-sm font-semibold text-lime-100 shadow-[0_0_20px_rgba(132,204,22,0.12)]">
            {gameType === "PS5" ? `PS5 rate: ${formatMoney(previewRate)}/hr` : `Rate: ${formatMoney(previewRate)}/hr`}
          </div>
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

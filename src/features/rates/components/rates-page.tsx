"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { textInputProps } from "@/components/ui/field";
import { Snackbar } from "@/components/ui/snackbar";
import { formatMoney } from "@/lib/money";
import { updateHourlyRateAction } from "../actions";
import type { RateSetting } from "../types";

export function RatesPage({ rates }: { rates: RateSetting[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRate(rate: RateSetting, hourlyRate: number) {
    startTransition(async () => {
      const result = await updateHourlyRateAction({ id: rate.id, hourlyRate });
      setMessage(result.message);
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hourly Rates</h1>
      </div>
      <div className="overflow-hidden rounded-material border border-outline bg-surface shadow-sm">
        <div className="grid gap-3 border-b border-outline px-4 py-3 text-xs font-semibold uppercase text-neutral-500 md:grid-cols-[1fr_180px_160px]">
          <span>Station type</span>
          <span>Hourly rate</span>
          <span>Actions</span>
        </div>
        {rates.map((rate) => (
          <RateRow key={rate.id} rate={rate} disabled={isPending} onUpdate={updateRate} />
        ))}
      </div>
      <Snackbar message={message} tone={message?.includes("could not") ? "danger" : "success"} />
    </section>
  );
}

function RateRow({
  rate,
  disabled,
  onUpdate
}: {
  rate: RateSetting;
  disabled: boolean;
  onUpdate: (rate: RateSetting, hourlyRate: number) => void;
}) {
  const [hourlyRate, setHourlyRate] = useState(rate.hourlyRate);

  return (
    <div className="grid gap-3 border-b border-outline px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_180px_160px] md:items-center">
      <div>
        <strong>{rate.label}</strong>
        <p className="text-xs text-neutral-500">{formatMoney(rate.hourlyRate)}/hr current</p>
      </div>
      <input
        {...textInputProps()}
        aria-label={`Rate for ${rate.label}`}
        type="number"
        min={0}
        value={hourlyRate}
        onChange={(event) => setHourlyRate(Number(event.target.value))}
      />
      <Button type="button" className="h-9 px-3" disabled={disabled} onClick={() => onUpdate(rate, hourlyRate)}>
        Update rate
      </Button>
    </div>
  );
}

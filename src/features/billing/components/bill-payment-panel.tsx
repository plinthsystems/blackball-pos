"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { recordBillPaymentAction } from "@/features/live-tables/actions";
import type { BillingRecord } from "../types";

export function BillPaymentPanel({ record }: { record: BillingRecord }) {
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const paymentStatus = record.paymentStatus ?? "PAID";
  const paidAmount = record.paidAmount ?? 0;
  const remainingAmount = record.remainingAmount ?? 0;
  const payments = record.payments ?? [];
  const enteredAmount = Math.round((Number(cashAmount || 0) + Number(upiAmount || 0)) * 100) / 100;
  const isFullPayment = Math.abs(enteredAmount - remainingAmount) < 0.005;

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await recordBillPaymentAction({
        billId: record.id,
        cashAmount: Number(cashAmount || 0),
        upiAmount: Number(upiAmount || 0)
      });
      setMessage(result.message);
      if (result.ok) {
        setCashAmount("");
        setUpiAmount("");
      }
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4" aria-label="Bill payment">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white">Payment</h4>
          <p className="mt-1 text-xs text-slate-400">Received {formatMoney(paidAmount)} · Balance {formatMoney(remainingAmount)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${paymentStatus === "PAID" ? "bg-emerald-400/15 text-emerald-300" : paymentStatus === "PARTIAL" ? "bg-amber-400/15 text-amber-300" : "bg-rose-400/15 text-rose-300"}`}>
          {paymentStatus === "PAID" ? "Paid" : paymentStatus === "PARTIAL" ? "Partially paid" : "Due"}
        </span>
      </div>

      {payments.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-300">
          {(["CASH", "UPI"] as const).map((method) => {
            const total = payments.filter((payment) => payment.method === method).reduce((sum, payment) => sum + payment.amount, 0);
            return total > 0 ? <span key={method}>{method}: <strong>{formatMoney(total)}</strong></span> : null;
          })}
        </div>
      ) : paymentStatus === "PAID" ? (
        <p className="mt-3 text-xs text-slate-500">This bill was settled before payment tracking was added.</p>
      ) : null}

      {paymentStatus !== "PAID" ? (
        <form onSubmit={submitPayment} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-xs font-semibold text-slate-400">
            Cash received (₹)
            <input
              type="number"
              min="0"
              max={remainingAmount}
              step="0.01"
              inputMode="decimal"
              value={cashAmount}
              onChange={(event) => setCashAmount(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"
              placeholder="0.00"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-400">
            UPI received (₹)
            <input
              type="number"
              min="0"
              max={remainingAmount}
              step="0.01"
              inputMode="decimal"
              value={upiAmount}
              onChange={(event) => setUpiAmount(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"
              placeholder="0.00"
            />
          </label>
          <Button type="submit" variant="primary" disabled={isPending || (!Number(cashAmount) && !Number(upiAmount))} className="h-10">
            {isPending ? "Saving…" : isFullPayment ? "Record & mark paid" : "Record partial payment"}
          </Button>
          <p className="text-xs text-slate-500 sm:col-span-3">Cash and UPI can be combined. Any unpaid balance remains due.</p>
        </form>
      ) : null}
      {message ? <p role="status" className="mt-3 text-sm font-semibold text-lime-300">{message}</p> : null}
    </section>
  );
}

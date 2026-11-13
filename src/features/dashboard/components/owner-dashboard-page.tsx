import { formatMoney } from "@/lib/money";
import type { OwnerDashboardData } from "../types";
import Link from "next/link";

export function OwnerDashboardPage({ data }: { data: OwnerDashboardData }) {
  const dailyTrend = data.dailyTrend ?? [];
  const reportingWindow = data.reportingWindow ?? "today";
  const windowLabel = reportingWindow === "30d" ? "Last 30 days" : reportingWindow === "7d" ? "Last 7 days" : "Today";
  const revenueRows = [
    { label: "Snooker & Pool time", value: data.revenue.stationTime },
    { label: "Food", value: data.revenue.food },
    { label: "Cigarettes", value: data.revenue.cigarettes },
    { label: "Beverages", value: data.revenue.beverages }
  ];

  return (
    <section className="space-y-5">
      <div className="relative isolate overflow-hidden rounded-2xl border border-lime-300/20 bg-slate-950 p-5 shadow-material sm:p-6">
        <img src="/the-nine/club-opening.webp" alt="The Nine club floor" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
        <div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Owner overview</h1>
          <p className="mt-1 text-sm text-slate-400">Sales, revenue, and table usage at a glance.</p>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          {[
            ["today", "Today"],
            ["7d", "7 days"],
            ["30d", "30 days"]
          ].map(([value, label]) => (
            <Link
              key={value}
              href={value === "today" ? "/dashboard" : `/dashboard?range=${value}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                value === reportingWindow ? "bg-lime-400 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
          </div>
          <div className="flex gap-2">
            <Link href="/live-tables" className="rounded-xl bg-lime-300 px-3 py-2 text-xs font-black text-slate-950 hover:bg-lime-200">Open live floor</Link>
            <Link href="/billing" className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-black text-slate-200 hover:border-lime-300/40">Review billing</Link>
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label={reportingWindow === "today" ? "Today's revenue" : `${windowLabel} revenue`} value={formatMoney(data.totalRevenue)} />
        <MetricCard label="Closed bills" value={String(data.closedBillCount)} />
        <MetricCard label="Open bills" value={String(data.openBillCount)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-material border border-lime-300/15 bg-slate-950/80 p-4 shadow-material">
          <h2 className="text-lg font-black text-white">Revenue by category</h2>
          <div className="mt-3 space-y-2">
            {revenueRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-lime-300/10 py-2 text-slate-200 last:border-b-0">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.45)]" aria-hidden="true" />
                  {row.label}
                </span>
                <strong className="text-white">{formatMoney(row.value)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-material border border-cyan-300/15 bg-slate-950/80 p-4 shadow-material">
          <h2 className="text-lg font-black text-white">Busy hours</h2>
          <div className="mt-3 space-y-2">
            {data.busyHours.filter((row) => row.label !== "PS5").map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-cyan-300/10 py-2 text-slate-300 last:border-b-0">
                <span>{row.label}</span>
                <strong className="font-mono text-cyan-200">{row.hours.toFixed(2)}h</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-material border border-amber-300/15 bg-slate-950/80 p-4 shadow-material xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-white">Sales trend</h2>
              <p className="mt-1 text-xs text-slate-500">{windowLabel} · closed bills</p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">
              {dailyTrend.reduce((total, row) => total + row.closedBills, 0)} bills
            </span>
          </div>
          {dailyTrend.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              {dailyTrend.map((row) => (
                <div key={row.date} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{formatTrendDate(row.date)}</p>
                  <strong className="mt-2 block text-lg font-black text-amber-200">{formatMoney(row.revenue)}</strong>
                  <p className="mt-1 text-[11px] text-slate-500">{row.closedBills} closed bill{row.closedBills === 1 ? "" : "s"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">No closed bills in this window.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function formatTrendDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-material border border-lime-300/15 bg-slate-950/80 p-4 shadow-material">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <strong className="mt-2 block font-mono text-3xl font-black text-lime-300">{value}</strong>
    </div>
  );
}

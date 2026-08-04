import { formatMoney } from "@/lib/money";
import type { OwnerDashboardData } from "../types";

export function OwnerDashboardPage({ data }: { data: OwnerDashboardData }) {
  const revenueRows = [
    { label: "Snooker & Pool time", value: data.revenue.stationTime },
    { label: "PS5 time", value: data.revenue.ps5Time },
    { label: "Food", value: data.revenue.food },
    { label: "Cigarettes", value: data.revenue.cigarettes },
    { label: "Beverages", value: data.revenue.beverages }
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-normal text-white">Owner Dashboard</h1>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Today's revenue" value={formatMoney(data.totalRevenue)} />
        <MetricCard label="Closed bills" value={String(data.closedBillCount)} />
        <MetricCard label="Open bills" value={String(data.openBillCount)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
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
            {data.busyHours.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-cyan-300/10 py-2 text-slate-300 last:border-b-0">
                <span>{row.label}</span>
                <strong className="font-mono text-cyan-200">{row.hours.toFixed(2)}h</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-material border border-lime-300/15 bg-slate-950/80 p-4 shadow-material">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <strong className="mt-2 block font-mono text-3xl font-black text-lime-300">{value}</strong>
    </div>
  );
}

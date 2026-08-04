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
          <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">Today&apos;s revenue and station utilization.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Today's revenue" value={formatMoney(data.totalRevenue)} />
        <MetricCard label="Closed bills" value={String(data.closedBillCount)} />
        <MetricCard label="Open bills" value={String(data.openBillCount)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-material border border-outline bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Revenue by category</h2>
          <div className="mt-3 space-y-2">
            {revenueRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-outline py-2 last:border-b-0">
                <span>{row.label}</span>
                <strong>{formatMoney(row.value)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-material border border-outline bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Busy hours</h2>
          <div className="mt-3 space-y-2">
            {data.busyHours.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-outline py-2 last:border-b-0">
                <span>{row.label}</span>
                <strong>{row.hours.toFixed(2)}h</strong>
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
    <div className="rounded-material border border-outline bg-surface p-4 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <strong className="mt-2 block text-3xl">{value}</strong>
    </div>
  );
}

"use client";

import type { HqMasterDashboardData } from "@/server/services/hq-analytics-service";

type HqMasterDashboardProps = {
  data: HqMasterDashboardData;
};

export function HqMasterDashboard({ data }: HqMasterDashboardProps) {
  const maxRevenue = Math.max(...data.peakHoursBreakdown.map((h) => h.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Franchise HQ Master Dashboard</h1>
          <p className="text-sm text-slate-400">
            Real-time performance across all outlets under <span className="font-semibold text-lime-400">{data.organizationName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync Active
          </span>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Outlets</span>
            <span className="material-symbols-outlined text-[20px] text-lime-400">store</span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{data.totalOutlets}</p>
          <p className="mt-1 text-xs text-slate-400">Active Franchise Locations</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Combined Sales Today</span>
            <span className="material-symbols-outlined text-[20px] text-emerald-400">payments</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">₹{data.totalSalesToday.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-slate-400">Total F&B + Game Time revenue</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Tables Now</span>
            <span className="material-symbols-outlined text-[20px] text-cyan-400">sports_bar</span>
          </div>
          <p className="mt-2 text-2xl font-black text-cyan-300">
            {data.totalActiveTablesNow} <span className="text-sm font-normal text-slate-400">/ {data.totalTablesAcrossOutlets}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Tables currently playing</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Overall Occupancy</span>
            <span className="material-symbols-outlined text-[20px] text-amber-400">equalizer</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-300">{data.overallOccupancyPercentage}%</p>
          <p className="mt-1 text-xs text-slate-400">Network utilization rate</p>
        </div>
      </div>

      {/* Outlets Performance Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-lime-400">leaderboard</span>
          Outlet Comparison & Real-Time Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Outlet Name</th>
                <th className="px-4 py-3">Active Tables</th>
                <th className="px-4 py-3">Occupancy</th>
                <th className="px-4 py-3 text-right">Sessions Today</th>
                <th className="px-4 py-3 text-right">Sales Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.outletSummaries.map((outlet) => (
                <tr key={outlet.businessId} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-lime-400" />
                    {outlet.businessName}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    {outlet.activeTablesCount} / {outlet.totalTablesCount} tables
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-lime-400 rounded-full"
                          style={{ width: `${Math.min(outlet.occupancyPercentage, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-300">{outlet.occupancyPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-300">
                    {outlet.todaySessionCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                    ₹{outlet.todaySales.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Peak Hours Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">schedule</span>
          Peak Hours Sales Distribution
        </h2>
        <div className="h-44 flex items-end gap-1.5 border-b border-slate-800 pb-2 pt-4 px-2">
          {data.peakHoursBreakdown.map((item) => {
            const heightPercent = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
            return (
              <div key={item.hourLabel} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-slate-950 border border-slate-700 text-slate-200 text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                  {item.hourLabel}: ₹{item.revenue} ({item.sessionCount} sessions)
                </div>
                <div className="w-full bg-slate-800 rounded-t h-full flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-lime-500 to-emerald-400 rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-mono rotate-45 sm:rotate-0 mt-1">{item.hourLabel.slice(0, 2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

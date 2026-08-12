import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { DemoPersonaSelectorUI } from "./persona-selector-ui";

export default async function DemoAccountsPage() {
  const context = await getCurrentEmployeeContext();

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400">
            <span className="material-symbols-outlined text-[24px]">switch_account</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Demo Accounts & Persona Switcher</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Instantly log in as a Franchise HQ Director, Outlet Manager, or Independent SaaS Owner to test multi-tenancy capabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Active Persona Banner */}
      <div className="rounded-2xl border border-lime-400/30 bg-slate-900/80 p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-lime-400 uppercase tracking-wider">Currently Logged In As</span>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
            {context.employeeName}
            <span className="text-xs font-mono font-normal text-slate-400">({context.employeeEmail})</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Role: <span className="font-bold text-lime-300">{context.accountType}</span> • Organization: <span className="font-bold text-lime-300">{context.organization?.name ?? "Independent Store"}</span>
          </p>
        </div>
        <div className="rounded-xl bg-lime-500/20 border border-lime-500/30 px-4 py-2 text-xs font-bold text-lime-300 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
          Active Persona Session
        </div>
      </div>

      {/* Persona Selection UI */}
      <DemoPersonaSelectorUI currentEmail={context.employeeEmail} />
    </div>
  );
}

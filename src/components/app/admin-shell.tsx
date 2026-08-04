import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountType, TenantBranding } from "@/server/auth/current-employee";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "monitoring", permission: "dashboard.read" },
  { href: "/live-tables", label: "Live Floor", icon: "grid_view", permission: "tables.read" },
  { href: "/settings", label: "Food/Menu", icon: "restaurant", permission: "products.manage" },
  { href: "/rates", label: "Rates", icon: "currency_rupee", permission: "rates.manage" }
];

type ShellAccount = {
  name: string;
  accountType: AccountType;
  permissions: string[];
};

const fallbackBranding: TenantBranding = {
  appName: "Black Ball",
  logoInitials: "BB",
  businessName: "Pool & Snooker Cafe",
  brandColor: "#12613d",
  accentColor: "#b98922"
};

const fallbackAccount: ShellAccount = {
  name: "Manager",
  accountType: "MANAGER",
  permissions: ["dashboard.read", "tables.read", "products.manage", "rates.manage"]
};

export function AdminShell({
  children,
  tenantBranding = fallbackBranding,
  account = fallbackAccount
}: {
  children: ReactNode;
  tenantBranding?: TenantBranding;
  account?: ShellAccount;
}) {
  const visibleNavItems = navItems.filter((item) => account.permissions.includes(item.permission));
  const accountLabel = account.accountType === "MANAGER" ? account.name : "Store User";

  return (
    <div className="min-h-screen bg-background text-charcoal">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-lime-300/15 bg-slate-950/95 text-white shadow-[0_0_38px_rgba(132,204,22,0.08)] lg:block">
        <div className="border-b border-lime-300/15 px-5 py-4">
          <BrandMark branding={tenantBranding} />
        </div>
        <nav className="p-3" aria-label="Admin navigation">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-3 rounded-material px-3 text-sm font-bold text-slate-300 hover:bg-lime-300/10 hover:text-lime-100"
            >
              <span className="material-symbols-outlined text-[20px] text-lime-300" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-lime-300/15 bg-slate-950/85 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center justify-between">
            <BrandMark branding={tenantBranding} compact />
            <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase text-cyan-100">{accountLabel}</div>
          </div>
        </header>
        <main className="px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

function BrandMark({ branding, compact = false }: { branding: TenantBranding; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black text-white shadow-[0_0_22px_rgba(132,204,22,0.25)]"
        style={{ backgroundColor: branding.brandColor, borderColor: branding.accentColor }}
      >
        {branding.logoInitials}
      </div>
      <div>
        <p className={compact ? "text-sm font-black text-white" : "text-sm font-black text-white"}>{branding.appName}</p>
        {!compact ? <p className="text-xs text-lime-100/60">{branding.businessName}</p> : null}
      </div>
    </div>
  );
}

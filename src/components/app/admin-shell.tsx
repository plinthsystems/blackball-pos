"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountType, OrganizationContext, TenantBranding } from "@/server/auth/current-employee";
import { StoreSwitcher } from "./store-switcher";

const navItems = [
  { href: "/hq/dashboard", label: "Franchise HQ", icon: "corporate_fare", permission: "hq.dashboard.read" },
  { href: "/dashboard", label: "Dashboard", icon: "monitoring", permission: "dashboard.read" },
  { href: "/live-tables", label: "Live Floor", icon: "grid_view", permission: "tables.read" },
  { href: "/settings", label: "Food/Menu", icon: "restaurant", permission: "products.manage" },
  { href: "/rates", label: "Rates", icon: "currency_rupee", permission: "rates.manage" }
];

type ShellAccount = {
  name: string;
  email?: string;
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
  email: "manager@example.com",
  accountType: "MANAGER",
  permissions: ["dashboard.read", "tables.read", "products.manage", "rates.manage"]
};

export function AdminShell({
  children,
  tenantBranding = fallbackBranding,
  account = fallbackAccount,
  businessId = "seed-business",
  organization
}: {
  children: ReactNode;
  tenantBranding?: TenantBranding;
  account?: ShellAccount;
  businessId?: string;
  organization?: OrganizationContext;
}) {
  const visibleNavItems = navItems.filter((item) => account.permissions.includes(item.permission));
  const accountLabelMap: Record<AccountType, string> = {
    HQ_ADMIN: "Franchise HQ Director",
    STORE_OWNER: "Store Owner",
    MANAGER: "Store Manager",
    STORE_USER: "Store User"
  };
  const accountLabel = accountLabelMap[account.accountType] ?? "Store User";

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
            <div className="flex items-center gap-3">
              {organization && organization.businesses.length > 0 && (
                <StoreSwitcher
                  currentBusinessId={businessId}
                  organizationName={organization.name}
                  organizationType={organization.type}
                  stores={organization.businesses}
                />
              )}
              <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase text-cyan-100">
                {accountLabel}
              </div>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                title="Sign Out"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 transition"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
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
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/25 bg-slate-900 text-sm font-black text-white shadow-[0_0_22px_rgba(34,211,238,0.14)]"
      >
        <span className="absolute inset-1 rounded-full border" style={{ borderColor: branding.brandColor }} aria-hidden="true" />
        {branding.logoInitials}
      </div>
      <div>
        <p className={compact ? "text-sm font-black text-white" : "text-sm font-black text-white"}>{branding.appName}</p>
        {!compact ? <p className="text-xs text-cyan-100/60">{branding.businessName}</p> : null}
      </div>
    </div>
  );
}

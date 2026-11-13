"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AccountType, OrganizationContext, TenantBranding } from "@/server/auth/current-employee";
import { StoreSwitcher } from "./store-switcher";

const legacyNavItems = [
  { href: "/platform/setup", label: "Platform Setup", icon: "add_business", permission: "platform.setup.manage" },
  { href: "/hq/dashboard", label: "Franchise HQ", icon: "corporate_fare", permission: "hq.dashboard.read" },
  { href: "/dashboard", label: "Dashboard", icon: "monitoring", permission: "dashboard.read" },
  { href: "/live-tables", label: "Live Floor", icon: "grid_view", permission: "tables.read" },
  { href: "/tables", label: "Bookable Items", icon: "sports", permission: "tables.manage" },
  { href: "/bookings", label: "Bookings", icon: "calendar_month", permission: "bookings.manage" },
  { href: "/billing", label: "Billing", icon: "receipt_long", permission: "billing.read" },
  { href: "/settings", label: "Food/Menu", icon: "restaurant", permission: "products.manage" }
];

const theNineAdminNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "monitoring" },
  { href: "/live-tables", label: "Live Floor", icon: "grid_view" },
  { href: "/billing", label: "Billing", icon: "receipt_long" },
  { href: "/settings", label: "Menu", icon: "restaurant" }
] as const;

const theNineStoreNavItems = [
  { href: "/live-tables", label: "Live Floor", icon: "grid_view" },
  { href: "/billing", label: "Billing", icon: "receipt_long" }
] as const;

type ShellAccount = {
  name: string;
  email?: string;
  accountType: AccountType;
  permissions: string[];
};

const fallbackBranding: TenantBranding = {
  appName: "The Nine Snooker & Cafe",
  logoInitials: "TN",
  businessName: "The Nine Snooker & Cafe",
  brandColor: "#12613d",
  accentColor: "#b98922"
};

const fallbackAccount: ShellAccount = {
  name: "The Nine Admin",
  email: "manager@example.com",
  accountType: "STORE_OWNER",
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
  const pathname = usePathname();
  const visibleNavItems = getVisibleNavItems(account);

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
              className={`flex h-11 items-center gap-3 rounded-material px-3 text-sm font-bold transition ${pathname === item.href ? "bg-lime-300/15 text-lime-100" : "text-slate-300 hover:bg-lime-300/10 hover:text-lime-100"}`}
            >
              <span className="material-symbols-outlined text-[20px] text-lime-300" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 space-y-2 border-t border-lime-300/15 p-3">
          {account.accountType !== "STORE_USER" ? <Link href="/change-password" className="flex h-10 items-center gap-3 rounded-material px-3 text-sm font-bold text-slate-300 hover:bg-amber-500/10 hover:text-amber-300"><span className="material-symbols-outlined text-amber-400">lock</span>Change Password</Link> : null}
          <SignOutButton />
        </div>
      </aside>
      <div className="lg:pl-64">
        {organization && organization.businesses.length > 0 && !["STORE_OWNER", "STORE_USER"].includes(account.accountType) ? (
          <div className="hidden justify-end px-6 pt-3 lg:flex"><StoreSwitcher currentBusinessId={businessId} organizationName={organization.name} organizationType={organization.type} stores={organization.businesses} /></div>
        ) : null}
        <main className="px-4 py-5 pb-24 lg:px-6 lg:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-lime-300/20 bg-slate-950/95 px-1 py-2 backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${visibleNavItems.length + 1}, minmax(0, 1fr))` }} aria-label="Store navigation">
        {visibleNavItems.map((item) => (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-bold ${pathname === item.href ? "text-lime-200" : "text-slate-400"}`}>
            <span className="material-symbols-outlined text-xl" aria-hidden="true">{item.icon}</span>{item.label}
          </Link>
        ))}
        <button type="button" onClick={signOut} className="flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-bold text-slate-400"><span className="material-symbols-outlined text-xl">logout</span>Logout</button>
      </nav>
    </div>
  );
}

function SignOutButton() {
  return <button type="button" onClick={signOut} className="flex h-10 w-full items-center gap-3 rounded-material px-3 text-sm font-bold text-slate-300 hover:bg-rose-500/10 hover:text-rose-300"><span className="material-symbols-outlined">logout</span>Logout</button>;
}

async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

function getVisibleNavItems(account: ShellAccount) {
  if (account.accountType === "STORE_OWNER") {
    return theNineAdminNavItems;
  }
  if (account.accountType === "STORE_USER") {
    return theNineStoreNavItems;
  }
  return legacyNavItems.filter((item) => account.permissions.includes(item.permission));
}

function BrandMark({ branding }: { branding: TenantBranding }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/the-nine/the-nine-logo-white.png"
        alt="The Nine logo"
        className="h-11 w-11 rounded-xl bg-white p-1 object-contain shadow-[0_0_22px_rgba(212,145,64,0.14)]"
      />
      <div>
        <p className="text-sm font-black text-white">{branding.appName}</p>
      </div>
    </div>
  );
}

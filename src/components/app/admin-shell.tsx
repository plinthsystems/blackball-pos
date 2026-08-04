import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "monitoring" },
  { href: "/live-tables", label: "Live Floor", icon: "grid_view" },
  { href: "/settings", label: "Food/Menu", icon: "restaurant" },
  { href: "/rates", label: "Rates", icon: "currency_rupee" }
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-neutral-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-outline bg-surface lg:block">
        <div className="border-b border-outline px-5 py-4">
          <p className="text-sm font-semibold">Pool & Snooker Cafe</p>
          <p className="text-xs text-neutral-500">Operations</p>
        </div>
        <nav className="p-3" aria-label="Admin navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-3 rounded-material px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-outline bg-surface px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Pool & Snooker Cafe</p>
              <p className="text-xs text-neutral-500">Dashboard, live floor, rates, and Food/Menu</p>
            </div>
            <div className="text-sm text-neutral-600">Manager</div>
          </div>
        </header>
        <main className="px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

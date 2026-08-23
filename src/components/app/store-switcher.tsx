"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

type StoreItem = {
  id: string;
  name: string;
  slug: string;
};

type StoreSwitcherProps = {
  currentBusinessId: string;
  organizationName?: string;
  organizationType?: "INDEPENDENT_SAAS" | "FRANCHISE";
  stores: StoreItem[];
};

export function StoreSwitcher({
  currentBusinessId,
  organizationName,
  organizationType,
  stores
}: StoreSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isHqPage = pathname?.startsWith("/hq");
  const currentStore = stores.find((s) => s.id === currentBusinessId) ?? stores[0];

  const handleSelectStore = (store: StoreItem) => {
    setIsOpen(false);
    document.cookie = `demo_store_slug=${store.slug}; path=/; max-age=31536000`;

    // Navigate to the same pathname with ?store= query param, or /live-tables for HQ pages
    if (isHqPage) {
      window.location.href = `/live-tables?store=${store.slug}`;
    } else {
      const search = pathname ? `${pathname}?store=${store.slug}` : `/live-tables?store=${store.slug}`;
      window.location.href = search;
    }
  };

  const handleSelectAllOutletsHq = () => {
    setIsOpen(false);
    window.location.href = "/hq/dashboard";
  };

  if (!stores || stores.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
        <span className="material-symbols-outlined text-[16px] text-lime-400">store</span>
        <span className="font-semibold text-white">{currentStore?.name ?? "Store"}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-lime-300/30 bg-slate-900/90 px-3.5 py-1.5 text-xs font-bold text-lime-100 transition hover:bg-slate-800 shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px] text-lime-400">
          {isHqPage ? "corporate_fare" : "storefront"}
        </span>
        <span>{isHqPage ? "All Outlets (HQ View)" : (currentStore?.name ?? "Select Store")}</span>
        {organizationType === "FRANCHISE" && (
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase font-bold text-amber-300 border border-amber-500/30">
            Franchise
          </span>
        )}
        <span className="material-symbols-outlined text-[14px] text-slate-400">unfold_more</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-lime-300/20 bg-slate-950 p-2.5 shadow-2xl z-50">
          <div className="border-b border-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{organizationName ?? "Outlets"}</span>
            <span className="text-[10px] text-lime-400 font-normal">Switch Context</span>
          </div>

          <div className="mt-2 space-y-1">
            {/* Franchise HQ Master View Option */}
            {organizationType === "FRANCHISE" && (
              <button
                onClick={handleSelectAllOutletsHq}
                className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bold transition border ${
                  isHqPage
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "border-slate-800 text-slate-200 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-amber-400">corporate_fare</span>
                  <span>All Outlets (HQ Master)</span>
                </div>
                {isHqPage && (
                  <span className="material-symbols-outlined text-[14px] text-amber-400">check</span>
                )}
              </button>
            )}

            {/* Individual Store Options */}
            <div className="pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Individual Outlets
            </div>
            {stores.map((store) => {
              const isSelected = !isHqPage && store.id === currentBusinessId;
              return (
                <button
                  key={store.id}
                  onClick={() => handleSelectStore(store)}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                    isSelected
                      ? "bg-lime-500/20 text-lime-300 border border-lime-500/30 font-bold"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-lime-400">storefront</span>
                    <span>{store.name}</span>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[14px] text-lime-400">check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

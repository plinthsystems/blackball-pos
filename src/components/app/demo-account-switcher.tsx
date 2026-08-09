"use client";

import { useState } from "react";

type DemoAccountOption = {
  category: "FRANCHISE_HQ" | "FRANCHISE_OUTLET" | "INDEPENDENT_SAAS";
  roleLabel: string;
  name: string;
  email: string;
  organizationName: string;
  storeName?: string;
  storeSlug?: string;
};

const demoAccounts: DemoAccountOption[] = [
  {
    category: "FRANCHISE_HQ",
    roleLabel: "HQ Director",
    name: "Vikram Malhotra",
    email: "hq.blackball@example.com",
    organizationName: "BlackBall Franchise Group (3 Stores)"
  },
  {
    category: "FRANCHISE_HQ",
    roleLabel: "HQ Director",
    name: "Anish Roy",
    email: "hq.cuenation@example.com",
    organizationName: "CueNation Franchise Group (2 Stores)"
  },
  {
    category: "FRANCHISE_OUTLET",
    roleLabel: "Outlet Manager",
    name: "Rahul Sharma",
    email: "owner@cueclub.example",
    organizationName: "BlackBall Franchise",
    storeName: "BlackBall Koramangala",
    storeSlug: "seed-business"
  },
  {
    category: "FRANCHISE_OUTLET",
    roleLabel: "Outlet Manager",
    name: "Sanjay Patel",
    email: "manager.mgroad@blackball.example",
    organizationName: "BlackBall Franchise",
    storeName: "BlackBall MG Road",
    storeSlug: "outlet-mg-road"
  },
  {
    category: "FRANCHISE_OUTLET",
    roleLabel: "Outlet Manager",
    name: "Karthik Verma",
    email: "whitefield.manager@cuenation.example",
    organizationName: "CueNation Franchise",
    storeName: "CueNation Whitefield",
    storeSlug: "outlet-whitefield"
  },
  {
    category: "INDEPENDENT_SAAS",
    roleLabel: "SaaS Store Owner",
    name: "Arjun Reddy",
    email: "owner@royalsnooker.example",
    organizationName: "Royal Snooker Club (Independent)",
    storeName: "Royal Snooker Club (JP Nagar)",
    storeSlug: "saas-royal-snooker"
  },
  {
    category: "INDEPENDENT_SAAS",
    roleLabel: "SaaS Store Owner",
    name: "Varun Mehta",
    email: "owner@breakandrun.example",
    organizationName: "Break & Run Lounge (Independent)",
    storeName: "Break & Run Lounge (BTM)",
    storeSlug: "saas-break-and-run"
  },
  {
    category: "INDEPENDENT_SAAS",
    roleLabel: "SaaS Store Owner",
    name: "Karan Singh",
    email: "owner@gamezone.example",
    organizationName: "GameZone Cafe (Independent)",
    storeName: "GameZone PS5 & Cue (Hebbal)",
    storeSlug: "saas-gamezone"
  }
];

export function DemoAccountSwitcher({ currentEmail }: { currentEmail?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const switchAccount = (account: DemoAccountOption) => {
    document.cookie = `demo_user_email=${account.email}; path=/; max-age=31536000`;
    if (account.storeSlug) {
      document.cookie = `demo_store_slug=${account.storeSlug}; path=/; max-age=31536000`;
    } else {
      document.cookie = `demo_store_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    setIsOpen(false);

    // Redirect to HQ dashboard if HQ account, or normal dashboard if store account
    if (account.category === "FRANCHISE_HQ") {
      window.location.href = "/hq/dashboard";
    } else {
      window.location.href = "/dashboard";
    }
  };

  const activeAccount = demoAccounts.find((a) => a.email === currentEmail) ?? demoAccounts[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-lime-400/40 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-lime-300 transition hover:bg-slate-800 shadow-md"
      >
        <span className="material-symbols-outlined text-[18px] text-lime-400">switch_account</span>
        <span>Persona: <span className="text-white font-extrabold">{activeAccount.name}</span></span>
        <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-lime-300/25 bg-slate-950 p-3 shadow-2xl z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 px-1 mb-2">
            <div>
              <p className="text-xs font-black text-white">Switch Demo Account / Role</p>
              <p className="text-[10px] text-slate-400">Instant login as HQ Director or Store Owner</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
            {/* Franchise HQ Section */}
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-1 mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">corporate_fare</span>
                Franchise HQ Directors
              </div>
              <div className="space-y-1">
                {demoAccounts
                  .filter((a) => a.category === "FRANCHISE_HQ")
                  .map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => switchAccount(acc)}
                      className={`w-full text-left p-2 rounded-lg border text-xs transition ${
                        acc.email === currentEmail
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-200 font-bold"
                          : "border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{acc.name}</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono uppercase">HQ</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{acc.organizationName}</p>
                    </button>
                  ))}
              </div>
            </div>

            {/* Franchise Outlets Section */}
            <div>
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-1 mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">storefront</span>
                Franchise Outlet Managers
              </div>
              <div className="space-y-1">
                {demoAccounts
                  .filter((a) => a.category === "FRANCHISE_OUTLET")
                  .map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => switchAccount(acc)}
                      className={`w-full text-left p-2 rounded-lg border text-xs transition ${
                        acc.email === currentEmail
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-bold"
                          : "border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{acc.name}</span>
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono uppercase">Outlet</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{acc.storeName}</p>
                    </button>
                  ))}
              </div>
            </div>

            {/* Independent SaaS Section */}
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-1 mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">store</span>
                Independent SaaS Club Owners
              </div>
              <div className="space-y-1">
                {demoAccounts
                  .filter((a) => a.category === "INDEPENDENT_SAAS")
                  .map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => switchAccount(acc)}
                      className={`w-full text-left p-2 rounded-lg border text-xs transition ${
                        acc.email === currentEmail
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold"
                          : "border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{acc.name}</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono uppercase">Standalone</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{acc.storeName}</p>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

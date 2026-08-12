"use client";

type DemoAccount = {
  id: string;
  category: "FRANCHISE_HQ" | "FRANCHISE_OUTLET" | "INDEPENDENT_SAAS";
  roleLabel: string;
  name: string;
  email: string;
  organizationName: string;
  storeName?: string;
  storeSlug?: string;
  description: string;
};

const demoAccounts: DemoAccount[] = [
  // 1. Franchise HQ Directors
  {
    id: "hq-blackball",
    category: "FRANCHISE_HQ",
    roleLabel: "Franchise HQ Director",
    name: "Vikram Malhotra",
    email: "hq.blackball@example.com",
    organizationName: "BlackBall Franchise Group",
    description: "Central Master View across 3 outlets (Koramangala, MG Road, Indiranagar)."
  },
  {
    id: "hq-cuenation",
    category: "FRANCHISE_HQ",
    roleLabel: "Franchise HQ Director",
    name: "Anish Roy",
    email: "hq.cuenation@example.com",
    organizationName: "CueNation Franchise Group",
    description: "Central Master View across 2 outlets (Whitefield, HSR Layout)."
  },

  // 2. Franchise Outlet Managers
  {
    id: "outlet-koramangala",
    category: "FRANCHISE_OUTLET",
    roleLabel: "Outlet Store Manager",
    name: "Rahul Sharma",
    email: "owner@cueclub.example",
    organizationName: "BlackBall Franchise",
    storeName: "BlackBall Koramangala",
    storeSlug: "seed-business",
    description: "Manages Koramangala outlet live tables, billing, rates, and F&B menu."
  },
  {
    id: "outlet-mgroad",
    category: "FRANCHISE_OUTLET",
    roleLabel: "Outlet Store Manager",
    name: "Sanjay Patel",
    email: "manager.mgroad@blackball.example",
    organizationName: "BlackBall Franchise",
    storeName: "BlackBall MG Road",
    storeSlug: "outlet-mg-road",
    description: "Manages MG Road outlet live floor and sales operations."
  },
  {
    id: "outlet-indiranagar",
    category: "FRANCHISE_OUTLET",
    roleLabel: "Outlet Store Manager",
    name: "Priya Nair",
    email: "manager.indiranagar@blackball.example",
    organizationName: "BlackBall Franchise",
    storeName: "BlackBall Indiranagar",
    storeSlug: "outlet-indiranagar",
    description: "Manages Indiranagar outlet live floor and sales operations."
  },
  {
    id: "outlet-whitefield",
    category: "FRANCHISE_OUTLET",
    roleLabel: "Outlet Store Manager",
    name: "Karthik Verma",
    email: "whitefield.manager@cuenation.example",
    organizationName: "CueNation Franchise",
    storeName: "CueNation Whitefield",
    storeSlug: "outlet-whitefield",
    description: "Manages Whitefield outlet operations."
  },
  {
    id: "outlet-hsr",
    category: "FRANCHISE_OUTLET",
    roleLabel: "Outlet Store Manager",
    name: "Deepak Rao",
    email: "hsr.manager@cuenation.example",
    organizationName: "CueNation Franchise",
    storeName: "CueNation HSR Layout",
    storeSlug: "outlet-hsr",
    description: "Manages HSR Layout outlet operations."
  },

  // 3. Independent B2B SaaS Store Owners
  {
    id: "saas-royal",
    category: "INDEPENDENT_SAAS",
    roleLabel: "Independent SaaS Owner",
    name: "Arjun Reddy",
    email: "owner@royalsnooker.example",
    organizationName: "Royal Snooker Club (Standalone)",
    storeName: "Royal Snooker Club - JP Nagar",
    storeSlug: "saas-royal-snooker",
    description: "Independent club owner managing 8 snooker tables & cafe sales."
  },
  {
    id: "saas-break",
    category: "INDEPENDENT_SAAS",
    roleLabel: "Independent SaaS Owner",
    name: "Varun Mehta",
    email: "owner@breakandrun.example",
    organizationName: "Break & Run Lounge (Standalone)",
    storeName: "Break & Run Lounge - BTM",
    storeSlug: "saas-break-and-run",
    description: "Independent pool lounge owner with custom F&B menu and rates."
  },
  {
    id: "saas-gamezone",
    category: "INDEPENDENT_SAAS",
    roleLabel: "Independent SaaS Owner",
    name: "Karan Singh",
    email: "owner@gamezone.example",
    organizationName: "GameZone Cafe (Standalone)",
    storeName: "GameZone PS5 & Cue - Hebbal",
    storeSlug: "saas-gamezone",
    description: "Independent PS5 console & pool cafe owner."
  }
];

export function DemoPersonaSelectorUI({ currentEmail }: { currentEmail: string }) {
  const switchAccount = (account: DemoAccount) => {
    document.cookie = `demo_user_email=${account.email}; path=/; max-age=31536000`;
    if (account.storeSlug) {
      document.cookie = `demo_store_slug=${account.storeSlug}; path=/; max-age=31536000`;
    } else {
      document.cookie = `demo_store_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    if (account.category === "FRANCHISE_HQ") {
      window.location.href = "/hq/dashboard";
    } else {
      window.location.href = "/dashboard";
    }
  };

  const hqAccounts = demoAccounts.filter((a) => a.category === "FRANCHISE_HQ");
  const outletAccounts = demoAccounts.filter((a) => a.category === "FRANCHISE_OUTLET");
  const saasAccounts = demoAccounts.filter((a) => a.category === "INDEPENDENT_SAAS");

  return (
    <div className="space-y-10">
      {/* 1. FRANCHISE HQ DIRECTORS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-amber-500/30 pb-2">
          <span className="material-symbols-outlined text-[24px] text-amber-400">corporate_fare</span>
          <h2 className="text-lg font-black text-amber-400 tracking-wide">1. FRANCHISE HQ DIRECTORS (MASTER VIEW)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {hqAccounts.map((acc) => {
            const isActive = acc.email === currentEmail;
            return (
              <div
                key={acc.id}
                className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                  isActive
                    ? "bg-slate-900 border-2 border-amber-400 shadow-xl shadow-amber-500/10"
                    : "bg-slate-900 border-slate-700 hover:border-amber-400/50 shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-amber-400 text-slate-950 px-3 py-0.5 text-[11px] font-black tracking-wider uppercase">
                      {acc.roleLabel}
                    </span>
                    {isActive && (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white mt-3">{acc.name}</h3>
                  <p className="text-xs font-semibold text-amber-300 mt-0.5">{acc.organizationName}</p>
                  <p className="text-xs font-mono text-slate-400 mt-1">{acc.email}</p>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">{acc.description}</p>
                </div>
                <button
                  onClick={() => switchAccount(acc)}
                  disabled={isActive}
                  className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    isActive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/50 cursor-default"
                      : "bg-slate-800 text-white border border-slate-600 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 shadow-lg cursor-pointer"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  {isActive ? "Currently Logged In" : "Log In & View HQ Dashboard"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. FRANCHISE OUTLET MANAGERS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-cyan-500/30 pb-2">
          <span className="material-symbols-outlined text-[24px] text-cyan-400">storefront</span>
          <h2 className="text-lg font-black text-cyan-400 tracking-wide">2. FRANCHISE OUTLET MANAGERS (SINGLE STORE VIEW)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {outletAccounts.map((acc) => {
            const isActive = acc.email === currentEmail;
            return (
              <div
                key={acc.id}
                className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                  isActive
                    ? "bg-slate-900 border-2 border-cyan-400 shadow-xl shadow-cyan-500/10"
                    : "bg-slate-900 border-slate-700 hover:border-cyan-400/50 shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-cyan-400 text-slate-950 px-3 py-0.5 text-[11px] font-black tracking-wider uppercase">
                      {acc.roleLabel}
                    </span>
                    {isActive && (
                      <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-white mt-3">{acc.name}</h3>
                  <p className="text-xs font-bold text-cyan-300 mt-0.5">{acc.storeName}</p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">{acc.email}</p>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">{acc.description}</p>
                </div>
                <button
                  onClick={() => switchAccount(acc)}
                  disabled={isActive}
                  className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 cursor-default"
                      : "bg-slate-800 text-white border border-slate-600 hover:bg-cyan-400 hover:text-slate-950 hover:border-cyan-400 shadow-lg cursor-pointer"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  {isActive ? "Currently Logged In" : `Switch to ${acc.storeName}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. INDEPENDENT B2B SAAS STORE OWNERS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-emerald-500/30 pb-2">
          <span className="material-symbols-outlined text-[24px] text-emerald-400">store</span>
          <h2 className="text-lg font-black text-emerald-400 tracking-wide">3. INDEPENDENT B2B SAAS OWNERS (STANDALONE ACCOUNTS)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {saasAccounts.map((acc) => {
            const isActive = acc.email === currentEmail;
            return (
              <div
                key={acc.id}
                className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                  isActive
                    ? "bg-slate-900 border-2 border-emerald-400 shadow-xl shadow-emerald-500/10"
                    : "bg-slate-900 border-slate-700 hover:border-emerald-400/50 shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-400 text-slate-950 px-3 py-0.5 text-[11px] font-black tracking-wider uppercase">
                      {acc.roleLabel}
                    </span>
                    {isActive && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-white mt-3">{acc.name}</h3>
                  <p className="text-xs font-bold text-emerald-300 mt-0.5">{acc.storeName}</p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">{acc.email}</p>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">{acc.description}</p>
                </div>
                <button
                  onClick={() => switchAccount(acc)}
                  disabled={isActive}
                  className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 cursor-default"
                      : "bg-slate-800 text-white border border-slate-600 hover:bg-emerald-400 hover:text-slate-950 hover:border-emerald-400 shadow-lg cursor-pointer"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  {isActive ? "Currently Logged In" : `Log In as ${acc.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

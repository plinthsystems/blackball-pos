"use client";

import { useState } from "react";

type PersonaCard = {
  id: string;
  category: "PLATFORM_ADMIN" | "FRANCHISE_HQ" | "FRANCHISE_OUTLET" | "INDEPENDENT_SAAS";
  roleLabel: string;
  name: string;
  email: string;
  organizationName: string;
  storeName?: string;
  storeSlug?: string;
  targetDashboard: string;
  description: string;
};

const personaAccounts: PersonaCard[] = [
  {
    id: "platform-admin",
    category: "PLATFORM_ADMIN",
    roleLabel: "Platform Admin",
    name: "Ajinkya Platform Admin",
    email: "platform@blackball.example",
    organizationName: "Black Ball SaaS Platform",
    targetDashboard: "/platform/setup",
    description: "Creates SaaS clubs, your own outlets, franchise brands, franchisees, subscriptions, and royalty setup."
  },

  // 1. Franchise HQ Directors
  {
    id: "hq-blackball",
    category: "FRANCHISE_HQ",
    roleLabel: "Franchise HQ Director",
    name: "Vikram Malhotra",
    email: "hq.blackball@example.com",
    organizationName: "BlackBall Franchise Group",
    storeSlug: "seed-business",
    targetDashboard: "/hq/dashboard",
    description: "Central Master HQ View across 3 outlets (Koramangala, MG Road, Indiranagar)."
  },
  {
    id: "hq-cuenation",
    category: "FRANCHISE_HQ",
    roleLabel: "Franchise HQ Director",
    name: "Anish Roy",
    email: "hq.cuenation@example.com",
    organizationName: "CueNation Franchise Group",
    storeSlug: "outlet-whitefield",
    targetDashboard: "/hq/dashboard",
    description: "Central Master HQ View across 2 outlets (Whitefield, HSR Layout)."
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
    targetDashboard: "/live-tables",
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
    targetDashboard: "/live-tables",
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
    targetDashboard: "/live-tables",
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
    targetDashboard: "/live-tables",
    description: "Manages Whitefield outlet live floor operations."
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
    targetDashboard: "/live-tables",
    description: "Manages HSR Layout outlet live floor operations."
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
    targetDashboard: "/dashboard",
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
    targetDashboard: "/dashboard",
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
    targetDashboard: "/dashboard",
    description: "Independent PS5 console & pool cafe owner."
  }
];

export function MagicLoginBuilderUI({ error = null }: { error?: string | null }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState("");

  const getMagicUrl = (acc: PersonaCard) => {
    return `/api/auth/magic-login?email=${encodeURIComponent(acc.email)}${acc.storeSlug ? `&store=${encodeURIComponent(acc.storeSlug)}` : ""}&key=${encodeURIComponent(accessKey)}`;
  };

  const handleCopy = (acc: PersonaCard) => {
    const fullUrl = `${window.location.origin}${getMagicUrl(acc)}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerLogin = (acc: PersonaCard) => {
    window.location.href = getMagicUrl(acc);
  };

  const platformAccounts = personaAccounts.filter((a) => a.category === "PLATFORM_ADMIN");
  const hqAccounts = personaAccounts.filter((a) => a.category === "FRANCHISE_HQ");
  const outletAccounts = personaAccounts.filter((a) => a.category === "FRANCHISE_OUTLET");
  const saasAccounts = personaAccounts.filter((a) => a.category === "INDEPENDENT_SAAS");

  return (
    <div className="space-y-12">
      <div className="rounded-2xl border border-amber-400/40 bg-slate-900 p-5 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[24px] text-amber-300">key</span>
          <h2 className="text-base font-black text-amber-300 tracking-wider uppercase">
            Secured Access Key (mandatory)
          </h2>
        </div>
        <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
          One-click login ab email-only nahi hai — har magic-login request ko access key chahiye.
          Dev default: <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-amber-200">local-dev-key</code>.
          Production environment me kabhi default nahi hota — <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-amber-200">DEV_ACCESS_KEY</code> env variable se set hota hai
          (agar <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-amber-200">MAGIC_LOGIN_ENABLED=true</code> karo).
        </p>
        <input
          type="password"
          value={accessKey}
          onChange={(event) => setAccessKey(event.target.value)}
          placeholder="Agar blank hai to 'local-dev-key' input karo (local)"
          className="mt-3 w-full rounded-xl border border-amber-400/40 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        />
        {error && (
          <p className="mt-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">
            ⚠️ {error}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-lime-500/40 pb-2.5">
          <span className="material-symbols-outlined text-[24px] text-lime-300">admin_panel_settings</span>
          <h2 className="text-base font-black text-lime-300 tracking-wider uppercase">
            0. PLATFORM ADMIN (SAAS AND FRANCHISE SETUP)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {platformAccounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-2xl p-5 border border-lime-400/40 bg-slate-900 shadow-xl flex flex-col justify-between hover:border-lime-300 transition duration-200"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-black tracking-wider uppercase shadow-md"
                    style={{ backgroundColor: "#bef264", color: "#090d16" }}
                  >
                    {acc.roleLabel}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border"
                    style={{ backgroundColor: "rgba(190, 242, 100, 0.15)", color: "#d9f99d", borderColor: "rgba(190, 242, 100, 0.4)" }}
                  >
                    Target: {acc.targetDashboard}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-3.5 tracking-tight">{acc.name}</h3>
                <p className="text-xs font-bold text-lime-200 mt-0.5">{acc.organizationName}</p>
                <p className="text-xs font-mono text-lime-100 mt-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 inline-block break-all">
                  {acc.email}
                </p>
                <p className="text-xs text-slate-200 mt-3 leading-relaxed font-medium">{acc.description}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTriggerLogin(acc)}
                  className="py-2.5 px-3 rounded-xl font-black text-xs transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  style={{ backgroundColor: "#bef264", color: "#090d16" }}
                >
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  Instant Magic Login
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(acc)}
                  className="py-2.5 px-3 rounded-xl border border-slate-600 bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">{copiedId === acc.id ? "done" : "content_copy"}</span>
                  {copiedId === acc.id ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 1. FRANCHISE HQ DIRECTORS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-amber-500/40 pb-2.5">
          <span className="material-symbols-outlined text-[24px] text-amber-400">corporate_fare</span>
          <h2 className="text-base font-black text-amber-400 tracking-wider uppercase">
            1. FRANCHISE HQ DIRECTORS (MASTER MULTI-OUTLET VIEW)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {hqAccounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-2xl p-5 border border-slate-700 bg-slate-900 shadow-xl flex flex-col justify-between hover:border-amber-400 transition duration-200"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-black tracking-wider uppercase shadow-md"
                    style={{ backgroundColor: "#fbbf24", color: "#090d16" }}
                  >
                    {acc.roleLabel}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border"
                    style={{ backgroundColor: "rgba(251, 191, 36, 0.15)", color: "#fef08a", borderColor: "rgba(251, 191, 36, 0.4)" }}
                  >
                    Target: {acc.targetDashboard}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-3.5 tracking-tight">{acc.name}</h3>
                <p className="text-xs font-bold text-amber-300 mt-0.5">{acc.organizationName}</p>
                <p className="text-xs font-mono text-amber-100 mt-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 inline-block">
                  {acc.email}
                </p>
                <p className="text-xs text-slate-200 mt-3 leading-relaxed font-medium">{acc.description}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTriggerLogin(acc)}
                  className="py-2.5 px-3 rounded-xl font-black text-xs transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  style={{ backgroundColor: "#fbbf24", color: "#090d16" }}
                >
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  Instant Magic Login
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(acc)}
                  className="py-2.5 px-3 rounded-xl border border-slate-600 bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">{copiedId === acc.id ? "done" : "content_copy"}</span>
                  {copiedId === acc.id ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. FRANCHISE OUTLET MANAGERS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-sky-500/40 pb-2.5">
          <span className="material-symbols-outlined text-[24px]" style={{ color: "#38bdf8" }}>storefront</span>
          <h2 className="text-base font-black tracking-wider uppercase" style={{ color: "#38bdf8" }}>
            2. FRANCHISE OUTLET MANAGERS (SINGLE STORE VIEW)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {outletAccounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-2xl p-5 border border-slate-700 bg-slate-900 shadow-xl flex flex-col justify-between hover:border-sky-400 transition duration-200"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-black tracking-wider uppercase shadow-md"
                    style={{ backgroundColor: "#38bdf8", color: "#090d16" }}
                  >
                    {acc.roleLabel}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border"
                    style={{ backgroundColor: "rgba(56, 189, 248, 0.15)", color: "#bae6fd", borderColor: "rgba(56, 189, 248, 0.4)" }}
                  >
                    Target: {acc.targetDashboard}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-3.5 tracking-tight">{acc.name}</h3>
                <p className="text-xs font-bold mt-0.5" style={{ color: "#38bdf8" }}>{acc.storeName}</p>
                <p className="text-xs font-mono text-sky-100 mt-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 inline-block break-all">
                  {acc.email}
                </p>
                <p className="text-xs text-slate-200 mt-3 leading-relaxed font-medium">{acc.description}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTriggerLogin(acc)}
                  className="py-2.5 px-3 rounded-xl font-black text-xs transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  style={{ backgroundColor: "#38bdf8", color: "#090d16" }}
                >
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  Instant Magic Login
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(acc)}
                  className="py-2.5 px-3 rounded-xl border border-slate-600 bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">{copiedId === acc.id ? "done" : "content_copy"}</span>
                  {copiedId === acc.id ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. INDEPENDENT B2B SAAS STORE OWNERS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-emerald-500/40 pb-2.5">
          <span className="material-symbols-outlined text-[24px] text-emerald-400">store</span>
          <h2 className="text-base font-black text-emerald-400 tracking-wider uppercase">
            3. INDEPENDENT B2B SAAS OWNERS (STANDALONE ACCOUNTS)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {saasAccounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-2xl p-5 border border-slate-700 bg-slate-900 shadow-xl flex flex-col justify-between hover:border-emerald-400 transition duration-200"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-black tracking-wider uppercase shadow-md"
                    style={{ backgroundColor: "#34d399", color: "#090d16" }}
                  >
                    {acc.roleLabel}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border"
                    style={{ backgroundColor: "rgba(52, 211, 153, 0.15)", color: "#a7f3d0", borderColor: "rgba(52, 211, 153, 0.4)" }}
                  >
                    Target: {acc.targetDashboard}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-3.5 tracking-tight">{acc.name}</h3>
                <p className="text-xs font-bold text-emerald-300 mt-0.5">{acc.storeName}</p>
                <p className="text-xs font-mono text-emerald-100 mt-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 inline-block break-all">
                  {acc.email}
                </p>
                <p className="text-xs text-slate-200 mt-3 leading-relaxed font-medium">{acc.description}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTriggerLogin(acc)}
                  className="py-2.5 px-3 rounded-xl font-black text-xs transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  style={{ backgroundColor: "#34d399", color: "#090d16" }}
                >
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  Instant Magic Login
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(acc)}
                  className="py-2.5 px-3 rounded-xl border border-slate-600 bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">{copiedId === acc.id ? "done" : "content_copy"}</span>
                  {copiedId === acc.id ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

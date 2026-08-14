"use client";

import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-lime-500 selection:text-slate-950 font-sans antialiased overflow-x-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-lime-500/15 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 font-black text-xl shadow-[0_0_20px_rgba(132,204,22,0.2)]">
              BB
            </div>
            <div>
              <span className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                BlackBall <span className="text-lime-400 text-xs px-2 py-0.5 rounded-full bg-lime-500/10 border border-lime-500/30">POS & SaaS</span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Cue Sports & Multi-Outlet Enterprise Platform</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-lime-400 transition">Features</a>
            <a href="#solutions" className="hover:text-lime-400 transition">Franchise & SaaS</a>
            <a href="#pricing" className="hover:text-lime-400 transition">Pricing</a>
            <a href="#testimonials" className="hover:text-lime-400 transition">Testimonials</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/magic-login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white transition"
            >
              <span className="material-symbols-outlined text-[16px] text-lime-400">bolt</span>
              Demo Playground
            </Link>

            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl bg-lime-500 text-slate-950 font-black text-xs hover:bg-lime-400 transition shadow-[0_0_20px_rgba(132,204,22,0.3)] flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-lime-500/30 bg-lime-500/10 text-lime-400 text-xs font-bold">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            #1 Operating System for Pool, Snooker & PS5 Gaming Lounges
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none sm:leading-[1.1]">
            Automate Table Timers. <br />
            <span className="bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Scale Multi-Outlet Revenue.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The all-in-one POS & Enterprise SaaS designed for pool clubs, snooker lounges, and gaming cafes. 
            Track live table play times, manage F&B billing, enforce rate tariffs, and monitor franchise outlets in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-lime-500 text-slate-950 font-black text-sm hover:bg-lime-400 transition shadow-[0_0_30px_rgba(132,204,22,0.4)] flex items-center justify-center gap-2 group"
            >
              Start Free 14-Day Trial
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition">arrow_forward</span>
            </Link>

            <Link
              href="/magic-login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-slate-700 bg-slate-900/90 text-white font-bold text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-lime-400">bolt</span>
              Explore Interactive Demo
            </Link>
          </div>

          {/* Quick Trust Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-lime-400">check_circle</span> Instant Setup</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-lime-400">check_circle</span> Multi-Outlet HQ Access</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-lime-400">check_circle</span> Hardware Thermal Printing</span>
          </div>
        </div>

        {/* Hero Interactive App Mockup Preview */}
        <div className="mt-16 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-6">
            {/* Mock Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-lime-500/20 border border-lime-500/40 text-lime-400 flex items-center justify-center font-bold">
                  RSC
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Royal Snooker Club — JP Nagar</h3>
                  <p className="text-[11px] text-slate-400">Live Table Floor Overview • 8 Active Tables</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
              </div>
            </div>

            {/* Mock Table Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-emerald-500/40 bg-slate-900 p-4 space-y-3 shadow-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white">Table 01 (English Snooker)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-black text-[10px]">OCCUPIED</span>
                </div>
                <div className="text-2xl font-mono font-black text-emerald-400">01:45:22</div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Current Bill:</span>
                  <span className="font-bold text-white">₹680.00</span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/40 bg-slate-900 p-4 space-y-3 shadow-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white">Table 02 (French Pool)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-black text-[10px]">OCCUPIED</span>
                </div>
                <div className="text-2xl font-mono font-black text-emerald-400">00:32:10</div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Current Bill:</span>
                  <span className="font-bold text-white">₹240.00</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white">Table 03 (Mini Snooker)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold text-[10px]">VACANT</span>
                </div>
                <div className="text-2xl font-mono font-black text-slate-500">00:00:00</div>
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>Standard Rate:</span>
                  <span className="font-bold text-slate-400">₹200/hr</span>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-500/40 bg-slate-900 p-4 space-y-3 shadow-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white">Station 01 (PS5 Console)</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-black text-[10px]">GAMING</span>
                </div>
                <div className="text-2xl font-mono font-black text-cyan-400">02:10:05</div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Current Bill:</span>
                  <span className="font-bold text-white">₹520.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs font-black uppercase text-lime-400 tracking-wider">Engineered for Cue Sports & Gaming Venues</h2>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">Everything You Need to Run & Grow Your Club</p>
            <p className="text-sm text-slate-400">Purpose-built tools designed to eliminate billing leakages, track play time down to the second, and increase cafe sales.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl hover:border-lime-500/40 transition">
              <div className="h-12 w-12 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 font-bold">
                <span className="material-symbols-outlined text-[24px]">timer</span>
              </div>
              <h3 className="text-lg font-black text-white">Automated Minute Timers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Precision play tracking with pause, resume, extend, and minimum billing rules. Prevent revenue leakage from unrecorded play time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl hover:border-cyan-500/40 transition">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                <span className="material-symbols-outlined text-[24px]">corporate_fare</span>
              </div>
              <h3 className="text-lg font-black text-white">Franchise Multi-Outlet HQ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Manage multiple outlets under one central HQ dashboard. Compare outlet sales, track franchise royalties, and push global rate updates.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl hover:border-emerald-500/40 transition">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
              </div>
              <h3 className="text-lg font-black text-white">Integrated F&B POS Billing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add beverages, snacks, and cigarettes directly to open table bills. Generate single combined receipts with thermal printer support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions / Business Models Section */}
      <section id="solutions" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-black uppercase text-cyan-400 tracking-wider">Tailored for Every Business Scale</h2>
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">Whether Single Store or Enterprise Franchise</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Independent SaaS */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <span className="rounded-full bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 text-xs font-black text-emerald-400 uppercase tracking-wider">
              Independent Clubs & Lounges
            </span>
            <h3 className="text-2xl font-black text-white">Single-Store B2B SaaS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Perfect for independent club owners running 2 to 20 tables or PS5 consoles. Get complete control over floor management, staff billing, and custom hourly tariffs.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Live Floor Grid & Table Timers</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Cafe POS & Inventory Tracking</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-emerald-400">check</span> Staff Role Permissions & Shift Reports</li>
            </ul>
          </div>

          {/* Card 2: Franchise Group */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <span className="rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-black text-amber-400 uppercase tracking-wider">
              Franchise Groups & Chains
            </span>
            <h3 className="text-2xl font-black text-white">Multi-Outlet Enterprise HQ</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed for franchisors managing multiple outlets across cities. Centralized oversight, automated store comparison analytics, and global tariff management.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-amber-400">check</span> Master HQ Dashboard (`/hq/dashboard`)</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-amber-400">check</span> Central Outlet Switcher & Comparison</li>
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-amber-400">check</span> Global Tariff & Surcharge Controls</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs font-black uppercase text-lime-400 tracking-wider">Simple, Transparent Pricing</h2>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">Flexible Plans for Clubs of All Sizes</p>
            
            {/* Monthly / Annual Toggle */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <span className={`text-xs font-bold ${!annualBilling ? "text-white" : "text-slate-400"}`}>Monthly Billing</span>
              <button
                type="button"
                onClick={() => setAnnualBilling(!annualBilling)}
                className="w-14 h-8 rounded-full bg-slate-800 border border-slate-700 p-1 flex items-center transition cursor-pointer"
              >
                <div className={`h-6 w-6 rounded-full bg-lime-400 transition-transform ${annualBilling ? "translate-x-6" : "translate-x-0"}`} />
              </button>
              <span className={`text-xs font-bold ${annualBilling ? "text-white" : "text-slate-400"} flex items-center gap-1.5`}>
                Annual Billing
                <span className="px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 font-black text-[10px] border border-lime-500/30">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 space-y-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white">Starter Club</h3>
                <p className="text-xs text-slate-400">For small independent pool halls & cafes.</p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-white">{annualBilling ? "₹1,599" : "₹1,999"}</span>
                  <span className="text-xs font-bold text-slate-400"> / store / month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Up to 8 Tables / Consoles</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Live Floor Timers & POS Billing</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Standard Daily Reports</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Email Support</li>
                </ul>
              </div>
              <Link
                href="/login"
                className="w-full py-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition text-center block mt-6"
              >
                Choose Starter
              </Link>
            </div>

            {/* Pro Plan - Featured */}
            <div className="rounded-3xl border-2 border-lime-400 bg-slate-900 p-8 space-y-6 flex flex-col justify-between shadow-2xl relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-lime-400 text-slate-950 px-4 py-1 text-[11px] font-black uppercase tracking-wider shadow-lg">
                Most Popular
              </span>
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white">Pro Enterprise</h3>
                <p className="text-xs text-slate-400">For busy clubs & growing franchise outlets.</p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-lime-400">{annualBilling ? "₹3,999" : "₹4,999"}</span>
                  <span className="text-xs font-bold text-slate-400"> / store / month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Unlimited Tables & PS5 Consoles</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Multi-Outlet HQ Access (`/hq/dashboard`)</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Integrated F&B POS & Thermal Printing</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Role-Based Security & Audit Logs</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> 24/7 Priority Support</li>
                </ul>
              </div>
              <Link
                href="/login"
                className="w-full py-3.5 rounded-xl bg-lime-500 text-slate-950 font-black text-xs hover:bg-lime-400 transition text-center shadow-lg block mt-6"
              >
                Start Pro 14-Day Free Trial
              </Link>
            </div>

            {/* Franchise Chain Plan */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 space-y-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white">Franchise Chain</h3>
                <p className="text-xs text-slate-400">Custom solutions for 5+ franchise outlets.</p>
                <div className="pt-2">
                  <span className="text-4xl font-black text-white">Custom</span>
                  <span className="text-xs font-bold text-slate-400"> / volume pricing</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Everything in Pro Enterprise</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Custom Franchise Royalty Tracking</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Custom API & Hardware Integrations</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-lime-400">check</span> Dedicated Account Manager</li>
                </ul>
              </div>
              <Link
                href="/login"
                className="w-full py-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition text-center block mt-6"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section id="testimonials" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-black uppercase text-cyan-400 tracking-wider">Trusted by Leading Club Owners</h2>
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">Hear From Venue Directors</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &quot;Managing 3 outlets used to be a nightmare with manual registers. BlackBall HQ dashboard lets me see live sales across Koramangala and MG Road in real time!&quot;
            </p>
            <div className="border-t border-slate-800 pt-3">
              <div className="text-xs font-bold text-white">Vikram Malhotra</div>
              <div className="text-[11px] text-slate-400">HQ Director, BlackBall Franchise Group</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &quot;The automated minute timer and integrated cafe billing stopped all play time leakages. Our revenue increased by 22% in the first month alone.&quot;
            </p>
            <div className="border-t border-slate-800 pt-3">
              <div className="text-xs font-bold text-white">Arjun Reddy</div>
              <div className="text-[11px] text-slate-400">Owner, Royal Snooker Club (JP Nagar)</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &quot;Staff role controls mean my cashiers can start tables and take cafe orders, but only store managers can apply discounts or edit rates.&quot;
            </p>
            <div className="border-t border-slate-800 pt-3">
              <div className="text-xs font-bold text-white">Anish Roy</div>
              <div className="text-[11px] text-slate-400">HQ Director, CueNation Franchise Group</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 font-black text-sm">
              BB
            </div>
            <span className="text-xs font-bold text-slate-400">
              © {new Date().getFullYear()} BlackBall POS & SaaS. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-slate-400">
            <Link href="/login" className="hover:text-lime-400 transition">Sign In</Link>
            <Link href="/magic-login" className="hover:text-lime-400 transition">Dev Magic Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

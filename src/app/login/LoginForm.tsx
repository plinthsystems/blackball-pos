"use client";

import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      window.location.href = data.redirectUrl || "/dashboard";
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090d0b] p-3 text-white sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[24px] border border-lime-300/15 bg-slate-950 shadow-[0_24px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative isolate flex min-h-[230px] items-end overflow-hidden sm:min-h-[300px] lg:min-h-[620px]">
          <img src="/the-nine/club-opening.webp" alt="The Nine club floor and snooker tables" className="absolute inset-0 z-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#07100c]/95 via-[#07100c]/30 to-[#07100c]/5" />
          <div className="relative z-20 p-5 sm:p-8 lg:p-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-100 backdrop-blur sm:mb-5 sm:text-[11px]">
              <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_14px_rgba(190,242,100,0.75)]" />
              The Nine · Cue Sports Club
            </div>
            <h2 className="max-w-lg text-2xl font-black leading-tight text-white sm:text-4xl">Run the floor. Know the numbers.</h2>
            <p className="mt-2 max-w-md text-xs leading-5 text-lime-50/80 sm:mt-3 sm:text-sm sm:leading-6">
              A focused workspace for live tables, billing, and the decisions that keep your club moving.
            </p>
          </div>
        </section>

        <section className="flex items-center p-5 sm:p-8 lg:p-12">
          <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
              <img src="/the-nine/the-nine-logo-white.png" alt="The Nine logo" className="h-16 w-16 rounded-xl bg-white p-1 object-contain shadow-[0_0_24px_rgba(212,145,64,0.12)]" />
              <div className="space-y-1">
                <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">The Nine Snooker & Cafe</h1>
                <p className="text-xs text-slate-400">Store operations</p>
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl sm:p-7">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">Sign in</h2>
                <p className="mt-0.5 text-xs text-slate-400">Use your Admin or Store login</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@thenine.local"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-lime-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-lime-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-lime-500 text-slate-950 font-black text-xs hover:bg-lime-400 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              {loading ? "Signing in..." : "Sign In"}
            </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}

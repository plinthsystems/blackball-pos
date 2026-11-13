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
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-lime-300/15 bg-slate-950 shadow-[0_24px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden lg:block">
          <img src="/the-nine/club-opening.webp" alt="The Nine club floor" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07100c] via-[#07100c]/35 to-[#07100c]/5" />
          <div className="absolute inset-x-0 bottom-0 p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-black/25 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-lime-100 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_14px_rgba(190,242,100,0.75)]" />
              The Nine · Cue Sports Club
            </div>
            <h2 className="max-w-lg text-4xl font-black leading-tight text-white">Run the floor. Know the numbers.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-lime-50/75">
              A focused workspace for live tables, billing, and the decisions that keep your club moving.
            </p>
          </div>
        </section>

        <section className="flex items-center p-5 sm:p-8 lg:p-12">
          <div className="w-full space-y-6">
            <div className="grid grid-cols-3 gap-2 lg:hidden">
              <img src="/the-nine/club-table-closeup.webp" alt="The Nine pool table" className="h-20 w-full rounded-xl object-cover" />
              <img src="/the-nine/club-lounge.webp" alt="The Nine reception" className="h-20 w-full rounded-xl object-cover" />
              <img src="/the-nine/club-table-front.webp" alt="The Nine snooker table" className="h-20 w-full rounded-xl object-cover" />
            </div>

            <div className="space-y-2 text-center lg:text-left">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-300/30 bg-lime-500/10 text-2xl font-black text-lime-300 shadow-[0_0_30px_rgba(132,204,22,0.2)]">
                TN
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">The Nine</h1>
              <p className="text-xs text-slate-400">Simple store POS</p>
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

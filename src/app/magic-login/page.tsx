export const dynamic = "force-dynamic";

import { MagicLoginBuilderUI } from "./magic-login-builder";

export default function MagicLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 font-black">
              <span className="material-symbols-outlined text-[28px]">bolt</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Dev Magic Login Link Generator</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate 1-click testing magic login links for any Franchise, Store, or User role without typing passwords.
              </p>
            </div>
          </div>
          <a
            href="/login"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Standard Login
          </a>
        </div>

        {/* Builder UI */}
        <MagicLoginBuilderUI />
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/features/auth/actions";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ tone: "err", text: "Naya password kam se kam 8 characters ka hona chahiye." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ tone: "err", text: "Naye aur confirm password match nahi kar rahe." });
      return;
    }
    startTransition(async () => {
      const result = await changePasswordAction({ currentPassword, newPassword });
      if (result.ok) {
        setMessage({ tone: "ok", text: result.message });
        setTimeout(() => router.push("/dashboard"), 800);
      } else {
        setMessage({ tone: "err", text: result.message });
      }
    });
  }

  return (
    <section className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Password Update Required</h1>
        <p className="mt-1 text-sm text-slate-400">
          Security policy: is account ka default password hai. Age badhane se pehle apna naya password set karein.
        </p>
      </div>

      <div className="rounded-material border border-amber-300/20 bg-slate-950 p-5 shadow-material">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-300">Current Password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-300">New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-300">Confirm New Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400/60"
            />
          </label>

          {message && (
            <p
              className={`rounded-lg border p-3 text-sm ${
                message.tone === "ok"
                  ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-400/30 bg-rose-500/10 text-rose-200"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="button"
            disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
            onClick={submit}
            className="h-12 w-full rounded-xl bg-amber-400 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Set New Password"}
          </button>
        </div>
      </div>
    </section>
  );
}

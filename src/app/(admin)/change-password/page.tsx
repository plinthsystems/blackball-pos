"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event?: FormEvent) {
    event?.preventDefault();
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
        <h1 className="text-2xl font-black uppercase tracking-normal text-white">Password Update Required</h1>
        <p className="mt-1 text-sm text-slate-400">
          Security policy: is account ka default password hai. Age badhane se pehle apna naya password set karein.
        </p>
      </div>

      <div className="rounded-material border border-amber-300/20 bg-slate-950 p-5 shadow-material">
        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-xs font-bold text-slate-300">Current Password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-300">New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="mt-1 h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-300">Confirm New Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 h-10 w-full rounded-material border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
            />
          </label>

          {message && (
            <p
              className={`rounded-material border p-3 text-sm ${
                message.tone === "ok"
                  ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-400/30 bg-rose-500/10 text-rose-200"
              }`}
            >
              {message.text}
            </p>
          )}

          <Button
            type="submit"
            className="h-12 w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
            disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
          >
            {isPending ? "Saving…" : "Set New Password"}
          </Button>
        </form>
      </div>
    </section>
  );
}

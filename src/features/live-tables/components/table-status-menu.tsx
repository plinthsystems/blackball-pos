"use client";

import { useEffect, useState } from "react";
import type { LiveTableCardData, LiveTableStatus } from "../types";
import { useRouter } from "next/navigation";
import { updateTableStatusAction } from "../actions";
import { Button } from "@/components/ui/button";

const MANUAL_TARGETS: Array<{ status: LiveTableStatus; label: string; icon: string }> = [
  { status: "AVAILABLE", label: "Available", icon: "toggle_on" },
  { status: "RESERVED", label: "Reserved", icon: "event_available" },
  { status: "CLEANING", label: "Cleaning", icon: "cleaning_services" },
  { status: "MAINTENANCE", label: "Maintenance", icon: "build" },
  { status: "BLOCKED", label: "Blocked", icon: "block" }
];

export function TableStatusMenu({ table, canUpdateStatus }: { table: LiveTableCardData; canUpdateStatus?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!canUpdateStatus) {
    return null;
  }

  const targets = MANUAL_TARGETS.filter((target) => target.status !== table.status);
  const clearingOccupied = table.status === "OCCUPIED";

  const apply = async (status: LiveTableStatus) => {
    setError(null);
    if (
      clearingOccupied &&
      !window.confirm(
        "Table shows OCCUPIED but has no active session in the system. Set its status manually? " +
          "(If a real session IS running, end it from the session panel instead.)"
      )
    ) {
      return;
    }
    setBusy(true);
    const result = await updateTableStatusAction({ tableId: table.id, status });
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        className="h-9 px-3"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
      >
        <span className="material-symbols-outlined text-[16px]">edit</span>
        <span>Status</span>
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
<div className="absolute right-0 z-30 mt-1 w-48 rounded-material border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
            <p className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Manual status override
            </p>
            {targets.map((target) => (
              <button
                key={target.status}
                type="button"
                disabled={busy}
                onClick={() => void apply(target.status)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-cyan-500/15 hover:text-cyan-200 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px] text-cyan-300">{target.icon}</span>
                {target.label}
              </button>
            ))}
            {error && <p className="mt-1 px-2.5 pb-1 text-[11px] font-bold text-rose-400">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}

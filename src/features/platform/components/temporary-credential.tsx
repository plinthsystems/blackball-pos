"use client";

import { useState } from "react";

export function TemporaryCredential({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
<div className="rounded-material border border-amber-400/30 bg-slate-950/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-black uppercase tracking-wide text-amber-200" title={label}>
          {label}
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}
          className="shrink-0 rounded-[6px] border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-200 transition hover:bg-amber-400/20"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="mt-1 break-words font-mono text-sm font-black tracking-wider text-white">{value}</p>
    </div>
  );
}

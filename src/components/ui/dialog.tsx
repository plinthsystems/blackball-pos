"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

export function Dialog({
  open,
  title,
  children,
  onOpenChange
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onMouseDown={() => onOpenChange(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-material border border-lime-300/20 bg-slate-950 p-5 text-slate-100 shadow-[0_0_46px_rgba(132,204,22,0.18)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <Button type="button" variant="ghost" className="h-8 px-2" aria-label="Close dialog" onClick={() => onOpenChange(false)}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </Button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

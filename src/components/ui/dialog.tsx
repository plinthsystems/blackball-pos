"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

export function Dialog({
  open,
  title,
  children,
  onOpenChange,
  size = "default"
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  size?: "default" | "wide";
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
        className={`flex max-h-[calc(100dvh-2rem)] w-full ${size === "wide" ? "max-w-2xl" : "max-w-md"} flex-col overflow-hidden rounded-material border border-lime-300/20 bg-slate-950 p-5 text-slate-100 shadow-[0_0_46px_rgba(132,204,22,0.18)]`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <Button type="button" variant="ghost" className="h-8 px-2" aria-label="Close dialog" onClick={() => onOpenChange(false)}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </Button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

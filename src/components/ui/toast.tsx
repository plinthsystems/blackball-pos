"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ToastTone = "neutral" | "success" | "danger";

export type ToastInput = {
  message: string;
  tone?: ToastTone;
  /** Override the auto-hide duration in ms. 0 or negative keeps the toast until dismissed. */
  durationMs?: number;
};

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  /** Amount of auto-hide time left, measured from `armedAtMs`. */
  remainingMs: number;
  /** Timestamp the current `remainingMs` countdown started (kept stable across re-arms). */
  armedAtMs: number;
  exiting: boolean;
};

type ToastContextValue = {
  show: (input: ToastInput) => void;
  dismiss: (id: number) => void;
};

const DEFAULT_DURATION_MS = 4000;
/** Matches the `.toast-exit` animation duration in globals.css. */
const REMOVE_AFTER_MS = 180;
const MAX_VISIBLE_TOASTS = 5;
/** setTimeout() clamps beyond this; toasts with this lifetime are sticky. */
const MAX_TIMEOUT_MS = 2_147_483_647;

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 1;

const noopToast: ToastContextValue = {
  show: () => {
    if (process.env.NODE_ENV === "development") {
      console.warn("[toast] useToast() used without <ToastProvider>; toast not shown.");
    }
  },
  dismiss: () => undefined
};

export function useToast(): ToastContextValue {
  // Falls back to a warn-only no-op when rendered without a provider (e.g. in
  // isolated component tests). The root layout always mounts <ToastProvider>.
  const context = useContext(ToastContext);
  return context ?? noopToast;
}

const toneBox: Record<ToastTone, string> = {
  neutral: "border-outline shadow-material",
  success: "border-lime-300/40 shadow-[0_0_0_1px_rgba(163,230,53,0.15),0_18px_44px_rgba(0,0,0,0.35)]",
  danger: "border-rose-400/40 shadow-[0_0_0_1px_rgba(244,63,94,0.2),0_18px_44px_rgba(0,0,0,0.35)]"
};

const toneIcon: Record<ToastTone, string> = {
  neutral: "info",
  success: "check_circle",
  danger: "error"
};

const toneIconClass: Record<ToastTone, string> = {
  neutral: "text-slate-300",
  success: "text-lime-300",
  danger: "text-rose-400"
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedAtRef = useRef<number | null>(null);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  const beginDismiss = useCallback((id: number) => {
    // The removal from state happens after the exit animation finishes.
    setToasts((current) =>
      current.some((toast) => toast.id === id && toast.exiting)
        ? current
        : current.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast))
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, REMOVE_AFTER_MS);
  }, []);

  const show = useCallback((input: ToastInput) => {
    const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;
    const item: ToastItem = {
      id: nextToastId++,
      message: input.message,
      tone: input.tone ?? "neutral",
      remainingMs: durationMs > 0 ? durationMs : MAX_TIMEOUT_MS,
      armedAtMs: Date.now(),
      exiting: false
    };
    setToasts((current) => {
      const visible = current.filter((toast) => !toast.exiting);
      if (visible.length < MAX_VISIBLE_TOASTS) {
        return [item, ...current];
      }
      // Too many toasts: drop the oldest visible one instantly.
      const oldestVisible = current.find((toast) => !toast.exiting);
      return [item, ...current.filter((toast) => toast !== oldestVisible)];
    });
  }, []);

  const pause = useCallback(() => {
    if (pausedAtRef.current !== null) {
      return;
    }
    pausedAtRef.current = Date.now();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (pausedAtRef.current === null) {
      return;
    }
    const elapsed = Date.now() - pausedAtRef.current;
    pausedAtRef.current = null;
    setPaused(false);
    // The countdown froze while hovered: keep `remainingMs` untouched and move
    // the countdown anchor past the paused period instead.
    setToasts((current) =>
      current.map((toast) => (toast.exiting || elapsed <= 0 ? toast : { ...toast, armedAtMs: toast.armedAtMs + elapsed }))
    );
  }, []);

  // Auto-hide: one timer per visible toast, paused while hovered.
  useEffect(() => {
    if (paused) {
      return;
    }
    const now = Date.now();
    const timers = toasts
      .filter((toast) => !toast.exiting && toast.remainingMs < MAX_TIMEOUT_MS)
      .map((toast) => {
        const remaining = toast.remainingMs - (now - toast.armedAtMs);
        if (remaining <= 0) {
          beginDismiss(toast.id);
          return null;
        }
        const timer = window.setTimeout(() => beginDismiss(toast.id), remaining);
        return { id: toast.id, timer };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    return () => {
      timers.forEach(({ timer }) => window.clearTimeout(timer));
    };
  }, [paused, toasts, beginDismiss]);

  // Don't leave hover-paused timers behind after the last toast disappears.
  useEffect(() => {
    if (paused && toasts.length === 0) {
      resume();
    }
  }, [paused, toasts.length, resume]);

  // Esc dismisses the topmost visible toast.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      const topmost = toastsRef.current.find((toast) => !toast.exiting);
      if (topmost) {
        beginDismiss(topmost.id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beginDismiss]);

  const value = useMemo(() => ({ show, dismiss: beginDismiss }), [show, beginDismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <div
          role="region"
          aria-label="Notifications"
          aria-live="polite"
          className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(100vw-2rem,22rem)] flex-col items-stretch gap-2"
        >
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={beginDismiss} onPause={pause} onResume={resume} />
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onPause,
  onResume
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
  onPause: () => void;
  onResume: () => void;
}) {
  return (
    <div
      role={toast.tone === "danger" ? "alert" : "status"}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-material border bg-surface px-3 py-3 text-sm",
        toneBox[toast.tone],
        toast.exiting ? "toast-exit" : "toast-enter"
      )}
    >
      <span className={cn("material-symbols-outlined mt-0.5 shrink-0 text-[20px]", toneIconClass[toast.tone])} aria-hidden="true">
        {toneIcon[toast.tone]}
      </span>
      <p className="flex-1 font-medium leading-5 text-slate-100">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-material text-slate-400 transition hover:bg-white/10 hover:text-white"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          close
        </span>
      </button>
    </div>
  );
}

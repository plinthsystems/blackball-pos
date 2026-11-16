"use client";

import { useState, useTransition } from "react";
import { endSessionAction } from "@/features/live-tables/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Snackbar } from "@/components/ui/snackbar";

export function EndSessionDialog({
  sessionId,
  tableNumber,
  open,
  onOpenChange
}: {
  sessionId: string;
  tableNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [applyFoodDiscount, setApplyFoodDiscount] = useState(false);
  const [isPending, startTransition] = useTransition();

  function endSession() {
    startTransition(async () => {
      const result = await endSessionAction({ sessionId, applyFoodDiscount });
      setMessage(result.message);
      if (result.ok) {
        setApplyFoodDiscount(false);
        onOpenChange(false);
      }
    });
  }

  return (
    <>
      <Dialog open={open} title={`Stop session for ${tableNumber}`} onOpenChange={onOpenChange}>
        <div className="space-y-4">
          <p className="text-sm text-slate-300">Stopping ends the session, closes the current bill, and charges actual play time plus items.</p>
          <label className="flex cursor-pointer items-start gap-3 rounded-material border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={applyFoodDiscount}
              onChange={(event) => setApplyFoodDiscount(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-lime-400"
            />
            <span><strong className="block">Apply 20% food menu discount</strong><span className="text-xs text-slate-400">Food and cafe items only. Drinks, cigarettes and table time are excluded.</span></span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" variant="primary" disabled={isPending} onClick={endSession}>{isPending ? "Stopping…" : "Stop & close bill"}</Button>
          </div>
        </div>
      </Dialog>
      <Snackbar message={message} tone={message?.startsWith("Session ended.") ? "success" : "danger"} />
    </>
  );
}

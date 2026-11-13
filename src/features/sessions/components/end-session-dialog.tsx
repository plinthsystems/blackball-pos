"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function endSession() {
    startTransition(async () => {
      const result = await endSessionAction({ sessionId });
      setMessage(result.message);
      if (result.ok) {
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Dialog open={open} title={`Stop session for ${tableNumber}`} onOpenChange={onOpenChange}>
        <div className="space-y-4">
          <p className="text-sm text-slate-300">Stopping ends the session, closes the current bill, and charges actual play time plus items.</p>
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

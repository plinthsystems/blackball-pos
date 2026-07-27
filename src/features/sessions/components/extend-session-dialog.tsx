"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extendSessionAction } from "@/features/live-tables/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Snackbar } from "@/components/ui/snackbar";

export function ExtendSessionDialog({
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

  function extend(addedMinutes: 30 | 60) {
    startTransition(async () => {
      const result = await extendSessionAction({ sessionId, addedMinutes });
      setMessage(result.message);
      if (result.ok) {
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Dialog open={open} title={`Extend table ${tableNumber}`} onOpenChange={onOpenChange}>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">The backend will check future bookings before changing the planned end time.</p>
          <div className="flex justify-end gap-2">
            <Button disabled={isPending} onClick={() => extend(30)}>Add 30 minutes</Button>
            <Button disabled={isPending} variant="primary" onClick={() => extend(60)}>Add 1 hour</Button>
          </div>
        </div>
      </Dialog>
      <Snackbar message={message} tone={message === "Session extended." ? "success" : "danger"} />
    </>
  );
}

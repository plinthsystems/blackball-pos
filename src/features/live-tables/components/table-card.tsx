"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatClockTime } from "@/lib/time";
import type { LiveTableCardData, LiveTableStatus } from "../types";
import { TableStatusMenu } from "./table-status-menu";
import { StartWalkInDialog } from "@/features/sessions/components/start-walk-in-dialog";
import { ExtendSessionDialog } from "@/features/sessions/components/extend-session-dialog";
import { EndSessionDialog } from "@/features/sessions/components/end-session-dialog";

const statusTone: Record<LiveTableStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  AVAILABLE: "success",
  RESERVED: "info",
  OCCUPIED: "warning",
  CLEANING: "neutral",
  MAINTENANCE: "danger",
  BLOCKED: "neutral"
};

const statusLabel: Record<LiveTableStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked"
};

export function TableCard({ table }: { table: LiveTableCardData }) {
  const [startOpen, setStartOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const session = table.status === "OCCUPIED" ? table.currentSession : null;

  return (
    <article className="rounded-material border border-outline bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{table.number}</h2>
          <p className="text-sm text-neutral-500">{table.gameType === "POOL" ? "Pool" : "Snooker"}</p>
        </div>
        <Badge tone={statusTone[table.status]}>Status: {statusLabel[table.status]}</Badge>
      </div>
      <div className="mt-4 min-h-24 text-sm text-neutral-700">
        {session ? (
          <div className="space-y-1">
            <p className="break-words font-medium">{session.customerName ?? "Walk-in customer"}</p>
            <p>Started {formatClockTime(new Date(session.startedAt))}</p>
            <p>Ends {formatClockTime(new Date(session.plannedEndAt))}</p>
            <p>Current bill {formatMoney(session.billEstimate)}</p>
            <p className="break-words">Staff {session.assignedStaffName ?? "Unassigned"}</p>
          </div>
        ) : (
          <p className="text-neutral-500">No active session</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {session ? (
          <>
            <Button variant="primary" className="h-9 px-3" aria-label={`End session for table ${table.number}`} onClick={() => setEndOpen(true)}>
              End
            </Button>
            <Button className="h-9 px-3" onClick={() => setExtendOpen(true)}>Extend</Button>
          </>
        ) : table.status === "AVAILABLE" ? (
          <Button variant="primary" className="h-9 px-3" aria-label={`Start session for table ${table.number}`} onClick={() => setStartOpen(true)}>
            Start
          </Button>
        ) : null}
        <TableStatusMenu table={table} />
      </div>
      <StartWalkInDialog tableId={table.id} tableNumber={table.number} open={startOpen} onOpenChange={setStartOpen} />
      {session ? (
        <>
          <ExtendSessionDialog sessionId={session.id} tableNumber={table.number} open={extendOpen} onOpenChange={setExtendOpen} />
          <EndSessionDialog sessionId={session.id} tableNumber={table.number} open={endOpen} onOpenChange={setEndOpen} />
        </>
      ) : null}
    </article>
  );
}

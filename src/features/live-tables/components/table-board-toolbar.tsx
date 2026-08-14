"use client";

import { useState } from "react";
import type { LiveTableCardData, LiveTableStatus } from "../types";
import { BookingQrDialog } from "./booking-qr-dialog";

const labels: Record<LiveTableStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked"
};

const visibleSummaryStatuses: LiveTableStatus[] = ["AVAILABLE", "RESERVED", "OCCUPIED"];

export function TableBoardToolbar({
  tables,
  bookingLink = null,
  bookingQrUrl = null,
  businessName = "Store"
}: {
  tables: LiveTableCardData[];
  bookingLink?: string | null;
  bookingQrUrl?: string | null;
  businessName?: string;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const counts = tables.reduce<Record<LiveTableStatus, number>>(
    (acc, table) => {
      acc[table.status] += 1;
      return acc;
    },
    { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, CLEANING: 0, MAINTENANCE: 0, BLOCKED: 0 }
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-normal text-white">Live Floor</h1>
        <p className="text-sm font-semibold text-lime-100/60">Real-time operational view for staff</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {bookingLink && (
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-200 hover:border-emerald-300/60 hover:bg-emerald-500/20"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
            Booking QR
          </button>
        )}
        <div className="flex flex-wrap gap-2" aria-label="Table status counts">
          {visibleSummaryStatuses.map((status) => (
            <span key={status} className="inline-flex gap-1 rounded-full border border-lime-300/20 bg-slate-950/80 px-3 py-1 text-xs font-bold text-slate-200">
              <span>{labels[status]}</span>
              <strong className="text-lime-300">{counts[status]}</strong>
            </span>
          ))}
        </div>
      </div>
      {qrOpen && bookingLink && bookingQrUrl && (
        <BookingQrDialog
          bookingLink={bookingLink}
          qrPngUrl={bookingQrUrl}
          businessName={businessName}
          onClose={() => setQrOpen(false)}
        />
      )}
    </div>
  );
}

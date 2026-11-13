"use client";

import { useState } from "react";
import { BookingQrDialog } from "./booking-qr-dialog";

export function TableBoardToolbar({
  bookingLink = null,
  bookingQrUrl = null,
  businessName = "Store"
}: {
  bookingLink?: string | null;
  bookingQrUrl?: string | null;
  businessName?: string;
}) {
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <div className="relative isolate flex min-h-28 w-full items-end justify-between overflow-hidden rounded-2xl border border-lime-300/20 bg-slate-950 p-5 shadow-[0_0_34px_rgba(132,204,22,0.12)]">
      <img
        src="/the-nine/club-table-front.webp"
        alt="The Nine snooker table"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-45"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/20" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-lime-200/80">The Nine Snooker & Cafe</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-normal text-white">Live Floor</h1>
        <p className="text-sm font-semibold text-lime-100/70">Run every table from one clear view.</p>
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

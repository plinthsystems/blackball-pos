"use client";

import { useState } from "react";

export function BookingQrDialog({
  bookingLink,
  qrPngUrl,
  businessName,
  onClose
}: {
  bookingLink: string;
  qrPngUrl: string;
  businessName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    void navigator.clipboard?.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function printQr() {
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) {
      return;
    }
    win.document.write(
      `<html><head><title>Booking QR - ${businessName}</title></head>` +
        `<body style="margin:0;padding:24px;text-align:center;font-family:system-ui">` +
        `<p style="font-size:20px;font-weight:700;margin:0 0 4px">${businessName}</p>` +
        `<p style="font-size:13px;color:#444;margin:0 0 16px">Scan to book a table online</p>` +
        `<img src="${qrPngUrl}" style="width:320px;max-width:90%" />` +
        `<p style="font-size:12px;color:#666;word-break:break-all;margin-top:12px">${bookingLink}</p>` +
        `</body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950 p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Booking QR Code</h2>
            <p className="mt-1 text-sm text-slate-400">
              Scan kisi se bhi — seedha is store ka booking page khulega.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-sm font-bold text-slate-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white p-4">
          <img src={qrPngUrl} alt={`Booking QR for ${businessName}`} className="mx-auto h-64 w-64" />
        </div>

        <p className="mt-3 break-all rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-[11px] text-cyan-200/90">
          {bookingLink}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              const anchor = document.createElement("a");
              anchor.href = qrPngUrl;
              anchor.download = `booking-qr-${businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
            }}
            className="rounded-lg bg-cyan-500 px-3 py-2.5 text-xs font-black text-slate-950 hover:bg-cyan-400"
          >
            ⬇ Download PNG
          </button>
          <button
            type="button"
            onClick={printQr}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2.5 text-xs font-black text-cyan-200 hover:bg-cyan-500/20"
          >
            🖨 Print
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-black text-slate-200 hover:border-emerald-400/50"
          >
            {copied ? "✓ Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}

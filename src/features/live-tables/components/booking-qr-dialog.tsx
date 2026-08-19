"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

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

  function downloadPng() {
    const anchor = document.createElement("a");
    anchor.href = qrPngUrl;
    anchor.download = `booking-qr-${businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <Dialog open title="Booking QR Code" onOpenChange={(next) => !next && onClose()}>
      <p className="text-sm text-slate-400">
        Scan kisi se bhi — seedha is store ka booking page khulega.
      </p>

      <div className="mt-4 rounded-material border border-white/10 bg-white p-4">
        <img src={qrPngUrl} alt={`Booking QR for ${businessName}`} className="mx-auto h-64 w-64" />
      </div>

      <p className="mt-3 break-all rounded-material border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-[11px] text-cyan-200/90">
        {bookingLink}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button
          type="button"
          className="border-cyan-400/50 bg-cyan-500 px-2 text-xs hover:bg-cyan-400"
          onClick={downloadPng}
          icon={<span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>}
        >
          <span className="whitespace-nowrap">Download</span>
        </Button>
        <Button
          type="button"
          className="border-cyan-400/40 bg-cyan-500/10 px-2 text-xs text-cyan-200 hover:bg-cyan-500/20"
          onClick={printQr}
          icon={<span className="material-symbols-outlined text-[16px]" aria-hidden="true">print</span>}
        >
          <span className="whitespace-nowrap">Print</span>
        </Button>
        <Button
          type="button"
          className="px-2 text-xs"
          onClick={copyLink}
          icon={
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {copied ? "check" : "content_copy"}
            </span>
          }
        >
          <span className="whitespace-nowrap">{copied ? "Copied" : "Copy link"}</span>
        </Button>
      </div>
    </Dialog>
  );
}

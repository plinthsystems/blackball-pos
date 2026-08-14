import QRCode from "qrcode";
import { getBookingPageUrl } from "./base-url";

export async function generateBookingQrPng(businessSlug: string): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(getBookingPageUrl(businessSlug), {
    errorCorrectionLevel: "M",
    width: 512,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" }
  });
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

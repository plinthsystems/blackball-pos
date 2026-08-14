export function getPublicBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) {
    return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  }
  return process.env.NODE_ENV === "production" ? "https://app.blackball.example" : "http://localhost:3000";
}

export function getBookingPageUrl(slug: string): string {
  return `${getPublicBaseUrl()}/book/${slug}`;
}

export function getBookingQrPngUrl(slug: string): string {
  return `${getPublicBaseUrl()}/qr/book/${slug}`;
}

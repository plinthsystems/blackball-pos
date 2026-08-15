export function getPublicBaseUrl(options?: { requestHost?: string; protocol?: string }): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) {
    return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  }

  if (options?.requestHost) {
    const protocol = options.protocol ?? (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${protocol}://${options.requestHost}`;
  }

  return process.env.NODE_ENV === "production" ? "https://app.blackball.example" : "http://localhost:3000";
}

export function getRequestBaseUrl(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? undefined;
  const protocol = headers.get("x-forwarded-proto") ?? undefined;
  return getPublicBaseUrl({ requestHost: host, protocol });
}

export function getBookingPageUrl(slug: string, baseUrl?: string): string {
  const base = baseUrl ?? getPublicBaseUrl();
  return `${base}/book/${slug}`;
}

export function getBookingQrPngUrl(slug: string, baseUrl?: string): string {
  const base = baseUrl ?? getPublicBaseUrl();
  return `${base}/qr/book/${slug}`;
}

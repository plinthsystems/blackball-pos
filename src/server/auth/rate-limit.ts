const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 5 * 60 * 1000;

/**
 * Minimal in-memory sliding-window rate limiter.
 * NOTE: expires with the process — use Redis/Upstash when scaling to multiple instances.
 */
export function checkRateLimit(key: string, limit = 20): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return false;
  }

  // prune map periodically
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  return true;
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

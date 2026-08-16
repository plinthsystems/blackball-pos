import { NextRequest } from "next/server";

/**
 * Shared request/response helpers for route + middleware tests.
 * (See docs/TEST_GAP_REPORT.md — Section 4 "Gaps in conventions".)
 */

export function makeRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, init);
}

/** Like makeRequest but for handlers typed with NextRequest (webhooks etc.). */
export function makeNextRequest(url: string, init: RequestInit = {}): NextRequest {
  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1]);
}

export function getSetCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

/** Returns the decoded value of a Set-Cookie header, or null when the cookie was not set. */
export function cookieValue(response: Response, name: string): string | null {
  for (const cookie of getSetCookies(response)) {
    const [pair] = cookie.split(";");
    const [key, ...rest] = pair.split("=");
    if (key.trim() === name) {
      // Cookie values are URI-encoded by the ResponseCookies serializer.
      const raw = rest.join("=");
      return raw ? decodeURIComponent(raw) : raw;
    }
  }
  return null;
}

/**
 * Applies a process.env patch (undefined => deletes the key) for the duration of
 * `fn`, restoring the previous values afterwards — also when `fn` throws.
 */
export async function withEnv<T>(
  patches: Record<string, string | undefined>,
  fn: () => T | Promise<T>
): Promise<T> {
  const saved = new Map<string, string | undefined>();
  for (const key of Object.keys(patches)) {
    saved.set(key, process.env[key]);
  }
  try {
    for (const [key, value] of Object.entries(patches)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    return await fn();
  } finally {
    for (const [key, previous] of saved) {
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  }
}

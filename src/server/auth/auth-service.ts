import crypto from "crypto";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DEV_FALLBACK_SECRET = "development-only-secret-do-not-use-in-production";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is required in production. Set a random 64-char secret (openssl rand -hex 32)."
    );
  }
  console.warn(
    "[auth] AUTH_SECRET is not set. Using development-only fallback secret. Set AUTH_SECRET before deploying."
  );
  return DEV_FALLBACK_SECRET;
}

let cachedSecretKey: string | null = null;

function secretKey(): string {
  if (cachedSecretKey === null) {
    cachedSecretKey = getAuthSecret();
  }
  return cachedSecretKey;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash || !hash.includes(":")) return false;
  const [salt, key] = hash.split(":");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derivedKey, "hex"));
}

export type AuthSessionPayload = {
  employeeId: string;
  email: string;
  accountType: string;
  businessId?: string;
  storeSlug?: string;
  mustChangePassword?: boolean;
  createdAt: number;
  exp: number;
};

export function createSessionToken(payload: Omit<AuthSessionPayload, "createdAt" | "exp">): string {
  const fullPayload: AuthSessionPayload = {
    ...payload,
    createdAt: Date.now(),
    exp: Date.now() + SESSION_TTL_MS
  };
  const jsonStr = JSON.stringify(fullPayload);
  const base64Payload = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto.createHmac("sha256", secretKey()).update(base64Payload).digest("base64url");
  return `${base64Payload}.${signature}`;
}

export function verifySessionToken(token: string): AuthSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [base64Payload, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", secretKey()).update(base64Payload).digest("base64url");

  if (signature !== expectedSignature) return null;

  try {
    const jsonStr = Buffer.from(base64Payload, "base64url").toString("utf8");
    const payload = JSON.parse(jsonStr) as AuthSessionPayload;
    if (typeof payload.exp === "number" && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Edge-compatible signed-token verification for Middleware (Web Crypto, no Node crypto).
 * IMPORTANT: this VERIFIES the HMAC signature — the naive base64 decode is no longer used.
 */
export async function verifySessionTokenEdge(token: string): Promise<AuthSessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [base64Payload, signature] = token.split(".");
  if (!base64Payload || !signature) return null;

  try {
    const secret = getAuthSecret();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(base64Payload));
    const expectedHex = bytesToBase64Url(new Uint8Array(expected));
    if (signature !== expectedHex) {
      return null;
    }

    const base64 = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("utf8");
    const payload = JSON.parse(jsonStr) as AuthSessionPayload;
    if (typeof payload.exp === "number" && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  if (typeof btoa === "function") {
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(binary, "binary").toString("base64url");
}

import crypto from "crypto";

const SECRET_KEY = process.env.AUTH_SECRET ?? "default-antigravity-dev-secret-key-32chars!";

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
  createdAt: number;
};

export function createSessionToken(payload: Omit<AuthSessionPayload, "createdAt">): string {
  const fullPayload: AuthSessionPayload = {
    ...payload,
    createdAt: Date.now()
  };
  const jsonStr = JSON.stringify(fullPayload);
  const base64Payload = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET_KEY).update(base64Payload).digest("base64url");
  return `${base64Payload}.${signature}`;
}

export function verifySessionToken(token: string): AuthSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [base64Payload, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", SECRET_KEY).update(base64Payload).digest("base64url");

  if (signature !== expectedSignature) return null;

  try {
    const jsonStr = Buffer.from(base64Payload, "base64url").toString("utf8");
    return JSON.parse(jsonStr) as AuthSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Edge-compatible token payload decoder (without Node 'crypto' module dependency)
 * Safe for use inside Next.js Middleware.
 */
export function decodeSessionTokenPayload(token: string): AuthSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [base64Payload] = token.split(".");
  try {
    // Edge-compatible base64url decode
    const base64 = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = typeof atob === "function" 
      ? atob(base64) 
      : Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonStr) as AuthSessionPayload;
  } catch {
    return null;
  }
}

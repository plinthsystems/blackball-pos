import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db/prisma";
import { createSessionToken } from "@/server/auth/auth-service";
import { checkRateLimit, clientIpFromRequest } from "@/server/auth/rate-limit";

function devAccessKey(): string | null {
  return process.env.DEV_ACCESS_KEY || null;
}

function isMagicLoginEnabled(): boolean {
  return process.env.MAGIC_LOGIN_ENABLED === "true";
}

function matchesAccessKey(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function getRequestUrl(request: Request): string {
  // When proxied or accessed via external IP, use forwarded headers to get the real host.
  // Otherwise fall back to the request URL.
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const storeSlug = searchParams.get("store");
  const providedKey = searchParams.get("key") ?? "";

  const expectedKey = devAccessKey();

  const base = getRequestUrl(request);

  // Production-mode magic login requires an explicit AUTH-LEVEL access key.
  if (!isMagicLoginEnabled() || expectedKey === null) {
    return NextResponse.redirect(`${base}/magic-login?error=disabled`);
  }

  if (!matchesAccessKey(providedKey, expectedKey)) {
    return NextResponse.redirect(`${base}/magic-login?error=invalid_key`);
  }

  if (!checkRateLimit(`magic:${clientIpFromRequest(request)}`, 30)) {
    return NextResponse.redirect(`${base}/magic-login?error=rate_limited`);
  }

  if (!email) {
    return NextResponse.redirect(`${base}/magic-login`);
  }

  const employee = await prisma.employee.findFirst({
    where: { email: email.trim().toLowerCase(), active: true },
    include: { business: true }
  });

  if (!employee) {
    return NextResponse.redirect(`${base}/magic-login?error=user_not_found`);
  }

  const activeStoreSlug = storeSlug ?? employee.business?.slug ?? undefined;

  const token = createSessionToken({
    employeeId: employee.id,
    email: employee.email,
    accountType: employee.accountType,
    businessId: employee.businessId ?? undefined,
    storeSlug: activeStoreSlug,
    mustChangePassword: employee.mustChangePassword
  });

  const targetUrl =
    employee.accountType === "PLATFORM_ADMIN"
      ? "/platform/setup"
      : employee.accountType === "HQ_ADMIN"
        ? "/hq/dashboard"
        : "/dashboard";
  const response = NextResponse.redirect(`${base}${targetUrl}`);

  response.cookies.set("auth_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  if (process.env.NODE_ENV !== "production") {
    response.cookies.set("demo_user_email", employee.email, { path: "/", maxAge: 60 * 60 * 24 * 7 });
    if (activeStoreSlug) {
      response.cookies.set("demo_store_slug", activeStoreSlug, { path: "/", maxAge: 60 * 60 * 24 * 7 });
    }
  }

  return response;
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db/prisma";
import { createSessionToken } from "@/server/auth/auth-service";
import { checkRateLimit, clientIpFromRequest } from "@/server/auth/rate-limit";

function devAccessKey(): string | null {
  if (process.env.DEV_ACCESS_KEY) {
    return process.env.DEV_ACCESS_KEY;
  }
  if (process.env.NODE_ENV !== "production") {
    return "local-dev-key";
  }
  return null;
}

function isMagicLoginEnabled(): boolean {
  if (process.env.MAGIC_LOGIN_ENABLED === "true") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

function matchesAccessKey(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const storeSlug = searchParams.get("store");
  const providedKey = searchParams.get("key") ?? "";

  const expectedKey = devAccessKey();

  // Production-mode magic login requires an explicit AUTH-LEVEL access key.
  if (!isMagicLoginEnabled() || expectedKey === null) {
    return NextResponse.redirect(
      new URL("/magic-login?error=disabled", request.url)
    );
  }

  if (!matchesAccessKey(providedKey, expectedKey)) {
    return NextResponse.redirect(
      new URL("/magic-login?error=invalid_key", request.url)
    );
  }

  if (!checkRateLimit(`magic:${clientIpFromRequest(request)}`, 30)) {
    return NextResponse.redirect(
      new URL("/magic-login?error=rate_limited", request.url)
    );
  }

  if (!email) {
    return NextResponse.redirect(new URL("/magic-login", request.url));
  }

  const employee = await prisma.employee.findFirst({
    where: { email: email.trim().toLowerCase(), active: true },
    include: { business: true }
  });

  if (!employee) {
    return NextResponse.redirect(new URL("/magic-login?error=user_not_found", request.url));
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
  const response = NextResponse.redirect(new URL(targetUrl, request.url));

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

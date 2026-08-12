import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSessionTokenPayload } from "@/server/auth/auth-service";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authSession = request.cookies.get("auth_session")?.value;
  const demoEmail = request.cookies.get("demo_user_email")?.value;

  const tokenPayload = authSession ? decodeSessionTokenPayload(authSession) : null;
  const isAuthenticated = Boolean(tokenPayload || demoEmail);

  // Allow public routes without auth checks
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/magic-login") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    // If visiting /login while authenticated, redirect to role dashboard
    if (pathname === "/login" && isAuthenticated) {
      const isPlatformAdmin = tokenPayload?.accountType === "PLATFORM_ADMIN" || Boolean(demoEmail?.includes("platform.") || demoEmail?.startsWith("platform@"));
      const isHq = tokenPayload?.accountType === "HQ_ADMIN" || Boolean(demoEmail?.includes("hq."));
      return NextResponse.redirect(new URL(isPlatformAdmin ? "/platform/setup" : isHq ? "/hq/dashboard" : "/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 1. AUTHENTICATION GUARD: Protect all non-public routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. AUTHORIZATION GUARD: Enforce role-based access for Platform/HQ routes
  if (pathname.startsWith("/platform")) {
    const isPlatformAdmin = tokenPayload?.accountType === "PLATFORM_ADMIN" || Boolean(demoEmail?.includes("platform.") || demoEmail?.startsWith("platform@"));
    if (!isPlatformAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (pathname.startsWith("/hq")) {
    const isHqAdmin = tokenPayload?.accountType === "HQ_ADMIN" || tokenPayload?.accountType === "PLATFORM_ADMIN" || Boolean(demoEmail?.includes("hq.") || demoEmail?.includes("platform.") || demoEmail?.startsWith("platform@"));
    if (!isHqAdmin) {
      // Non-HQ users (Store Managers/Owners) attempting to access /hq/* are blocked and redirected to /dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

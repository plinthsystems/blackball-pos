import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSecret, verifySessionTokenEdge } from "@/server/auth/auth-service";

const isProduction = () => process.env.NODE_ENV === "production";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authSession = request.cookies.get("auth_session")?.value;
  const demoEmail = request.cookies.get("demo_user_email")?.value;

  // SECURITY: middleware verifies the HMAC signature — decoding without verifying
  // would let attackers forge role claims. Demo cookies are only trusted in dev.
  const tokenPayload = authSession ? await verifySessionTokenEdge(authSession) : null;
  const demoIdentityAllowed = !isProduction() && Boolean(demoEmail);
  const isAuthenticated = Boolean(tokenPayload || demoIdentityAllowed);

  // Allow public routes without auth checks
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname === "/setup" ||
    pathname.startsWith("/magic-login") ||
    pathname.startsWith("/docs") ||
    pathname === "/book" ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/qr/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/integrations") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    // If visiting /login while authenticated, redirect to role dashboard
    if (pathname === "/login" && isAuthenticated && !pathname.startsWith("/api")) {
      const accountType = tokenPayload?.accountType;
      const isPlatformAdmin = accountType === "PLATFORM_ADMIN" || (!isProduction() && Boolean(demoEmail?.includes("platform.") || demoEmail?.startsWith("platform@")));
      const isHq = accountType === "HQ_ADMIN" || (!isProduction() && Boolean(demoEmail?.includes("hq.")));
      return NextResponse.redirect(new URL(isPlatformAdmin ? "/platform/setup" : isHq ? "/hq/dashboard" : "/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 1. AUTHENTICATION GUARD: Protect all non-public routes
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/") && pathname !== "/api/") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. PASSWORD-RESET GUARD: force password change before any other page
  if (
    tokenPayload?.mustChangePassword &&
    !pathname.startsWith("/change-password") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // 2. AUTHORIZATION GUARD: Enforce role-based access for Platform/HQ routes
  if (pathname.startsWith("/platform")) {
    const isPlatformAdmin =
      tokenPayload?.accountType === "PLATFORM_ADMIN" ||
      (!isProduction() && Boolean(demoEmail?.includes("platform.") || demoEmail?.startsWith("platform@")));
    if (!isPlatformAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (pathname.startsWith("/hq")) {
    const isHqAdmin =
      tokenPayload?.accountType === "HQ_ADMIN" ||
      tokenPayload?.accountType === "PLATFORM_ADMIN" ||
      (!isProduction() && Boolean(demoEmail?.includes("hq.") || demoEmail?.includes("platform.") || demoEmail?.startsWith("platform@")));
    if (!isHqAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

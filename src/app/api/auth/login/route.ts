import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { createSessionToken, verifyPassword } from "@/server/auth/auth-service";
import { checkRateLimit, clientIpFromRequest } from "@/server/auth/rate-limit";

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(`login:${clientIpFromRequest(request)}`, 10)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        email: { equals: email.trim(), mode: "insensitive" },
        active: true
      },
      include: { business: true }
    });

    if (!employee || !employee.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = verifyPassword(password, employee.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = createSessionToken({
      employeeId: employee.id,
      email: employee.email,
      accountType: employee.accountType,
      businessId: employee.businessId ?? undefined,
      storeSlug: employee.business?.slug ?? undefined,
      mustChangePassword: employee.mustChangePassword
    });

    const redirectUrl =
      employee.accountType === "PLATFORM_ADMIN"
        ? "/platform/setup"
        : employee.accountType === "HQ_ADMIN"
          ? "/hq/dashboard"
          : employee.mustChangePassword
            ? "/change-password"
            : "/dashboard";

    const response = NextResponse.json({ success: true, redirectUrl });
    response.cookies.set("auth_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Demo cookies are development helpers only — never set in production.
    if (process.env.NODE_ENV !== "production") {
      response.cookies.set("demo_user_email", employee.email, { path: "/", maxAge: 60 * 60 * 24 * 7 });
      if (employee.business?.slug) {
        response.cookies.set("demo_store_slug", employee.business.slug, { path: "/", maxAge: 60 * 60 * 24 * 7 });
      }
    }

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

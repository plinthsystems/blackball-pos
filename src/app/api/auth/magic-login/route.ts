import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { createSessionToken } from "@/server/auth/auth-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const storeSlug = searchParams.get("store");

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
    storeSlug: activeStoreSlug
  });

  const targetUrl = employee.accountType === "HQ_ADMIN" ? "/hq/dashboard" : "/dashboard";
  const response = NextResponse.redirect(new URL(targetUrl, request.url));

  response.cookies.set("auth_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  response.cookies.set("demo_user_email", employee.email, { path: "/", maxAge: 60 * 60 * 24 * 7 });
  if (activeStoreSlug) {
    response.cookies.set("demo_store_slug", activeStoreSlug, { path: "/", maxAge: 60 * 60 * 24 * 7 });
  }

  return response;
}

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, redirectUrl: "/login" });
  
  response.cookies.delete("auth_session");
  response.cookies.delete("demo_user_email");
  response.cookies.delete("demo_store_slug");

  return response;
}

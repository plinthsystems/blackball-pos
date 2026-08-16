import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/logout/route";
import { getSetCookies } from "../support/request-helpers";

/**
 * POST /api/auth/logout — clears the session cookie (and demo cookies).
 */

describe("POST /api/auth/logout", () => {
  it("returns success with a redirect to /login", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, redirectUrl: "/login" });
  });

  it("deletes auth_session and both demo cookies", async () => {
    const response = await POST();

    const setCookies = getSetCookies(response);
    const deletedNames = setCookies.map((c) => c.split("=")[0]);
    expect(deletedNames).toEqual(
      expect.arrayContaining(["auth_session", "demo_user_email", "demo_store_slug"])
    );
    // Deleted cookies carry an empty value + expiry in the past.
    for (const name of ["auth_session", "demo_user_email", "demo_store_slug"]) {
      const cookie = setCookies.find((c) => c.startsWith(`${name}=`));
      expect(cookie).toBeDefined();
      expect(cookie?.split(";")[0]).toBe(`${name}=`);
    }
  });
});

import { getCurrentEmployeeContext, CurrentEmployeeContext } from "./current-employee";

export class AuthorizationError extends Error {
  constructor(message: string, public status: number = 403) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Requires an authenticated user session.
 * Throws 401 AuthorizationError if unauthenticated.
 */
export async function requireAuth(): Promise<CurrentEmployeeContext> {
  const context = await getCurrentEmployeeContext();
  if (!context) {
    throw new AuthorizationError("Unauthenticated session. Please sign in.", 401);
  }
  return context;
}

/**
 * Requires HQ_ADMIN role for master multi-outlet access.
 * Throws 403 AuthorizationError if user is not HQ_ADMIN.
 */
export async function requireHqAdmin(): Promise<CurrentEmployeeContext> {
  const context = await requireAuth();
  if (context.accountType !== "HQ_ADMIN") {
    throw new AuthorizationError("Access denied: Requires HQ Admin permissions.", 403);
  }
  return context;
}

/**
 * Requires a specific granular permission (e.g. 'rates.manage', 'settings.manage').
 * HQ_ADMIN bypasses granular permission checks.
 */
export async function requirePermission(permission: string): Promise<CurrentEmployeeContext> {
  const context = await requireAuth();

  if (context.accountType === "HQ_ADMIN") {
    return context;
  }

  const hasPerm = context.permissions.includes(permission);
  if (!hasPerm) {
    throw new AuthorizationError(`Access denied: Required permission '${permission}' missing.`, 403);
  }

  return context;
}

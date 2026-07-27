import { DomainError } from "@/server/domain/errors";
import type { CurrentEmployeeContext } from "./current-employee";

export function requirePermission(context: CurrentEmployeeContext, permission: string) {
  if (!context.permissions.includes(permission)) {
    throw new DomainError("UNAUTHORIZED", "You do not have permission to perform this action.", {
      permission
    });
  }
}

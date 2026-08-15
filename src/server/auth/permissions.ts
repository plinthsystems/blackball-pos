import { DomainError } from "@/server/domain/errors";
import type { CurrentEmployeeContext } from "./current-employee";

export function requirePermission(
  context: CurrentEmployeeContext,
  permission: string,
  options: { allowPasswordChange?: boolean } = {}
) {
  if (!options.allowPasswordChange && context.mustChangePassword) {
    throw new DomainError(
      "PASSWORD_CHANGE_REQUIRED",
      "You must change your password before performing this action.",
      { permission }
    );
  }
  if (!context.permissions.includes(permission)) {
    throw new DomainError("UNAUTHORIZED", "You do not have permission to perform this action.", {
      permission
    });
  }
}

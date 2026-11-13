export function getDefaultRouteForPermissions(permissions: string[]) {
  if (permissions.includes("platform.setup.manage")) {
    return "/platform/setup";
  }

  if (permissions.includes("hq.dashboard.read")) {
    return "/hq/dashboard";
  }

  if (permissions.includes("dashboard.read")) {
    return "/dashboard";
  }

  return "/live-tables";
}

export function getDefaultRouteForAccountType(accountType: string, mustChangePassword = false) {
  if (mustChangePassword) {
    return "/change-password";
  }
  if (accountType === "PLATFORM_ADMIN") {
    return "/platform/setup";
  }
  if (accountType === "HQ_ADMIN") {
    return "/hq/dashboard";
  }
  if (accountType === "STORE_USER") {
    return "/live-tables";
  }
  return "/dashboard";
}

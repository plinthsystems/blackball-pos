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

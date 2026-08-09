export function getDefaultRouteForPermissions(permissions: string[]) {
  if (permissions.includes("dashboard.read")) {
    return "/dashboard";
  }

  return "/live-tables";
}

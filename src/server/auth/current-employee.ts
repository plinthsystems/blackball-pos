import { prisma } from "@/server/db/prisma";

export type AccountType = "PLATFORM_ADMIN" | "HQ_ADMIN" | "STORE_OWNER" | "MANAGER" | "STORE_USER";

export type TenantBranding = {
  appName: string;
  logoInitials: string;
  businessName: string;
  brandColor: string;
  accentColor: string;
};

export type OrganizationContext = {
  id: string;
  name: string;
  type: "INDEPENDENT_SAAS" | "FRANCHISE";
  businesses: Array<{ id: string; name: string; slug: string; franchiseeId?: string | null }>;
};

export type TenantScope = {
  organizationId: string | null;
  franchiseeId: string | null;
  businessIds: string[];
  selectedBusinessId: string;
};

export type CurrentEmployeeContext = {
  businessId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  accountType: AccountType;
  permissions: string[];
  tenantBranding: TenantBranding;
  organization?: OrganizationContext;
  scope: TenantScope;
  mustChangePassword: boolean;
};

export function isAuthenticatedContext(context: CurrentEmployeeContext): boolean {
  return Boolean(context.employeeId) && context.accountType !== "STORE_USER" ? true : Boolean(context.employeeId);
}

export function buildDeniedContext(): CurrentEmployeeContext {
  return {
    businessId: "",
    employeeId: "",
    employeeName: "",
    employeeEmail: "",
    accountType: "STORE_USER",
    permissions: [],
    tenantBranding: defaultBranding,
    scope: {
      organizationId: null,
      franchiseeId: null,
      businessIds: [],
      selectedBusinessId: ""
    },
    mustChangePassword: false
  };
}

type BusinessAccessSummary = {
  id: string;
  name: string;
  slug: string;
  franchiseeId?: string | null;
  settings?: {
    appName: string;
    logoInitials: string;
    brandColor: string;
    accentColor: string;
  } | null;
};

type EmployeeWithTenantAccess = {
  id: string;
  businessId: string | null;
  organizationId: string | null;
  franchiseeId: string | null;
  name: string;
  email: string;
  accountType: AccountType;
  mustChangePassword: boolean;
  organization: {
    id: string;
    name: string;
    type: "INDEPENDENT_SAAS" | "FRANCHISE";
    businesses: BusinessAccessSummary[];
  } | null;
  franchisee: {
    id: string;
    name: string;
    businesses: BusinessAccessSummary[];
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    franchiseeId?: string | null;
    settings: {
      appName: string;
      logoInitials: string;
      brandColor: string;
      accentColor: string;
    } | null;
  } | null;
  roles: Array<{
    role: {
      permissions: Array<{
        permission: {
          key: string;
        };
      }>;
    };
  }>;
};

const defaultBranding = {
  appName: "Black Ball",
  logoInitials: "BB",
  businessName: "Pool & Snooker Cafe",
  brandColor: "#12613d",
  accentColor: "#b98922"
};

export async function getCurrentEmployeeContext(): Promise<CurrentEmployeeContext> {
  const identity = await getRequestIdentity();
  if (!identity.email) {
    return buildDeniedContext();
  }
  const employee = await prisma.employee.findFirst({
    where: {
      email: identity.email,
      active: true
    },
    include: {
      organization: {
        include: {
          businesses: { select: { id: true, name: true, slug: true, franchiseeId: true, settings: true } }
        }
      },
      franchisee: {
        include: {
          businesses: { select: { id: true, name: true, slug: true, franchiseeId: true, settings: true } }
        }
      },
      business: {
        include: {
          settings: true,
          organization: {
            include: {
              businesses: { select: { id: true, name: true, slug: true, franchiseeId: true, settings: true } }
            }
          }
        }
      },
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      }
    }
  });

  if (employee) {
    return buildCurrentEmployeeContext(employee as unknown as EmployeeWithTenantAccess, identity.tenantSlug);
  }

  // SECURITY: only the development fallback grants an anonymous manager context.
  // In production, an unresolvable identity is DENIED — never an implicit role.
  if (process.env.NODE_ENV === "production") {
    return buildDeniedContext();
  }

  return buildFallbackContext(identity.tenantSlug ?? "seed-business", identity.email ?? "owner@cueclub.example");
}

export function buildCurrentEmployeeContext(
  employee: EmployeeWithTenantAccess,
  currentSlug?: string | null
): CurrentEmployeeContext {
  const rawPermissions = employee.roles.flatMap((employeeRole) =>
    employeeRole.role.permissions.map((rolePermission) => rolePermission.permission.key)
  );

  if (["PLATFORM_ADMIN", "HQ_ADMIN", "STORE_OWNER", "MANAGER"].includes(employee.accountType)) {
    rawPermissions.push("dashboard.read", "tables.read", "products.manage", "rates.manage", "settings.update");
  }

  if (["STORE_OWNER", "MANAGER"].includes(employee.accountType)) {
    rawPermissions.push("tables.manage");
  }

  if (employee.accountType === "PLATFORM_ADMIN") {
    rawPermissions.push("platform.setup.manage", "hq.dashboard.read", "hq.manage");
  }

  if (employee.accountType === "HQ_ADMIN") {
    rawPermissions.push("hq.dashboard.read", "hq.manage");
  }

  let permissions = Array.from(new Set(rawPermissions));
  if (!["PLATFORM_ADMIN", "HQ_ADMIN"].includes(employee.accountType)) {
    permissions = permissions.filter((permission) => !permission.startsWith("hq."));
  }

  const organization = employee.organization;
  const organizationBusinesses = organization?.businesses ?? [];
  const allowedBusinesses = getAllowedBusinesses(employee, organizationBusinesses);
  const selectedBusiness = (currentSlug ? allowedBusinesses.find((business) => business.slug === currentSlug) : undefined) ?? allowedBusinesses[0];
  const settings = selectedBusiness?.settings ?? employee.business?.settings ?? defaultBranding;
  const selectedBusinessId = selectedBusiness?.id ?? employee.businessId ?? "seed-business";
  const businessIds = allowedBusinesses.length > 0 ? allowedBusinesses.map((business) => business.id) : [selectedBusinessId];

  return {
    businessId: selectedBusinessId,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeEmail: employee.email,
    accountType: employee.accountType,
    permissions,
    tenantBranding: {
      appName: settings.appName,
      logoInitials: settings.logoInitials,
      businessName: selectedBusiness?.name ?? "Pool & Snooker Cafe",
      brandColor: settings.brandColor,
      accentColor: settings.accentColor
    },
    organization: organization ? {
      id: organization.id,
      name: organization.name,
      type: organization.type,
      businesses: allowedBusinesses.map((business) => ({
        id: business.id,
        name: business.name,
        slug: business.slug,
        franchiseeId: business.franchiseeId ?? null
      }))
    } : undefined,
    scope: {
      organizationId: employee.organizationId ?? organization?.id ?? null,
      franchiseeId: employee.franchiseeId ?? employee.franchisee?.id ?? null,
      businessIds,
      selectedBusinessId
    },
    mustChangePassword: employee.mustChangePassword
  };
}

function getAllowedBusinesses(employee: EmployeeWithTenantAccess, organizationBusinesses: BusinessAccessSummary[]) {
  if (["PLATFORM_ADMIN", "HQ_ADMIN"].includes(employee.accountType)) {
    return organizationBusinesses.length > 0 ? organizationBusinesses : compactBusiness(employee.business);
  }

  if (employee.franchisee) {
    return employee.franchisee.businesses;
  }

  if (employee.accountType === "STORE_OWNER" && organizationBusinesses.length > 0 && !employee.franchiseeId) {
    return organizationBusinesses;
  }

  return compactBusiness(employee.business);
}

function compactBusiness(business: EmployeeWithTenantAccess["business"]): BusinessAccessSummary[] {
  if (!business) {
    return [];
  }
  return [{
    id: business.id,
    name: business.name,
    slug: business.slug,
    franchiseeId: business.franchiseeId ?? null,
    settings: business.settings
  }];
}

import { verifySessionToken } from "./auth-service";

const isProduction = () => process.env.NODE_ENV === "production";

async function getRequestIdentity() {
  // Production: identity ONLY from a cryptographically verified session token.
  // Request headers / demo cookies / env fallbacks are NEVER trusted in production.
  try {
    const { headers, cookies } = await import("next/headers");
    const requestHeaders = await headers();
    const requestCookies = await cookies();

    const authSessionCookie = requestCookies.get("auth_session")?.value;
    const sessionPayload = authSessionCookie ? verifySessionToken(authSessionCookie) : null;

    if (isProduction()) {
      if (!sessionPayload) {
        return { tenantSlug: null, email: null };
      }
      return {
        tenantSlug: sessionPayload.storeSlug ?? null,
        email: sessionPayload.email
      };
    }

    const cookieEmail = sessionPayload?.email ?? requestCookies.get("demo_user_email")?.value;
    const cookieStoreSlug = sessionPayload?.storeSlug ?? requestCookies.get("demo_store_slug")?.value;
    const tenantSlug =
      process.env.BLACKBALL_TENANT_SLUG ??
      process.env.NEXT_PUBLIC_BLACKBALL_TENANT_SLUG ??
      "seed-business";
    const defaultEmail = process.env.BLACKBALL_USER_EMAIL ?? "owner@cueclub.example";

    return {
      tenantSlug: requestHeaders.get("x-tenant-slug") ?? cookieStoreSlug ?? tenantSlug,
      email: requestHeaders.get("x-user-email") ?? cookieEmail ?? defaultEmail
    };
  } catch {
    if (isProduction()) {
      return { tenantSlug: null, email: null };
    }
    return {
      tenantSlug: process.env.BLACKBALL_TENANT_SLUG ?? "seed-business",
      email: process.env.BLACKBALL_USER_EMAIL ?? "owner@cueclub.example"
    };
  }
}

async function buildFallbackContext(tenantSlug: string, email?: string): Promise<CurrentEmployeeContext> {
  const business = await prisma.business.findUnique({
    where: { slug: tenantSlug },
    include: {
      settings: true,
      organization: {
        include: {
          businesses: { select: { id: true, name: true, slug: true, franchiseeId: true } }
        }
      }
    }
  });
  const settings = business?.settings ?? defaultBranding;
  const normalizedEmail = email?.toLowerCase() ?? "";
  const isPlatformAdmin = normalizedEmail.includes("platform.") || normalizedEmail.startsWith("platform@");
  const isHq = Boolean(normalizedEmail.includes("hq."));
  const accountType: AccountType = isPlatformAdmin ? "PLATFORM_ADMIN" : isHq ? "HQ_ADMIN" : "MANAGER";

  const permissions = [
    "bills.manage",
    "dashboard.read",
    "products.manage",
    "rates.manage",
    "sessions.add_items",
    "sessions.end",
    "sessions.extend",
    "sessions.pause",
    "sessions.resume",
    "sessions.start",
    "settings.update",
    "tables.manage",
    "tables.read",
    "tables.update_status"
  ];

  if (isPlatformAdmin) {
    permissions.push("platform.setup.manage", "hq.dashboard.read", "hq.manage");
  } else if (isHq) {
    permissions.push("hq.dashboard.read", "hq.manage");
  }

  return {
    businessId: business?.id ?? "seed-business",
    employeeId: "seed-employee",
    employeeName: isPlatformAdmin ? "Platform Admin" : isHq ? "HQ Director" : "Store Manager",
    employeeEmail: email ?? "manager@example.com",
    accountType,
    permissions,
    tenantBranding: {
      appName: settings.appName,
      logoInitials: settings.logoInitials,
      businessName: business?.name ?? "Pool & Snooker Cafe",
      brandColor: settings.brandColor,
      accentColor: settings.accentColor
    },
    organization: business?.organization ? {
      id: business.organization.id,
      name: business.organization.name,
      type: business.organization.type,
      businesses: business.organization.businesses
    } : undefined,
    scope: {
      organizationId: business?.organization?.id ?? null,
      franchiseeId: null,
      businessIds: business ? [business.id] : ["seed-business"],
      selectedBusinessId: business?.id ?? "seed-business"
    },
    mustChangePassword: false
  };
}

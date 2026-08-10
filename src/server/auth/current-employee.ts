import { prisma } from "@/server/db/prisma";

export type AccountType = "HQ_ADMIN" | "STORE_OWNER" | "MANAGER" | "STORE_USER";

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
};

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
  brandColor: "#12613d",
  accentColor: "#b98922"
};

export async function getCurrentEmployeeContext(): Promise<CurrentEmployeeContext> {
  const identity = await getRequestIdentity();
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

  return buildFallbackContext(identity.tenantSlug, identity.email);
}

export function buildCurrentEmployeeContext(
  employee: EmployeeWithTenantAccess,
  currentSlug?: string
): CurrentEmployeeContext {
  const rawPermissions = employee.roles.flatMap((employeeRole) =>
    employeeRole.role.permissions.map((rolePermission) => rolePermission.permission.key)
  );

  if (["HQ_ADMIN", "STORE_OWNER", "MANAGER"].includes(employee.accountType)) {
    rawPermissions.push("dashboard.read", "tables.read", "products.manage", "rates.manage", "settings.update");
  }

  if (employee.accountType === "HQ_ADMIN") {
    rawPermissions.push("hq.dashboard.read", "hq.manage");
  }

  let permissions = Array.from(new Set(rawPermissions));
  if (employee.accountType !== "HQ_ADMIN") {
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
    }
  };
}

function getAllowedBusinesses(employee: EmployeeWithTenantAccess, organizationBusinesses: BusinessAccessSummary[]) {
  if (employee.accountType === "HQ_ADMIN") {
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

async function getRequestIdentity() {
  const tenantSlug = process.env.BLACKBALL_TENANT_SLUG ?? process.env.NEXT_PUBLIC_BLACKBALL_TENANT_SLUG ?? "seed-business";
  const defaultEmail = process.env.BLACKBALL_USER_EMAIL ?? "owner@cueclub.example";

  try {
    const { headers, cookies } = await import("next/headers");
    const requestHeaders = await headers();
    const requestCookies = await cookies();

    const authSessionCookie = requestCookies.get("auth_session")?.value;
    const sessionPayload = authSessionCookie ? verifySessionToken(authSessionCookie) : null;

    const cookieEmail = sessionPayload?.email ?? requestCookies.get("demo_user_email")?.value;
    const cookieStoreSlug = sessionPayload?.storeSlug ?? requestCookies.get("demo_store_slug")?.value;

    return {
      tenantSlug: requestHeaders.get("x-tenant-slug") ?? cookieStoreSlug ?? tenantSlug,
      email: requestHeaders.get("x-user-email") ?? cookieEmail ?? defaultEmail
    };
  } catch {
    return { tenantSlug, email: defaultEmail };
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
  const isHq = Boolean(email?.toLowerCase().includes("hq."));
  const accountType: AccountType = isHq ? "HQ_ADMIN" : "MANAGER";

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
    "tables.read",
    "tables.update_status"
  ];

  if (isHq) {
    permissions.push("hq.dashboard.read", "hq.manage");
  }

  return {
    businessId: business?.id ?? "seed-business",
    employeeId: "seed-employee",
    employeeName: isHq ? "HQ Director" : "Store Manager",
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
    }
  };
}

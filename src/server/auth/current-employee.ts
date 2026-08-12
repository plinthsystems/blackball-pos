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
  businesses: Array<{ id: string; name: string; slug: string }>;
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
};

type EmployeeWithTenantAccess = {
  id: string;
  businessId: string | null;
  organizationId: string | null;
  name: string;
  email: string;
  accountType: AccountType;
  organization: {
    id: string;
    name: string;
    type: "INDEPENDENT_SAAS" | "FRANCHISE";
    businesses: Array<{
      id: string;
      name: string;
      slug: string;
      settings?: {
        appName: string;
        logoInitials: string;
        brandColor: string;
        accentColor: string;
      } | null;
    }>;
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
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
          businesses: { select: { id: true, name: true, slug: true, settings: true } }
        }
      },
      business: {
        include: {
          settings: true,
          organization: {
            include: {
              businesses: { select: { id: true, name: true, slug: true, settings: true } }
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
  const selectedBusiness = (currentSlug ? organization?.businesses.find(b => b.slug === currentSlug) : undefined) ?? employee.business ?? organization?.businesses[0];
  const settings = selectedBusiness?.settings ?? employee.business?.settings ?? defaultBranding;

  return {
    businessId: selectedBusiness?.id ?? employee.businessId ?? "seed-business",
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
      businesses: organization.businesses
    } : undefined
  };
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
          businesses: { select: { id: true, name: true, slug: true } }
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
    } : undefined
  };
}

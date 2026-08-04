import { prisma } from "@/server/db/prisma";

export type AccountType = "STORE_USER" | "MANAGER";

export type TenantBranding = {
  appName: string;
  logoInitials: string;
  businessName: string;
  brandColor: string;
  accentColor: string;
};

export type CurrentEmployeeContext = {
  businessId: string;
  employeeId: string;
  employeeName: string;
  accountType: AccountType;
  permissions: string[];
  tenantBranding: TenantBranding;
};

type EmployeeWithTenantAccess = {
  id: string;
  businessId: string;
  name: string;
  email: string;
  accountType: AccountType;
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
  };
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
      active: true,
      business: { slug: identity.tenantSlug }
    },
    include: {
      business: {
        include: { settings: true }
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
    return buildCurrentEmployeeContext(employee as EmployeeWithTenantAccess);
  }

  return buildFallbackContext(identity.tenantSlug);
}

export function buildCurrentEmployeeContext(employee: EmployeeWithTenantAccess): CurrentEmployeeContext {
  const permissions = Array.from(
    new Set(employee.roles.flatMap((employeeRole) => employeeRole.role.permissions.map((rolePermission) => rolePermission.permission.key)))
  );
  const settings = employee.business.settings ?? defaultBranding;

  return {
    businessId: employee.businessId,
    employeeId: employee.id,
    employeeName: employee.name,
    accountType: employee.accountType,
    permissions,
    tenantBranding: {
      appName: settings.appName,
      logoInitials: settings.logoInitials,
      businessName: employee.business.name,
      brandColor: settings.brandColor,
      accentColor: settings.accentColor
    }
  };
}

async function getRequestIdentity() {
  const tenantSlug = process.env.BLACKBALL_TENANT_SLUG ?? process.env.NEXT_PUBLIC_BLACKBALL_TENANT_SLUG ?? "seed-business";
  const email = process.env.BLACKBALL_USER_EMAIL ?? "owner@cueclub.example";

  try {
    const { headers } = await import("next/headers");
    const requestHeaders = await headers();
    return {
      tenantSlug: requestHeaders.get("x-tenant-slug") ?? tenantSlug,
      email: requestHeaders.get("x-user-email") ?? email
    };
  } catch {
    return { tenantSlug, email };
  }
}

async function buildFallbackContext(tenantSlug: string): Promise<CurrentEmployeeContext> {
  const business = await prisma.business.findUnique({
    where: { slug: tenantSlug },
    include: { settings: true }
  });
  const settings = business?.settings ?? defaultBranding;

  return {
    businessId: business?.id ?? "seed-business",
    employeeId: "seed-employee",
    employeeName: "Manager",
    accountType: "MANAGER",
    permissions: [
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
    ],
    tenantBranding: {
      appName: settings.appName,
      logoInitials: settings.logoInitials,
      businessName: business?.name ?? "Pool & Snooker Cafe",
      brandColor: settings.brandColor,
      accentColor: settings.accentColor
    }
  };
}

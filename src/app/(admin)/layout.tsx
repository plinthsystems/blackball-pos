import { AdminShell } from "@/components/app/admin-shell";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentEmployeeContext();

  return (
    <AdminShell
      tenantBranding={context.tenantBranding}
      account={{
        name: context.employeeName,
        email: context.employeeEmail,
        accountType: context.accountType,
        permissions: context.permissions
      }}
      businessId={context.businessId}
      organization={context.organization}
    >
      {children}
    </AdminShell>
  );
}

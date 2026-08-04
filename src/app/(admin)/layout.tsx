import { AdminShell } from "@/components/app/admin-shell";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentEmployeeContext();

  return (
    <AdminShell
      tenantBranding={context.tenantBranding}
      account={{
        name: context.employeeName,
        accountType: context.accountType,
        permissions: context.permissions
      }}
    >
      {children}
    </AdminShell>
  );
}

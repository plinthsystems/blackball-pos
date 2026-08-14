import { redirect } from "next/navigation";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { getUpcomingBookings } from "@/features/booking/queries";
import { StaffBookingsPanel } from "@/features/booking/components/staff-bookings";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("bookings.manage")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }

  const bookings = await getUpcomingBookings(context.businessId);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Customer Bookings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upcoming online bookings for this store. Confirm pending requests before customers arrive.
        </p>
      </div>
      <StaffBookingsPanel bookings={bookings} />
    </section>
  );
}

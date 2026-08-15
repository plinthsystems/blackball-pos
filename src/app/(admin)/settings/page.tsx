import { MenuSettingsPage } from "@/features/settings/menu-settings-page";
import { ensureBookingSettingsFor } from "@/features/booking/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getDefaultRouteForPermissions } from "@/server/auth/routes";
import { isPaymentProviderConfigured } from "@/server/integrations/payments";
import { isWhatsAppConfigured } from "@/server/integrations/whatsapp";
import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getCurrentEmployeeContext();
  if (!context.permissions.includes("products.manage")) {
    redirect(getDefaultRouteForPermissions(context.permissions));
  }
  const [products, settings, business] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: context.businessId, active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    }),
    ensureBookingSettingsFor(context.businessId),
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { slug: true, name: true }
    })
  ]);

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = process.env.APP_BASE_URL ?? "localhost:3000";
  const razorpayReady = isPaymentProviderConfigured("RAZORPAY");
  const stripeReady = isPaymentProviderConfigured("STRIPE");

  return (
    <MenuSettingsPage
      branding={{
        appName: context.tenantBranding.appName,
        logoInitials: context.tenantBranding.logoInitials,
        brandColor: context.tenantBranding.brandColor,
        accentColor: context.tenantBranding.accentColor
      }}
      booking={
        settings
          ? {
              bookingEnabled: settings.bookingEnabled,
              requireConfirmation: settings.requireConfirmation,
              bookingBufferMinutes: settings.bookingBufferMinutes,
              bookingMinLeadMinutes: settings.bookingMinLeadMinutes,
              bookingOpenHour: settings.bookingOpenHour,
              bookingCloseHour: settings.bookingCloseHour,
              bookingCloseNextDay: settings.bookingCloseNextDay,
              paymentProvider: settings.paymentProvider,
              bookingAdvanceAmount: Number(settings.bookingAdvanceAmount),
              availablePaymentProviders: [
                { code: "NONE", label: "None — pay at store", ready: true },
                { code: "RAZORPAY", label: "Razorpay", ready: razorpayReady },
                { code: "STRIPE", label: "Stripe", ready: stripeReady }
              ],
              whatsappConfigured: isWhatsAppConfigured(),
              paymentInfo: settings.paymentProvider !== "NONE" && !(settings.paymentProvider === "RAZORPAY" ? razorpayReady : stripeReady)
                ? "⚠️ Selected provider's secret keys are missing from .env — payments will stay disabled until configured."
                : null,
              bookingLink: `${protocol}://${host}/book/${business?.slug ?? ""}`
            }
          : undefined
      }
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        priceAmount: Number(product.priceAmount),
        active: product.active
      }))}
    />
  );
}

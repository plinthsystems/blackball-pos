# The Nine Floor & Billing Polish Design

## Intent

Make the daily The Nine workflow understandable for store staff. The live
floor should show only the five real tables, and billing should make table
time and food/cafe purchases visibly add up to the final amount.

## Goals

- Remove PS5 from The Nine's seeded inventory, pricing, live-floor sections,
  and The Nine-facing tests.
- Seed exactly: Royal Snooker 1, Royal Snooker 2, Mini Snooker 1, Mini
  Snooker 2, and Pool.
- Rename the store to `The Nine Snooker & Cafe` in the store-facing brand.
- Remove the live-floor status/count summary tiles while keeping each table's
  operational state and session controls.
- Make billing show table name, elapsed table time, hourly rate, table charge,
  item breakdown, and total for open and closed session bills.
- Remove Store password controls from the Store shell and remove the Business
  Profile editor from Settings.
- Make the supplied club photography visible beyond the login-only desktop
  panel by adding a compact The Nine visual treatment to store pages.

## Non-goals

- Do not delete the retained franchise, HQ, platform, booking, payment, or
  WhatsApp modules.
- Do not replace the existing bill/session persistence model.
- Do not add taxes, discounts, payment capture, or a new checkout provider.

## Billing rules

- For an open session bill, table time is calculated from that bill's opened
  time to the current time using the session's `hourlyRateSnapshot`.
- For a closed session bill, the stored table amount remains authoritative;
  displayed duration is derived from the bill's opened/closed timestamps.
- Product totals are the sum of bill items, with `CAFE` displayed as Food.
- The displayed total is table charge plus product total. The UI labels these
  as separate lines so staff can reconcile the amount.
- The shared `calculateBillSegmentTableAmount` function is the only table-time
  money calculation used by billing close actions.

## UI direction

Use a compact operational billing page: a small summary strip, a simple
filter row, and receipt-like expandable cards. Each receipt has a clear total
and a breakdown section; no dense multi-column table is required on mobile.
Keep existing server actions and filters.

## Approaches considered

1. Replace billing with a new cashier/cart system. Rejected for this pass: it
   changes stable session/bill behavior and is larger than the immediate need.
2. Keep the current table and only rename labels. Rejected: it would not fix
   the missing live table-time charge or make the total understandable.
3. Recommended: preserve queries/actions, centralize the live/closed table-time
   calculation, add explicit breakdown fields, and replace the dense billing
   presentation with receipt cards. This is the smallest safe change that
   solves the staff confusion.

## Constraints

- Use existing Prisma schema, permissions, and session/bill actions.
- No new dependencies.
- Keep existing club images at `/public/the-nine/`.

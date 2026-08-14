# Owner Dashboard, PS5, Rates, and UI Refresh Design

## Goal

Improve the club management app so it feels ready for day-to-day industry use by an owner and staff team. The app should make live operations clearer, give the owner an at-a-glance daily business view, support two PS5 stations, and allow hourly rates to be edited from the UI.

## Approved Product Direction

PS5 will use a hybrid design:

- PS5 appears in its own visual section so staff can distinguish consoles from snooker and pool tables.
- PS5 uses the same session, timer, bill, menu item, split bill, and reporting engine as snooker and pool.
- Owner reports include PS5 as its own revenue and busy-hours category.

This avoids a second billing system while keeping the floor UI easy to scan.

## Information Architecture

The admin shell will have four primary areas:

- Dashboard: owner view for today's revenue and utilization.
- Live Floor: operational screen for active snooker, pool, and PS5 sessions.
- Food/Menu: product list management for Food, Cigarettes, and Beverages.
- Rates: hourly-rate management for Royal Snooker, Mini Snooker, Pool, and PS5.

The current Settings page will become a more useful operational area rather than an empty-feeling page. Menu management can stay available, but rates should be its own clear section because owners will adjust prices separately from food items.

## Live Floor UI

The live screen will be redesigned around scan speed:

- Top summary strip: today's revenue, active sessions, occupied stations, and open counter bills.
- Snooker and pool section: grouped station cards for the existing five tables.
- PS5 section: two console cards with the same actions as tables.
- Counter bills section: compact open food-only bills.

Each station card should show:

- Station name and type.
- Availability or occupied state.
- Started time and running duration.
- Current bill total.
- Current station charge.
- Item/category totals.
- Ordered items on that station.
- Primary actions: Start, Add items, Close bill, End.

Cleaning, maintenance, and blocked statuses will remain out of the primary filters and should not appear as normal staff workflow choices.

## PS5 Data Model

Add `PS5` to the rentable station type model currently represented by `GameType`.

The existing `ClubTable` model can continue to represent rentable stations. Existing table rows remain unchanged; two new rows will be seeded:

- PS5 1
- PS5 2

Both will use `gameType = PS5` and a `pricingGroup` suitable for console pricing.

This keeps sessions, bills, bill items, audit logs, and pricing rules reusable.

## Rate Management

Add a Rates page where the owner can view and edit hourly rates for:

- Royal Snooker
- Mini Snooker
- Pool
- PS5

Rates are stored as 60-minute `TablePricing` rules. Billing will continue to charge by minutes played from the relevant hourly rate.

Changing a rate only affects new bill calculations after the change. Already closed bills keep their snapshot totals and are not recalculated.

## Owner Dashboard

Add a dashboard page focused on today's business performance.

The dashboard will show:

- Today's total revenue.
- Revenue by source:
  - Snooker/Pool station time
  - PS5 station time
  - Food
  - Cigarettes
  - Beverages
- Busy hours by station:
  - Royal Snooker tables
  - Mini Snooker tables
  - Pool table
  - PS5 stations
- Closed bill count and open bill count.

Revenue should come from closed bills so the owner sees actual completed sales, not estimates. Busy hours should come from completed sessions using their started and ended timestamps.

## Billing Rules

Billing remains minute-based:

- Station charge = hourly rate prorated by bill segment duration.
- Split billing continues by closing the current bill and starting a new bill on the same active session.
- Food-only billing continues through counter bills.
- Menu item prices remain snapshotted into bill items, so old bills are not affected by menu price changes.
- Closed bills keep total snapshots for reporting.

## Seed Data

Seed data should reflect the real venue:

- Two Royal Snooker tables.
- Two Mini Snooker tables.
- One Pool table.
- Two PS5 stations.
- Existing food/menu examples including Water Bottle.
- Hourly rates:
  - Royal Snooker: 350
  - Mini Snooker: 330
  - Pool: 160
  - PS5: 200

The PS5 seed rate is intentionally editable from Rates, so the owner can change it before using the system for real billing.

## Testing

Add or update tests for:

- PS5 appears separately on the live floor.
- PS5 can use the same session lifecycle as tables.
- Rates page updates hourly pricing.
- Rate changes do not mutate closed bill snapshots.
- Dashboard calculates today's category revenue from closed bills.
- Dashboard calculates busy hours from completed sessions.

Manual verification should include starting and ending one PS5 session, editing a rate, adding a food item, and confirming the dashboard updates after closing the bill.

## Out of Scope

This design does not add online customer self-booking, payment gateway integration, staff login screens, inventory deduction, or historical multi-day analytics. Those can be separate follow-up features after the owner dashboard and PS5 support are stable.

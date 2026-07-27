# Menu Billing Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an industry-style counter workflow with editable menu settings, standalone bills, bill segments on table sessions, final totals, live timers, itemized orders, and no cleaning state after ending.

**Architecture:** Introduce `Bill` as the billable unit and keep `Session` as the physical table occupancy unit. `BillItem` stores name, category, unit price, quantity, and line total snapshots so historical bills are not changed by menu price edits. The live table UI reads active sessions with the current open bill, while settings manages active/inactive products.

**Tech Stack:** Next.js App Router, React server actions, Prisma/Postgres, Vitest, Playwright, Tailwind CSS.

## Global Constraints

- Keep the five-table setup: two Royal Snooker, two Mini Snooker, one Pool.
- Rename cafe category display to Food.
- Ended tables return to Available, not Cleaning.
- Old bills must not change when product prices are edited.
- Support bills without a pool/snooker session.

---

### Task 1: Billing Data Model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: `prisma/migrations/<timestamp>_add_bills/migration.sql`
- Test: `tests/unit/prisma-schema.test.ts`

**Interfaces:**
- Produces: `Bill`, `BillItem`, `BillStatus`, `BillKind`.
- Produces: active products seeded with Food, Cigarettes, Beverages, including Water Bottle.

- [ ] Write failing schema tests for `Bill`, `BillItem`, `BillKind`, and `BillStatus`.
- [ ] Run `npm test -- tests/unit/prisma-schema.test.ts` and confirm failure.
- [ ] Add Prisma models and relations.
- [ ] Run `npm run prisma:migrate -- --name add_bills`.
- [ ] Update seed to create Food/Cigarettes/Beverages products and delete bill data on reset.
- [ ] Run schema tests and seed.

### Task 2: Billing Domain

**Files:**
- Modify: `src/server/domain/bill-summary.ts`
- Create: `src/server/domain/bill-segments.ts`
- Test: `tests/unit/bill-summary.test.ts`

**Interfaces:**
- Produces: `summarizeBill({ tableAmount, items })`.
- Produces: `calculateBillSegmentTableAmount({ startedAt, endedAt, hourlyRate })`.

- [ ] Write failing tests for itemized totals and closed segment table amount.
- [ ] Run `npm test -- tests/unit/bill-summary.test.ts` and confirm failure.
- [ ] Implement minimal bill math.
- [ ] Run bill domain tests.

### Task 3: Server Actions And Queries

**Files:**
- Modify: `src/features/live-tables/actions.ts`
- Modify: `src/features/live-tables/queries.ts`
- Modify: `src/features/live-tables/types.ts`
- Modify: `src/features/sessions/schemas.ts`
- Modify: `src/server/services/session-service.ts`
- Test: `tests/integration/session-lifecycle.test.ts`
- Test: `tests/unit/session-schemas.test.ts`

**Interfaces:**
- Produces: `createOrUpdateProductAction`, `deactivateProductAction`.
- Produces: `startCounterBillAction`, `addBillItemAction`, `removeBillItemAction`.
- Produces: `closeBillAndContinueSessionAction`.
- Produces: ending session closes current bill, returns table to Available, and returns final total message.

- [ ] Write failing tests for menu permissions, add item schema, and end-to-available behavior.
- [ ] Run targeted tests and confirm failure.
- [ ] Add actions and query mapping for products, bills, bill items, final totals.
- [ ] Run targeted tests.

### Task 4: Settings Menu Management UI

**Files:**
- Modify: `src/app/(admin)/settings/page.tsx`
- Create: `src/features/settings/menu-settings-page.tsx`
- Create: `src/features/settings/actions.ts`
- Test: `tests/components/settings-page.test.tsx`

**Interfaces:**
- Consumes: product actions from Task 3.
- Produces: UI to add products, edit price, deactivate products.

- [ ] Write failing component test for rendering products and add/update controls.
- [ ] Run component test and confirm failure.
- [ ] Implement settings page and forms.
- [ ] Run settings component test.

### Task 5: Live Counter UI

**Files:**
- Modify: `src/features/live-tables/components/table-card.tsx`
- Modify: `src/features/live-tables/components/live-table-page.tsx`
- Modify: `src/features/live-tables/components/table-grid.tsx`
- Create: `src/features/live-tables/components/live-clock.tsx`
- Create: `src/features/sessions/components/start-counter-bill-dialog.tsx`
- Test: `tests/components/live-table-page.test.tsx`
- Test: `tests/e2e/live-tables.spec.ts`

**Interfaces:**
- Consumes: current bill summary, itemized order lines, elapsed timer, products.
- Produces: appealing POS-style active table cards, current order list, standalone counter bill entry point.

- [ ] Write failing component tests for Food label, elapsed timer, itemized order, final total controls, and counter bill button.
- [ ] Run component tests and confirm failure.
- [ ] Implement visual refresh and dialogs.
- [ ] Run component and e2e tests.

### Task 6: Final Verification

**Files:**
- All touched files.

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test:e2e`.
- [ ] Run `npm run build`.
- [ ] Restart `npm run dev`, verify `curl -I http://localhost:3000/live-tables` returns 200.
- [ ] Commit.

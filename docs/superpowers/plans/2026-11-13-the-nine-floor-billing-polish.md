# The Nine Floor & Billing Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make The Nine's five-table floor and billing screens simple, visually personal, and numerically trustworthy.

**Architecture:** Preserve the existing session, bill, and permission model. Extend the billing query mapping with explicit table-time fields, use the shared bill-summary calculation for open and close paths, and simplify the existing React components rather than introducing a new checkout subsystem.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Vitest, Testing Library, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-11-13-the-nine-floor-billing-polish-design.md`

## Global Constraints

- The default store is The Nine and has exactly five seeded tables.
- The displayed total is table charge plus product total.
- The session's saved hourly rate is authoritative; no hard-coded hourly rate is allowed in billing close logic.
- Franchise/HQ/platform code remains retained and out of the The Nine navigation.
- No new dependencies.

## Review Focus

- Open session bill: live table minutes and charge must be non-zero and use the saved rate.
- Closed bill: stored table amount, duration, items, and grand total must reconcile.
- Counter bill: must show no table-time charge.
- Seed/reset: must remove old PS5/table inventory and recreate the exact five named tables.
- Store shell/settings: Store has no password control, and Settings has no Business Profile editor.

### Task 1: Simplify The Nine inventory and branding

**Files:**
- Modify: `src/server/provisioning/the-nine.ts`
- Test: `tests/unit/the-nine-seed.test.ts`

**Interfaces:**
- Produces the exact table names, game/pricing groups, rates, and store-facing name consumed by the live floor and rates screens.

- [ ] Write failing assertions for the exact five tables, absence of PS5 pricing, and `The Nine Snooker & Cafe` branding.
- [ ] Run the focused seed test and confirm the new assertions fail.
- [ ] Update seed tables/pricing and store name/appName; remove PS5 pricing and preserve Royal/Mini Snooker and Pool rate labels.
- [ ] Run the focused seed test and typecheck.
- [ ] Commit: `feat: align The Nine inventory and branding`.

### Task 2: Correct table-time billing data

**Files:**
- Modify: `src/features/billing/types.ts`
- Modify: `src/features/billing/queries.ts`
- Modify: `src/features/billing/actions.ts`
- Test: `tests/unit/billing-queries.test.ts`
- Test: `tests/unit/bill-summary.test.ts`

**Interfaces:**
- `BillingRecord` produces `tableDurationMinutes`, `tableHourlyRate`, and a reconciled `tableAmount`/`itemTotal`/`totalAmount` for the billing UI.

- [ ] Add failing tests for an open session bill calculating live table charge from its session rate, a closed session exposing duration/rate, and a counter bill having zero table time.
- [ ] Run focused billing tests and confirm failure.
- [ ] Select session rate/timestamps, calculate open table charge from bill opened time to `now`, derive closed duration from bill timestamps, and use the shared bill-summary calculation in the billing close action instead of the hard-coded ₹350 rate.
- [ ] Run focused billing tests and confirm pass.
- [ ] Commit: `fix: reconcile billing with live table time`.

### Task 3: Simplify live floor presentation

**Files:**
- Modify: `src/features/live-tables/components/table-board-toolbar.tsx`
- Modify: `src/features/live-tables/components/live-table-page.tsx`
- Modify: `src/features/live-tables/components/table-card.tsx`
- Modify: `tests/components/live-table-page.test.tsx`

**Interfaces:**
- The live floor consumes the existing `LiveTableCardData` but renders no summary count strip, no PS5 section, and uses the five seeded table names.

- [ ] Add failing component assertions for no Active/Available summary panel, no PS5 heading, and the five The Nine names.
- [ ] Run the focused component test and confirm failure.
- [ ] Remove the summary count/status toolbar content and PS5-specific display branches from the The Nine floor; retain per-table session status/actions and show a compact club image header.
- [ ] Run the focused live-floor tests and typecheck.
- [ ] Commit: `feat: simplify The Nine live floor`.

### Task 4: Redesign billing UI for reconciliation

**Files:**
- Modify: `src/features/billing/components/billing-page.tsx`
- Modify: `src/features/billing/components/billing-table.tsx`
- Modify: `src/features/billing/components/billing-filters.tsx`
- Modify: `tests/components/billing-table.test.tsx`

**Interfaces:**
- The page consumes the extended `BillingPageData` and presents a summary strip plus receipt-like records with an explicit table-time/product/total breakdown.

- [ ] Add failing component assertions for “Table time”, “Items”, “Grand total”, table duration/rate, and The Nine Snooker & Cafe copy.
- [ ] Run the focused component tests and confirm failure.
- [ ] Replace the dense grid with responsive receipt cards, keep expandable detail and filters, and add empty/open/closed states that explain the amount.
- [ ] Run billing component tests and typecheck.
- [ ] Commit: `feat: clarify The Nine billing receipts`.

### Task 5: Remove Store-only controls and expose club imagery

**Files:**
- Modify: `src/components/app/admin-shell.tsx`
- Modify: `src/features/settings/menu-settings-page.tsx`
- Modify: `src/app/(admin)/settings/page.tsx`
- Modify: `tests/components/admin-shell.test.tsx`
- Modify: `tests/components/settings-page.test.tsx` if present, otherwise add focused coverage.

**Interfaces:**
- Store accounts render no Change Password control; Settings renders menu/booking controls without Business Profile; shell imagery uses existing `/the-nine/` assets.

- [ ] Add failing assertions for no Store password link, no Business Profile text, and visible The Nine image source.
- [ ] Run focused component tests and confirm failure.
- [ ] Hide password controls for `STORE_USER`, remove profile editor UI/props from The Nine settings, and add a compact club-photo banner to authenticated store pages.
- [ ] Run focused component tests and typecheck.
- [ ] Commit: `feat: finish The Nine store polish`.

### Task 6: Full verification and local handoff

**Files:**
- Modify: `tests/e2e/the-nine-login.spec.ts`
- Modify: `docs/TESTING_AND_DEMO_SETUP.md`

- [ ] Update browser checks for five tables, no PS5, billing breakdown, and club imagery.
- [ ] Run `npm run typecheck && npx vitest run tests/unit tests/components && npm run build`.
- [ ] Run `npm run test:e2e` against the seeded local PostgreSQL database.
- [ ] Confirm `git diff --check`, working tree status, and local URL/credentials.
- [ ] Commit: `test: verify The Nine floor and billing polish`.

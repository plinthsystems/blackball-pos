# The Nine Single-Store POS Design

## Intent

Turn the current franchise and multi-tenant club-management platform into a minimum viable POS experience for one physical store: The Nine. Preserve the good operational code and tested flows; simplify the default product surface, seed data, and access model around one store with an admin and a store operator.

## Goals

- Operate one store named The Nine from one database.
- Provide two role-based logins: `ADMIN` and `STORE`.
- Let store users manage live tables, sessions, open bills, products, and payments.
- Let admins view sales, revenue, usage analytics, and configure rates/menu/settings.
- Remove the franchise, tenant, HQ, SaaS subscription, royalty, outlet-switching, and demo-account concepts from the product surface.
- Reset development/demo data to a clean The Nine dataset with no inherited franchisees, tenants, or sample stores.
- Preserve the existing stable table/session/bill domain behavior where it supports the minimum POS.
- Keep the existing franchise, booking, payment, and platform code in the repository as dormant capability for possible future use; do not delete working code just to reduce the current navigation.

## Non-goals

- Multi-store or multi-organization behavior in the default The Nine product.
- Franchisee management, royalties, subscriptions, platform provisioning, or outlet switching.
- New online booking, payment-provider integrations, WhatsApp, QR booking, or magic-login work in the first simplified release.
- Customer loyalty, CRM, or advanced inventory/accounting.
- A visual redesign unrelated to simplifying the workflows.

## Anti-goals

- Do not expose franchise/HQ/platform administration to The Nine’s two normal logins.
- Do not seed multiple stores, demo organizations, or shared credentials.
- Do not use development identity fallbacks in the simplified authentication flow.
- Do not delete a configured production database automatically during deploy or startup.

## Constraints

- Keep the current Next.js App Router, TypeScript, Prisma, PostgreSQL, Tailwind, Vitest, and Playwright stack.
- Keep the existing `Business` table as the internal single-store root for the first migration to avoid an unnecessary wholesale rename; all product copy should say “store” and use “The Nine.”
- Existing operational tables, sessions, bills, bill items, products, pricing, and payments are the core domain to retain.
- The current checkout has a generated Prisma client/schema mismatch; schema generation and typecheck must be restored before feature verification.
- Any live data reset must be explicit, backed up where possible, and documented; code changes alone must not assume access to the user’s production database.

## Approaches considered

### 1. Prune the existing SaaS surface

Keep organizations, franchisees, subscriptions, and database-backed permissions, then hide or redirect their routes. This has lower schema migration risk but leaves the main source of complexity in place and makes it easy for old tenant assumptions to reappear.

### 2. Single-store product cutover with preserved code (chosen)

Keep one `Business` row as the store root, seed only that store, and use the existing `STORE_OWNER` and `STORE_USER` account types as the implementation roles displayed as Admin and Store. Keep the current Prisma schema, operational feature modules, permission helpers, and enterprise modules in place, but stop creating enterprise records and remove their links from the normal navigation and first-run flow. This preserves useful code while making the product feel small and focused.

### 3. Rewrite the application from scratch

Create a new minimal POS UI and schema without reusing the current operational domain. This would be the cleanest visual reset but carries the highest risk of reintroducing bugs in table/session/bill behavior and conflicts with the requirement to keep the good code.

## Chosen product behavior

### Authentication

- `/setup` creates The Nine and two initial accounts: one implementation-level `STORE_OWNER` displayed as Admin, and one `STORE_USER` displayed as Store.
- `/login` authenticates email and password against the two roles.
- Admin redirects to `/dashboard`.
- Store redirects to `/live-tables`.
- Admin can access all operational and configuration pages.
- Store can access `/live-tables` and the minimum billing flow; store users cannot access analytics, rates, menu management, or settings.
- Password change remains available to both roles.

### Store operations

- Live floor shows active tables and sessions.
- Store users can start, pause, extend, end sessions, add menu items, and settle bills.
- Rates and products are read-only to store users and managed by admins.
- Existing online booking and external payment flows remain available in code but are not linked from the minimum The Nine navigation or setup flow unless explicitly enabled later.

### Admin dashboard

- Show today’s revenue, closed bills, open bills, and active sessions.
- Show revenue split by table time and menu categories.
- Show daily trend for the selected reporting window (today, last 7 days, last 30 days).
- Show table/game utilization based on completed sessions.
- Scope every query to the single store’s `businessId`.

### Data reset

- Replace the current multi-store seed with one deterministic The Nine seed containing one store, one admin, one store user, a small default table set, default rates, and a small menu. Existing seed helpers that support retained operational behavior may be reused; franchise and SaaS fixture creation should stop.
- Add a documented reset command that requires an explicit confirmation variable and runs in a transaction.
- Never run the reset automatically in production.
- The implementation should not delete any remote data until the target database is explicitly selected and the reset command is run by the operator.

## Implementation boundaries

- Leave franchise/HQ/platform UI, server actions, queries, integrations, and tests in place unless they are actively harmful; remove them from the default The Nine navigation and protect them from normal users.
- Simplify the displayed role labels and authorization path first, using the existing account types and permission checks so dependent operational code stays intact.
- Keep the Prisma schema stable unless a small, clearly justified migration is required; regenerate the client before changing dependent code.
- Update seed/setup/login/dashboard behavior together so the first-run path works with one business and no franchise or organization context.
- Add focused tests for role access, seed shape, reset safety, login redirects, store-operation access, and admin analytics.

## Success criteria

- A fresh database can be initialized for The Nine with exactly one store and exactly two login accounts.
- A store login lands on the live floor and cannot open admin analytics/configuration routes.
- An admin login can see sales, revenue, and analytics and can still operate the store if needed.
- No franchise, tenant, HQ, subscription, royalty, or outlet-switching data is created by seed or setup.
- Typecheck, unit/component tests, and relevant end-to-end flows pass.

## Decisions left to the builder

- Exact table names, starter rates, menu items, and account email placeholders are implementation defaults and should be easy to change in `prisma/seed.ts`.
- Existing operational model names can remain where renaming would create migration noise; user-facing labels must use store language.
- Reporting windows use the store/server local date behavior already established by the project unless a later timezone requirement is added.

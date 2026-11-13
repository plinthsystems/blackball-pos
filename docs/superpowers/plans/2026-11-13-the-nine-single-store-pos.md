# The Nine Single-Store POS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the default BlackBall POS experience into a focused single-store app for The Nine with an Admin login, a Store login, and a minimal role-aware navigation while preserving the existing operational code.

**Architecture:** Keep the current Next.js App Router, Prisma schema, operational feature modules, and permission helpers. Configure one seeded `Business` record named The Nine, use the existing `STORE_OWNER` and `STORE_USER` account types as the two product roles, and make enterprise features dormant rather than deleting their code. The root route redirects directly to login, and the shell renders a small navigation based on the authenticated account type.

**Tech Stack:** Next.js 15 App Router, TypeScript, React 19, Prisma 6, PostgreSQL, Tailwind CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-the-nine-single-store-pos-design.md`

## Global Constraints

- Keep the current Next.js, TypeScript, Prisma, PostgreSQL, Tailwind, Vitest, and Playwright stack.
- Keep the existing `Business` model as the internal single-store root.
- Do not delete working franchise, booking, payment-provider, WhatsApp, QR, platform, or enterprise modules; remove them from the default The Nine surface and protect them from normal users.
- Seed only one store, one Admin account, one Store account, and operational defaults for The Nine.
- Never run destructive reset logic automatically in production.
- Do not commit secrets, print database URLs, or modify a remote database without an explicit operator-run reset command.
- Keep all operational queries scoped to the authenticated `businessId`.

## Review Focus

- Unauthenticated root access should go directly to `/login`, and authenticated users should still land on their correct role destination.
- A Store account must not reach analytics, rates, menu administration, settings, HQ, platform, or demo routes by direct URL.
- An Admin account must retain access to live operations, billing, analytics, rates, menu, and settings.
- A fresh seed must create no franchisees, organizations, subscriptions, royalties, or extra businesses.
- The reset command must refuse to run without an explicit confirmation variable and must leave no partial reset if a transaction fails.

---

### Task 1: Reproduce the project and restore the generated Prisma client

**Files:**
- Modify: `package-lock.json` only if dependency installation updates it
- Generate: `node_modules/.prisma/client` and `node_modules/@prisma/client` locally
- Test: existing typecheck and unit/component suites

**Interfaces:**
- Consumes: current `package.json`, `package-lock.json`, and `prisma/schema.prisma`
- Produces: a clean local dependency install and a generated Prisma client matching the checked-in schema

- [ ] **Step 1: Install locked dependencies in the repository checkout**

Run: `npm ci`

Expected: install completes without changing application source files.

- [ ] **Step 2: Generate Prisma client from the checked-in schema**

Run: `npx prisma generate`

Expected: generated client includes fields used by the current source, including `mustChangePassword`, active tables, booking configuration, and payment fields.

- [ ] **Step 3: Run the current typecheck and unit/component suites**

Run: `npm run typecheck && npx vitest run tests/unit tests/components`

Expected: record any source-level failures separately from the previously observed generated-client/dependency failures; do not claim a clean baseline until the actual output is known.

- [ ] **Step 4: Commit the baseline dependency/client repair only if tracked files changed**

```bash
git add package-lock.json
git commit -m "chore: restore reproducible prisma client setup"
```

### Task 2: Simplify setup, seed data, and explicit reset

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `src/app/setup/page.tsx`
- Create: `scripts/reset-the-nine.ts`
- Modify: `.env.example`
- Test: `tests/unit/platform-actions.test.ts` or a new `tests/unit/the-nine-seed.test.ts`

**Interfaces:**
- Consumes: `hashPassword`, current Prisma models, and existing setup route
- Produces: one deterministic The Nine setup path, one Admin account, one Store account, and an explicit reset command guarded by `RESET_THE_NINE=true`

- [ ] **Step 1: Add failing tests for the single-store seed contract**

Assert that the seed configuration contains the store name `The Nine`, exactly two product accounts using `STORE_OWNER` and `STORE_USER`, and no franchise/HQ/platform fixture creation.

- [ ] **Step 2: Add failing tests for reset safety**

Assert that the reset entry point throws when `RESET_THE_NINE` is not exactly `true`, and that the reset operation is represented as one transaction.

- [ ] **Step 3: Refactor `prisma/seed.ts` to seed only The Nine operational defaults**

Keep the existing table, pricing, product, role, and permission patterns where useful, but remove calls that create multiple organizations, franchisees, subscriptions, royalty data, or multiple businesses. Seed one business named `The Nine`, one implementation `STORE_OWNER` admin, and one `STORE_USER` store account with configurable emails/passwords documented in `.env.example`.

- [ ] **Step 4: Implement `scripts/reset-the-nine.ts`**

Expose `resetTheNine()` and run it from the CLI only when `RESET_THE_NINE=true`. Delete dependent operational rows in a Prisma transaction, then create the single The Nine seed. Do not call this script from app startup, build, or deploy hooks.

- [ ] **Step 5: Update first-run setup to create one business and two accounts**

Make `/setup` create the The Nine business, settings, Admin account, Store account, and the minimum role/permission records required by retained operational actions. Do not create an organization, franchisee, subscription, royalty rule, or platform admin.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npx vitest run tests/unit/the-nine-seed.test.ts tests/unit/platform-actions.test.ts && npm run typecheck`

Expected: the seed/setup contract passes and no new type errors are introduced.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed.ts scripts/reset-the-nine.ts src/app/setup/page.tsx .env.example tests/unit
git commit -m "feat: seed and reset a single The Nine store"
```

### Task 3: Make authentication explicitly two-role for The Nine

**Files:**
- Modify: `src/server/auth/current-employee.ts`
- Modify: `src/server/auth/authorization.ts`
- Modify: `src/server/auth/routes.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/login/LoginForm.tsx`
- Modify: `src/middleware.ts`
- Test: `tests/unit/auth-routes.test.ts`, `tests/unit/middleware.test.ts`, and relevant login component tests

**Interfaces:**
- Consumes: seeded `STORE_OWNER` and `STORE_USER` accounts and existing signed session tokens
- Produces: role labels and redirects that present `STORE_OWNER` as Admin and `STORE_USER` as Store, while retaining the existing secure password/session implementation

- [ ] **Step 1: Add failing tests for login redirects and role labels**

Assert that `STORE_OWNER` redirects to `/dashboard`, `STORE_USER` redirects to `/live-tables`, and neither role is presented as franchise/HQ/platform in the normal login flow.

- [ ] **Step 2: Add failing authorization tests for normal-role route access**

Assert that Store lacks `dashboard.read`, `rates.manage`, `products.manage`, and `settings.update`, while Admin retains them and both roles retain live-table/session/billing permissions needed for operations.

- [ ] **Step 3: Update permission construction and default routes**

Keep the existing permission strings used by feature actions, but make the role-to-permission mapping deterministic for the two seeded roles. Keep enterprise permissions only for legacy account types so retained code remains compilable but is not granted to The Nine accounts.

- [ ] **Step 4: Update login copy and role-aware redirect behavior**

Change the login page copy to The Nine and “Admin or Store login,” remove SaaS/franchise language, and preserve secure email/password authentication and rate limiting.

- [ ] **Step 5: Protect dormant enterprise/demo routes from normal users**

Keep their source code, but ensure middleware/page authorization prevents The Nine Admin and Store accounts from using `/hq`, `/platform`, and `/demo` directly.

- [ ] **Step 6: Run focused auth tests**

Run: `npx vitest run tests/unit/auth-routes.test.ts tests/unit/middleware.test.ts tests/components/admin-shell.test.tsx`

Expected: all role redirect and access assertions pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/auth src/app/api/auth/login src/app/login src/middleware.ts tests
git commit -m "feat: simplify The Nine authentication to admin and store"
```

### Task 4: Add the direct login entry and minimal navigation

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/app/admin-shell.tsx`
- Modify: `src/components/app/store-switcher.tsx` only if needed to remove empty enterprise context
- Modify: `src/components/app/demo-account-switcher.tsx` only if needed to keep it dormant
- Modify: `src/styles/globals.css` only if the simplified shell needs existing shared styles
- Test: `tests/components/root-layout.test.tsx`, `tests/components/admin-shell.test.tsx`

**Interfaces:**
- Consumes: `CurrentEmployeeContext.accountType` and permission map from Task 3
- Produces: a root URL that lands on login and two small navigation sets without deleting existing feature pages

- [ ] **Step 1: Add failing tests for root redirect and role-aware nav**

Assert that `/` redirects or links directly to `/login`; Store navigation contains Live Floor and Billing only; Admin navigation contains Dashboard, Live Floor, Billing, Menu, Rates, and Settings; neither normal role sees HQ, Platform Setup, Franchise, or store switching.

- [ ] **Step 2: Implement the root-to-login entry**

Replace the current landing surface with a server redirect to `/login`, while keeping `/login` as the single entry point.

- [ ] **Step 3: Simplify `AdminShell` navigation**

Use explicit account-type nav groups rather than exposing the full enterprise permission list. Keep links to existing pages and keep logout/password actions available. Display `STORE_OWNER` as “Admin” and `STORE_USER` as “Store.”

- [ ] **Step 4: Remove empty enterprise controls from the normal shell**

Render no store switcher when the account has only The Nine, and do not render demo-account controls in the default product shell.

- [ ] **Step 5: Run focused component tests**

Run: `npx vitest run tests/components/root-layout.test.tsx tests/components/admin-shell.test.tsx`

Expected: direct login entry and both navigation variants pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components/app tests/components
git commit -m "feat: add direct login and minimal role navigation"
```

### Task 5: Preserve and clarify admin analytics

**Files:**
- Modify: `src/features/dashboard/queries.ts`
- Modify: `src/features/dashboard/types.ts`
- Modify: `src/features/dashboard/components/owner-dashboard-page.tsx`
- Modify: `src/app/(admin)/dashboard/page.tsx`
- Test: `tests/unit/owner-dashboard.test.ts`, `tests/components/owner-dashboard-page.test.tsx`

**Interfaces:**
- Consumes: existing closed bills, bill items, completed sessions, and authenticated business scope
- Produces: an Admin dashboard showing sales, revenue, and usage analytics without changing the underlying bill/session domain

- [ ] **Step 1: Add failing analytics tests**

Assert today’s total revenue, closed/open bill counts, category totals, completed-session utilization, and a bounded daily trend for the selected reporting window.

- [ ] **Step 2: Extend dashboard query/types with a small reporting window**

Support `today`, `7d`, and `30d` windows with all Prisma filters scoped to `businessId`; keep current today metrics backward compatible.

- [ ] **Step 3: Update the dashboard copy and layout**

Rename the page to “The Nine Admin,” retain existing revenue/category cards, and add compact sales trend and utilization sections. Avoid introducing a chart library; use the existing styled rows/bars and current formatting helpers.

- [ ] **Step 4: Keep Store accounts out of the admin dashboard**

Preserve the existing permission redirect so Store users land on Live Floor.

- [ ] **Step 5: Run focused analytics tests**

Run: `npx vitest run tests/unit/owner-dashboard.test.ts tests/components/owner-dashboard-page.test.tsx`

Expected: analytics calculations and role behavior pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard "src/app/(admin)/dashboard" tests/unit/owner-dashboard.test.ts tests/components/owner-dashboard-page.test.tsx
git commit -m "feat: focus admin dashboard on The Nine analytics"
```

### Task 6: Verify both end-to-end journeys and document the safe reset

**Files:**
- Modify: `tests/e2e/dashboard-rates.spec.ts` or add `tests/e2e/the-nine-login.spec.ts`
- Modify: `docs/TESTING_AND_DEMO_SETUP.md`
- Modify: `docs/DEPLOYMENT_GUIDE.md` only where current seed/reset instructions are now incorrect
- Modify: `README.md` if one exists; otherwise create a short root README

**Interfaces:**
- Consumes: completed setup, auth, navigation, seed, and dashboard behavior from Tasks 1–5
- Produces: verified browser journeys and operator-facing instructions for initializing/resetting The Nine

- [ ] **Step 1: Add end-to-end coverage for the Admin journey**

Log in as Admin, assert dashboard visibility for revenue/sales/analytics, visit Live Floor, and assert minimal navigation labels.

- [ ] **Step 2: Add end-to-end coverage for the Store journey**

Log in as Store, assert redirect to Live Floor, assert session/billing controls are available, and assert direct dashboard/rates/settings/HQ/platform access is blocked or redirected.

- [ ] **Step 3: Document the two accounts and reset command without hard-coded production secrets**

Document environment-driven credentials, `RESET_THE_NINE=true`, backup expectations, and the fact that production reset is operator-run only.

- [ ] **Step 4: Run the full relevant verification suite**

Run: `npm run typecheck && npx vitest run tests/unit tests/components && npm run test:e2e`

Expected: typecheck and unit/component tests pass; e2e either passes or reports only environment-specific failures with their exact output.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e docs README.md
git commit -m "test: verify The Nine single-store login journeys"
```

## Self-review

- Spec coverage: single-store seed/reset, two roles, direct login entry, minimal navigation, preserved operational code, admin analytics, protected enterprise routes, and verification are covered by Tasks 2–6.
- Type consistency: the plan keeps existing `STORE_OWNER`, `STORE_USER`, `businessId`, and permission strings so neighboring tasks use existing interfaces.
- Review focus: each stated failure mode has a test in Tasks 2–6.
- Proportion: the plan changes the product surface and seed/auth behavior without prescribing a rewrite of retained feature modules.

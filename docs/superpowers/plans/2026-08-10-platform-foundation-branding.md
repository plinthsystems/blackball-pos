# Platform Foundation Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first production foundation for SaaS/franchise hierarchy while replacing the weak tenant branding controls with a cleaner business profile experience.

**Architecture:** Keep the existing Next.js/Prisma monolith and extend the current `Organization -> Business` model with franchisee, subscription, and royalty entities. Access resolution remains centralized in `src/server/auth/current-employee.ts`, with UI reading the resulting scoped context.

**Tech Stack:** Next.js App Router, React, Prisma, PostgreSQL, Vitest, TypeScript, Tailwind CSS.

## Global Constraints

- Do not rewrite the POS/live-table workflow.
- Keep all store-level data scoped by `businessId`.
- Add franchisee scope without allowing franchisees to see unrelated outlets.
- Keep one polished gaming software theme; tenant branding should be subtle identity, not full theme chaos.
- Store price and billing snapshots must remain immutable for historical bills.

---

### Task 1: Platform Schema And Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260810190000_platform_foundation/migration.sql`
- Modify: `tests/unit/prisma-schema.test.ts`

**Interfaces:**
- Produces: `Franchisee`, `SubscriptionPlan`, `Subscription`, `RoyaltyRule`, `RoyaltyInvoice`
- Produces: `Employee.franchiseeId`, `Business.franchiseeId`

- [ ] Add failing schema tests that assert all new models and relations exist.
- [ ] Add Prisma schema models and relations.
- [ ] Add SQL migration that creates missing enum values safely and adds new tables.
- [ ] Run `npm test -- tests/unit/prisma-schema.test.ts`.

### Task 2: Access Context Scoping

**Files:**
- Modify: `src/server/auth/current-employee.ts`
- Modify: `tests/unit/current-employee.test.ts`

**Interfaces:**
- Produces: `CurrentEmployeeContext.scope` with `organizationId`, `franchiseeId`, `businessIds`, and `selectedBusinessId`
- Preserves: `CurrentEmployeeContext.businessId`

- [ ] Add failing tests for HQ seeing all organization outlets, franchisee owner seeing only their outlets, and store user seeing one outlet.
- [ ] Update employee query to include franchisee and scoped businesses.
- [ ] Build selected business only from allowed businesses.
- [ ] Run `npm test -- tests/unit/current-employee.test.ts`.

### Task 3: Seed Demo Franchisees And Plans

**Files:**
- Modify: `prisma/seed.ts`
- Test through Prisma seed command

**Interfaces:**
- Consumes: new Prisma models from Task 1
- Produces: demo BlackBall franchisees and SaaS subscription plans

- [ ] Assign existing franchise outlets to named franchisees.
- [ ] Add sample subscription plans for Starter, Professional, Multi-Outlet, and Franchise.
- [ ] Add royalty rules for franchise organizations.
- [ ] Run `DATABASE_URL=... npm run prisma:seed` against the branch demo database.

### Task 4: Business Profile Branding UI

**Files:**
- Modify: `src/features/settings/menu-settings-page.tsx`
- Modify: `src/features/settings/actions.ts`
- Modify: `src/components/app/admin-shell.tsx`
- Modify: `src/server/auth/current-employee.ts`
- Modify: `tests/components/settings-page.test.tsx`

**Interfaces:**
- Produces: a “Business Profile” section separate from menu management
- Preserves: `updateBrandingAction`

- [ ] Add failing component test for Business Profile copy and absence of raw “Brand color” control wording.
- [ ] Replace the current branding card with a polished identity/profile card.
- [ ] Keep optional accent choice compact and preview-based.
- [ ] Rename the settings page heading to separate profile and food menu responsibilities.
- [ ] Run `npm test -- tests/components/settings-page.test.tsx`.

### Task 5: Verification

**Files:**
- Existing test files only

- [ ] Run focused unit/component tests for schema, context, settings, auth, dashboard, and live tables.
- [ ] Run `npm run typecheck`.
- [ ] Generate Prisma Client.
- [ ] Start app locally against `club_management_auth_hq_demo`.
- [ ] Verify `/magic-login`, `/dashboard`, `/hq/dashboard`, `/settings`, and `/live-tables` respond.

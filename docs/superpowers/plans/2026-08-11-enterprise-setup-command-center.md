# Enterprise Setup Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/platform/setup` into an enterprise-grade command center that clearly explains SaaS, owned outlet, and franchise setup models.

**Architecture:** Keep the current backend and server actions. Expand the route query with simple entity counts, then rebuild `PlatformSetupPage` as a structured command center with operating models, hierarchy/data scope, setup playbooks, and login guidance. Tests assert the business model and role boundaries are visible.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Prisma, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Reuse `createSaasSetupAction` and `createFranchiseSetupAction`.
- Reuse current props for subscription plans and organizations.
- Add franchisee and outlet counts only if simple.
- Do not add new database models.
- The page should feel like enterprise setup software, not a simple demo form.
- Avoid vague phrases like “self telling system” without operational meaning.

---

### Task 1: Add Platform Setup Summary Data

**Files:**
- Modify: `src/app/(admin)/platform/setup/page.tsx`
- Modify: `src/features/platform/components/platform-setup-page.tsx`
- Test: `tests/components/platform-setup-page.test.tsx`

**Interfaces:**
- Consumes: existing Prisma models `subscriptionPlan`, `organization`, `franchisee`, and `business`.
- Produces: `PlatformSetupSummary` type:

```ts
export type PlatformSetupSummary = {
  organizations: number;
  franchisees: number;
  outlets: number;
  plans: number;
};
```

- `PlatformSetupPage` receives `summary?: PlatformSetupSummary`.

- [ ] **Step 1: Write the failing test**

Update `tests/components/platform-setup-page.test.tsx` to pass:

```tsx
summary={{ organizations: 5, franchisees: 4, outlets: 8, plans: 4 }}
```

Add expectations:

```tsx
expect(screen.getByText("Enterprise Setup Command Center")).toBeInTheDocument();
expect(screen.getByText("Organizations")).toBeInTheDocument();
expect(screen.getByText("Franchisees")).toBeInTheDocument();
expect(screen.getByText("Outlets")).toBeInTheDocument();
expect(screen.getByText("Plans")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/components/platform-setup-page.test.tsx
```

Expected: fail because the component does not expose the new title/summary.

- [ ] **Step 3: Add route counts**

Update `src/app/(admin)/platform/setup/page.tsx`:

```ts
const [plans, organizations, franchiseeCount, outletCount] = await Promise.all([
  prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: [{ baseAmount: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, baseAmount: true }
  }),
  prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, type: true }
  }),
  prisma.franchisee.count(),
  prisma.business.count()
]);
```

Pass:

```tsx
summary={{
  organizations: organizations.length,
  franchisees: franchiseeCount,
  outlets: outletCount,
  plans: plans.length
}}
```

- [ ] **Step 4: Add summary type**

Update `src/features/platform/components/platform-setup-page.tsx` with the `PlatformSetupSummary` type and optional prop.

- [ ] **Step 5: Run test to verify it passes after Task 2 implementation**

Task 1’s test will fully pass after Task 2 rebuilds visible UI.

### Task 2: Rebuild Platform Setup As Enterprise Command Center

**Files:**
- Modify: `src/features/platform/components/platform-setup-page.tsx`
- Test: `tests/components/platform-setup-page.test.tsx`

**Interfaces:**
- Consumes: `PlatformSetupPage` props from Task 1.
- Produces: visible sections:
  - `Enterprise Setup Command Center`
  - `Operating models`
  - `Hierarchy and data scope`
  - `Setup playbooks`
  - `Demo and login guide`

- [ ] **Step 1: Write the failing test**

Update `tests/components/platform-setup-page.test.tsx` expectations:

```tsx
expect(screen.getByText("Sell as SaaS")).toBeInTheDocument();
expect(screen.getByText("Manage owned outlets")).toBeInTheDocument();
expect(screen.getByText("Run franchise network")).toBeInTheDocument();
expect(screen.getByText("Platform Owner -> Organization/Brand -> Franchisee -> Outlet -> Store Team")).toBeInTheDocument();
expect(screen.getByText("Platform Admin")).toBeInTheDocument();
expect(screen.getByText("Franchise HQ")).toBeInTheDocument();
expect(screen.getByText("Franchisee Owner")).toBeInTheDocument();
expect(screen.getByText("Store Owner / Manager")).toBeInTheDocument();
expect(screen.getByText("Staff")).toBeInTheDocument();
expect(screen.getByText("What this creates")).toBeInTheDocument();
expect(screen.getByText("Demo and login guide")).toBeInTheDocument();
```

Keep existing form label/button expectations:

```tsx
expect(screen.getByLabelText("Club or brand name")).toBeInTheDocument();
expect(screen.getByLabelText("Owner email")).toBeInTheDocument();
expect(screen.getByLabelText("Royalty percent")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Create SaaS setup" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Create franchise setup" })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/components/platform-setup-page.test.tsx
```

Expected: fail because the new command-center labels are not present.

- [ ] **Step 3: Rebuild top summary**

Replace the current hero with:

```tsx
<h1>Enterprise Setup Command Center</h1>
<p>Configure tenants, outlets, roles, subscriptions, and franchise rules from one place.</p>
```

Render four metrics from `summary`.

- [ ] **Step 4: Add operating model cards**

Add three cards:

```ts
const operatingModels = [
  {
    title: "Sell as SaaS",
    owner: "Independent club owner",
    creates: "Organization, outlet, owner login, staff login, subscription",
    visibility: "Tenant sees only their own club data",
    action: "Create SaaS club"
  },
  {
    title: "Manage owned outlets",
    owner: "Your own brand or cafe group",
    creates: "One organization with multiple outlets and store teams",
    visibility: "Owner compares outlets; staff stay outlet-scoped",
    action: "Create SaaS club, then add more outlets"
  },
  {
    title: "Run franchise network",
    owner: "Franchisor and franchisees",
    creates: "Franchise brand, franchisee, outlet, royalty rule, subscription",
    visibility: "HQ sees network; franchisee sees assigned outlets",
    action: "Create franchise outlet"
  }
];
```

- [ ] **Step 5: Add hierarchy and access matrix**

Render the exact hierarchy text:

```tsx
Platform Owner -> Organization/Brand -> Franchisee -> Outlet -> Store Team
```

Render access rows:

```ts
[
  ["Platform Admin", "All tenants, plans, subscriptions, setup actions"],
  ["Franchise HQ", "All outlets inside their franchise organization"],
  ["Franchisee Owner", "Only outlets attached to their franchisee account"],
  ["Store Owner / Manager", "Assigned outlet or organization stores"],
  ["Staff", "Live floor, billing, food items, and daily operations"]
]
```

- [ ] **Step 6: Reframe forms as setup playbooks**

Keep both forms, but wrap each with:

```tsx
<h2>Setup playbooks</h2>
<h3>Create SaaS club</h3>
<h3>Create franchise outlet</h3>
<h4>What this creates</h4>
```

SaaS checklist:

- Independent tenant organization
- First outlet with default tables
- Store owner login
- Optional staff login
- Subscription plan
- Default rates and Food/Menu items

Franchise checklist:

- Franchise brand organization
- Franchisee account
- Outlet scoped to franchisee
- Franchisee owner login
- Subscription plan
- Royalty rule

- [ ] **Step 7: Add demo and login guide**

Render:

```tsx
<h2>Demo and login guide</h2>
```

Rows:

- Platform Admin creates tenants and rollout structure.
- Owner receives email login and default password `Password@123`.
- Owner updates branding, rates, tables, and Food/Menu.
- Staff runs sessions, orders, and billing from the live floor.

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm test -- tests/components/platform-setup-page.test.tsx tests/components/admin-shell.test.tsx tests/unit/auth-routes.test.ts
```

Expected: pass.

- [ ] **Step 9: Run verification**

Run:

```bash
npm run typecheck
npm test -- tests/unit/prisma-schema.test.ts tests/components/platform-setup-page.test.tsx
```

Expected: pass.

- [ ] **Step 10: Commit**

```bash
git add src/app/(admin)/platform/setup/page.tsx src/features/platform/components/platform-setup-page.tsx tests/components/platform-setup-page.test.tsx docs/superpowers/plans/2026-08-11-enterprise-setup-command-center.md
git commit -m "feat: redesign enterprise setup command center"
```

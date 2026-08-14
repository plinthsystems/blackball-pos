# Owner Dashboard, PS5, Rates, and UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clearer owner/operator experience with a daily dashboard, two PS5 stations, editable hourly rates, and a refreshed live floor UI.

**Architecture:** Keep one shared rentable-station engine by extending `GameType` with `PS5` and continuing to use `ClubTable`, `Session`, `Bill`, and `TablePricing`. Add focused query modules for dashboard and rate settings, then compose them through new admin pages and refreshed components. Reporting reads closed bill snapshots and completed sessions so historical bills remain stable.

**Tech Stack:** Next.js App Router, React Server Components, server actions, Prisma, PostgreSQL, Tailwind CSS, Vitest, Testing Library, Playwright.

## Global Constraints

- PS5 appears in its own visual section but uses the same session, timer, bill, menu item, split bill, and reporting engine as snooker and pool.
- Owner reports include PS5 as its own revenue and busy-hours category.
- Rates are stored as 60-minute `TablePricing` rules.
- Billing continues to charge by minutes played from the relevant hourly rate.
- Changing a rate only affects new bill calculations after the change.
- Closed bills keep their snapshot totals and are not recalculated.
- Seed rates: Royal Snooker 350, Mini Snooker 330, Pool 160, PS5 200.
- Primary admin areas: Dashboard, Live Floor, Food/Menu, Rates.
- Cleaning, maintenance, and blocked statuses stay out of primary filters and normal staff workflow choices.

---

## File Structure

- Modify `prisma/schema.prisma`: add `PS5` to `GameType`.
- Create `prisma/migrations/20260804120000_add_ps5_station_type/migration.sql`: alter the Postgres enum to include `PS5`.
- Modify `prisma/seed.ts`: seed two PS5 stations and PS5 hourly pricing.
- Modify `src/features/live-tables/types.ts`: include `PS5`, add hourly rate and station grouping helpers.
- Modify `src/features/live-tables/queries.ts`: include PS5 stations and expose current hourly rate on each card.
- Modify `src/features/live-tables/actions.ts`: allow PS5 in bill closing logic.
- Modify `src/features/live-tables/components/live-table-page.tsx`: add summary strip and grouped live floor sections.
- Modify `src/features/live-tables/components/table-card.tsx`: refresh station card copy and PS5 labels.
- Modify `src/features/live-tables/components/table-grid.tsx`: support grouped sections or become a small wrapper around the new grouping.
- Modify `src/components/app/admin-shell.tsx`: update navigation to Dashboard, Live Floor, Food/Menu, Rates.
- Create `src/features/dashboard/types.ts`: dashboard view model types.
- Create `src/features/dashboard/queries.ts`: owner dashboard calculations from closed bills and completed sessions.
- Create `src/features/dashboard/components/owner-dashboard-page.tsx`: dashboard UI.
- Create `src/app/(admin)/dashboard/page.tsx`: dashboard route.
- Modify `src/app/page.tsx`: redirect to `/dashboard` or link there as the default admin entry.
- Create `src/features/rates/types.ts`: rate settings types.
- Create `src/features/rates/queries.ts`: fetch editable hourly rates.
- Create `src/features/rates/actions.ts`: update hourly rate server action.
- Create `src/features/rates/components/rates-page.tsx`: rates UI.
- Create `src/app/(admin)/rates/page.tsx`: rates route.
- Modify `src/app/(admin)/settings/page.tsx` and `src/features/settings/menu-settings-page.tsx`: rename visible settings area to Food/Menu.
- Modify `src/features/sessions/schemas.ts`: add `rateFormSchema` and include PS5 where needed.
- Update tests under `tests/unit`, `tests/components`, `tests/integration`, and `tests/e2e`.

---

### Task 1: Add PS5 as a Rentable Station Type

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260804120000_add_ps5_station_type/migration.sql`
- Modify: `prisma/seed.ts`
- Modify: `src/features/live-tables/types.ts`
- Modify: `src/features/live-tables/actions.ts`
- Test: `tests/unit/prisma-schema.test.ts`
- Test: `tests/integration/session-lifecycle.test.ts`

**Interfaces:**
- Consumes: existing `ClubTable`, `Session`, `Bill`, and `TablePricing` models.
- Produces: `GameType = "POOL" | "SNOOKER" | "PS5"` across Prisma and `LiveTableGameType`.

- [ ] **Step 1: Write failing schema and seed tests**

Update `tests/unit/prisma-schema.test.ts`:

```ts
it("models PS5 as a rentable station type", () => {
  expect(schema).toMatch(/enum GameType\s+\{[\s\S]*POOL[\s\S]*SNOOKER[\s\S]*PS5[\s\S]*\}/);
});
```

Update the first test in `tests/integration/session-lifecycle.test.ts` so it expects seven stations and PS5 pricing:

```ts
expect(tables.map((table) => table.number).sort()).toEqual([
  "Mini Snooker 1",
  "Mini Snooker 2",
  "PS5 1",
  "PS5 2",
  "Pool Table 1",
  "Royal Snooker 1",
  "Royal Snooker 2"
]);
expect(pricing.map((rule) => `${rule.gameType}:${rule.pricingGroup}:${Number(rule.priceAmount)}`).sort()).toEqual([
  "POOL:standard:160",
  "PS5:standard:200",
  "SNOOKER:mini:330",
  "SNOOKER:royal:350"
]);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test tests/unit/prisma-schema.test.ts tests/integration/session-lifecycle.test.ts`

Expected: FAIL because `PS5` is absent from `GameType` and seed data has only five tables.

- [ ] **Step 3: Implement minimal schema, migration, seed, and type changes**

In `prisma/schema.prisma`:

```prisma
enum GameType {
  POOL
  SNOOKER
  PS5
}
```

Create `prisma/migrations/20260804120000_add_ps5_station_type/migration.sql`:

```sql
ALTER TYPE "GameType" ADD VALUE IF NOT EXISTS 'PS5';
```

In `prisma/seed.ts`, add PS5 stations:

```ts
const desiredTables = [
  { number: "Royal Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "royal" },
  { number: "Royal Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "royal" },
  { number: "Mini Snooker 1", gameType: GameType.SNOOKER, pricingGroup: "mini" },
  { number: "Mini Snooker 2", gameType: GameType.SNOOKER, pricingGroup: "mini" },
  { number: "Pool Table 1", gameType: GameType.POOL, pricingGroup: "standard" },
  { number: "PS5 1", gameType: GameType.PS5, pricingGroup: "standard" },
  { number: "PS5 2", gameType: GameType.PS5, pricingGroup: "standard" }
];
```

Add PS5 pricing:

```ts
{ gameType: GameType.PS5, pricingGroup: "standard", durationMinutes: 60, priceAmount: "200.00" }
```

In `src/features/live-tables/types.ts`:

```ts
export type LiveTableGameType = "POOL" | "SNOOKER" | "PS5";
```

In `src/features/live-tables/actions.ts`, update the `closeBill` input type:

```ts
gameType: "POOL" | "SNOOKER" | "PS5",
```

- [ ] **Step 4: Generate Prisma client and reseed local database**

Run: `npx prisma generate`

Run: `npx prisma migrate dev`

Run: `npm run prisma:seed`

Expected: migration applies, Prisma client regenerates, seed prints `Seeded Pool & Snooker Cafe with owner owner@cueclub.example`.

- [ ] **Step 5: Run tests to verify PS5 model passes**

Run: `npm test tests/unit/prisma-schema.test.ts tests/integration/session-lifecycle.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts src/features/live-tables/types.ts src/features/live-tables/actions.ts tests/unit/prisma-schema.test.ts tests/integration/session-lifecycle.test.ts
git commit -m "feat: add ps5 rentable stations"
```

---

### Task 2: Add Owner Dashboard Query Layer

**Files:**
- Create: `src/features/dashboard/types.ts`
- Create: `src/features/dashboard/queries.ts`
- Test: `tests/unit/owner-dashboard.test.ts`

**Interfaces:**
- Consumes: Prisma client records from `Bill`, `BillItem`, `Session`, and `ClubTable`.
- Produces:
  - `OwnerDashboardData`
  - `buildOwnerDashboardData(input: BuildOwnerDashboardInput): OwnerDashboardData`
  - `getOwnerDashboardData(businessId: string, now?: Date): Promise<OwnerDashboardData>`

- [ ] **Step 1: Write failing dashboard unit tests**

Create `tests/unit/owner-dashboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildOwnerDashboardData } from "@/features/dashboard/queries";

describe("buildOwnerDashboardData", () => {
  it("summarizes today's closed bill revenue by station and product category", () => {
    const data = buildOwnerDashboardData({
      now: new Date("2026-08-04T15:00:00.000Z"),
      bills: [
        {
          id: "bill_snooker",
          kind: "SESSION",
          status: "CLOSED",
          closedAt: new Date("2026-08-04T10:30:00.000Z"),
          tableAmountSnapshot: 175,
          itemTotalAmountSnapshot: 60,
          totalAmountSnapshot: 235,
          session: { table: { gameType: "SNOOKER", pricingGroup: "royal", number: "Royal Snooker 1" } },
          items: [{ category: "FOOD", lineTotalAmount: 40 }, { category: "BEVERAGES", lineTotalAmount: 20 }]
        },
        {
          id: "bill_ps5",
          kind: "SESSION",
          status: "CLOSED",
          closedAt: new Date("2026-08-04T12:00:00.000Z"),
          tableAmountSnapshot: 100,
          itemTotalAmountSnapshot: 20,
          totalAmountSnapshot: 120,
          session: { table: { gameType: "PS5", pricingGroup: "standard", number: "PS5 1" } },
          items: [{ category: "CIGARETTES", lineTotalAmount: 20 }]
        },
        {
          id: "bill_counter",
          kind: "COUNTER",
          status: "CLOSED",
          closedAt: new Date("2026-08-04T13:00:00.000Z"),
          tableAmountSnapshot: 0,
          itemTotalAmountSnapshot: 80,
          totalAmountSnapshot: 80,
          session: null,
          items: [{ category: "FOOD", lineTotalAmount: 80 }]
        }
      ],
      sessions: [],
      openBillCount: 2
    });

    expect(data.totalRevenue).toBe(435);
    expect(data.revenue.stationTime).toBe(275);
    expect(data.revenue.ps5Time).toBe(100);
    expect(data.revenue.food).toBe(120);
    expect(data.revenue.cigarettes).toBe(20);
    expect(data.revenue.beverages).toBe(20);
    expect(data.closedBillCount).toBe(3);
    expect(data.openBillCount).toBe(2);
  });

  it("summarizes completed busy hours by station group", () => {
    const data = buildOwnerDashboardData({
      now: new Date("2026-08-04T15:00:00.000Z"),
      bills: [],
      openBillCount: 0,
      sessions: [
        {
          id: "s1",
          startedAt: new Date("2026-08-04T09:00:00.000Z"),
          actualEndAt: new Date("2026-08-04T10:30:00.000Z"),
          table: { number: "Royal Snooker 1", gameType: "SNOOKER", pricingGroup: "royal" }
        },
        {
          id: "s2",
          startedAt: new Date("2026-08-04T10:00:00.000Z"),
          actualEndAt: new Date("2026-08-04T12:00:00.000Z"),
          table: { number: "PS5 1", gameType: "PS5", pricingGroup: "standard" }
        }
      ]
    });

    expect(data.busyHours).toEqual([
      { label: "Royal Snooker", hours: 1.5 },
      { label: "Mini Snooker", hours: 0 },
      { label: "Pool", hours: 0 },
      { label: "PS5", hours: 2 }
    ]);
  });
});
```

- [ ] **Step 2: Run dashboard tests to verify they fail**

Run: `npm test tests/unit/owner-dashboard.test.ts`

Expected: FAIL because `src/features/dashboard/queries.ts` does not exist.

- [ ] **Step 3: Implement dashboard types**

Create `src/features/dashboard/types.ts`:

```ts
export type DashboardRevenue = {
  stationTime: number;
  ps5Time: number;
  food: number;
  cigarettes: number;
  beverages: number;
};

export type BusyHoursRow = {
  label: "Royal Snooker" | "Mini Snooker" | "Pool" | "PS5";
  hours: number;
};

export type OwnerDashboardData = {
  totalRevenue: number;
  revenue: DashboardRevenue;
  busyHours: BusyHoursRow[];
  closedBillCount: number;
  openBillCount: number;
};
```

- [ ] **Step 4: Implement dashboard query builder and Prisma query**

Create `src/features/dashboard/queries.ts` with:

```ts
import { prisma } from "@/server/db/prisma";
import type { OwnerDashboardData } from "./types";

type DashboardBill = {
  id: string;
  kind: "SESSION" | "COUNTER";
  status: "CLOSED";
  closedAt: Date | null;
  tableAmountSnapshot: unknown;
  itemTotalAmountSnapshot: unknown;
  totalAmountSnapshot: unknown;
  session: null | { table: { gameType: "POOL" | "SNOOKER" | "PS5"; pricingGroup: string; number: string } };
  items: Array<{ category: "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES"; lineTotalAmount: unknown }>;
};

type DashboardSession = {
  id: string;
  startedAt: Date;
  actualEndAt: Date | null;
  table: { number: string; gameType: "POOL" | "SNOOKER" | "PS5"; pricingGroup: string };
};

export type BuildOwnerDashboardInput = {
  now: Date;
  bills: DashboardBill[];
  sessions: DashboardSession[];
  openBillCount: number;
};

export function buildOwnerDashboardData(input: BuildOwnerDashboardInput): OwnerDashboardData {
  const revenue = { stationTime: 0, ps5Time: 0, food: 0, cigarettes: 0, beverages: 0 };
  for (const bill of input.bills) {
    const tableAmount = roundMoney(Number(bill.tableAmountSnapshot));
    if (bill.session?.table.gameType === "PS5") {
      revenue.ps5Time = roundMoney(revenue.ps5Time + tableAmount);
    } else {
      revenue.stationTime = roundMoney(revenue.stationTime + tableAmount);
    }
    for (const item of bill.items) {
      const amount = Number(item.lineTotalAmount);
      if (item.category === "FOOD" || item.category === "CAFE") revenue.food = roundMoney(revenue.food + amount);
      if (item.category === "CIGARETTES") revenue.cigarettes = roundMoney(revenue.cigarettes + amount);
      if (item.category === "BEVERAGES") revenue.beverages = roundMoney(revenue.beverages + amount);
    }
  }
  const busy = new Map<string, number>([
    ["Royal Snooker", 0],
    ["Mini Snooker", 0],
    ["Pool", 0],
    ["PS5", 0]
  ]);
  for (const session of input.sessions) {
    if (!session.actualEndAt) continue;
    const label = stationGroupLabel(session.table.gameType, session.table.pricingGroup);
    const hours = Math.max(0, session.actualEndAt.getTime() - session.startedAt.getTime()) / 3_600_000;
    busy.set(label, roundMoney((busy.get(label) ?? 0) + hours));
  }
  return {
    totalRevenue: roundMoney(revenue.stationTime + revenue.ps5Time + revenue.food + revenue.cigarettes + revenue.beverages),
    revenue,
    busyHours: [
      { label: "Royal Snooker", hours: busy.get("Royal Snooker") ?? 0 },
      { label: "Mini Snooker", hours: busy.get("Mini Snooker") ?? 0 },
      { label: "Pool", hours: busy.get("Pool") ?? 0 },
      { label: "PS5", hours: busy.get("PS5") ?? 0 }
    ],
    closedBillCount: input.bills.length,
    openBillCount: input.openBillCount
  };
}

export async function getOwnerDashboardData(businessId: string, now = new Date()): Promise<OwnerDashboardData> {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const [bills, sessions, openBillCount] = await Promise.all([
    prisma.bill.findMany({
      where: { businessId, status: "CLOSED", closedAt: { gte: startOfDay, lt: endOfDay } },
      include: { items: true, session: { include: { table: true } } }
    }),
    prisma.session.findMany({
      where: { businessId, status: "COMPLETED", actualEndAt: { gte: startOfDay, lt: endOfDay } },
      include: { table: true }
    }),
    prisma.bill.count({ where: { businessId, status: "OPEN" } })
  ]);
  return buildOwnerDashboardData({ now, bills, sessions, openBillCount });
}

function stationGroupLabel(gameType: "POOL" | "SNOOKER" | "PS5", pricingGroup: string) {
  if (gameType === "PS5") return "PS5";
  if (gameType === "POOL") return "Pool";
  if (pricingGroup === "royal") return "Royal Snooker";
  return "Mini Snooker";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 5: Run dashboard tests to verify they pass**

Run: `npm test tests/unit/owner-dashboard.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard tests/unit/owner-dashboard.test.ts
git commit -m "feat: add owner dashboard calculations"
```

---

### Task 3: Add Owner Dashboard Page and Navigation

**Files:**
- Create: `src/features/dashboard/components/owner-dashboard-page.tsx`
- Create: `src/app/(admin)/dashboard/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/app/admin-shell.tsx`
- Test: `tests/components/owner-dashboard-page.test.tsx`

**Interfaces:**
- Consumes: `OwnerDashboardData` from `src/features/dashboard/types.ts`.
- Produces: `/dashboard` route and nav item labeled `Dashboard`.

- [ ] **Step 1: Write failing dashboard component test**

Create `tests/components/owner-dashboard-page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwnerDashboardPage } from "@/features/dashboard/components/owner-dashboard-page";

describe("OwnerDashboardPage", () => {
  it("renders revenue categories and busy hours for today", () => {
    render(
      <OwnerDashboardPage
        data={{
          totalRevenue: 435,
          revenue: { stationTime: 175, ps5Time: 100, food: 120, cigarettes: 20, beverages: 20 },
          busyHours: [
            { label: "Royal Snooker", hours: 1.5 },
            { label: "Mini Snooker", hours: 0 },
            { label: "Pool", hours: 0.5 },
            { label: "PS5", hours: 2 }
          ],
          closedBillCount: 3,
          openBillCount: 2
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Owner Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Today's revenue")).toBeInTheDocument();
    expect(screen.getByText("₹435.00")).toBeInTheDocument();
    expect(screen.getByText("PS5 time")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Cigarettes")).toBeInTheDocument();
    expect(screen.getByText("Beverages")).toBeInTheDocument();
    expect(screen.getByText("Royal Snooker")).toBeInTheDocument();
    expect(screen.getByText("2.00h")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run component test to verify it fails**

Run: `npm test tests/components/owner-dashboard-page.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement dashboard component**

Create `src/features/dashboard/components/owner-dashboard-page.tsx`:

```tsx
import { formatMoney } from "@/lib/money";
import type { OwnerDashboardData } from "../types";

export function OwnerDashboardPage({ data }: { data: OwnerDashboardData }) {
  const revenueRows = [
    { label: "Snooker & Pool time", value: data.revenue.stationTime },
    { label: "PS5 time", value: data.revenue.ps5Time },
    { label: "Food", value: data.revenue.food },
    { label: "Cigarettes", value: data.revenue.cigarettes },
    { label: "Beverages", value: data.revenue.beverages }
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">Today's revenue and station utilization.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-material border border-outline bg-surface p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Today's revenue</p>
          <strong className="mt-2 block text-3xl">{formatMoney(data.totalRevenue)}</strong>
        </div>
        <div className="rounded-material border border-outline bg-surface p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Closed bills</p>
          <strong className="mt-2 block text-3xl">{data.closedBillCount}</strong>
        </div>
        <div className="rounded-material border border-outline bg-surface p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Open bills</p>
          <strong className="mt-2 block text-3xl">{data.openBillCount}</strong>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-material border border-outline bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Revenue by category</h2>
          <div className="mt-3 space-y-2">
            {revenueRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-outline py-2 last:border-b-0">
                <span>{row.label}</span>
                <strong>{formatMoney(row.value)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-material border border-outline bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Busy hours</h2>
          <div className="mt-3 space-y-2">
            {data.busyHours.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-outline py-2 last:border-b-0">
                <span>{row.label}</span>
                <strong>{row.hours.toFixed(2)}h</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add route and navigation**

Create `src/app/(admin)/dashboard/page.tsx`:

```tsx
import { OwnerDashboardPage } from "@/features/dashboard/components/owner-dashboard-page";
import { getOwnerDashboardData } from "@/features/dashboard/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  const context = await getCurrentEmployeeContext();
  const data = await getOwnerDashboardData(context.businessId);
  return <OwnerDashboardPage data={data} />;
}
```

Update `src/app/page.tsx` to route to `/dashboard`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

Update `src/components/app/admin-shell.tsx` nav items:

```ts
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "monitoring" },
  { href: "/live-tables", label: "Live Floor", icon: "grid_view" },
  { href: "/settings", label: "Food/Menu", icon: "restaurant" },
  { href: "/rates", label: "Rates", icon: "currency_rupee" }
];
```

- [ ] **Step 5: Run component test**

Run: `npm test tests/components/owner-dashboard-page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/components src/app/'(admin)'/dashboard src/app/page.tsx src/components/app/admin-shell.tsx tests/components/owner-dashboard-page.test.tsx
git commit -m "feat: add owner dashboard page"
```

---

### Task 4: Add Editable Hourly Rates Page

**Files:**
- Create: `src/features/rates/types.ts`
- Create: `src/features/rates/queries.ts`
- Create: `src/features/rates/actions.ts`
- Create: `src/features/rates/components/rates-page.tsx`
- Create: `src/app/(admin)/rates/page.tsx`
- Modify: `src/features/sessions/schemas.ts`
- Test: `tests/unit/rate-settings.test.ts`
- Test: `tests/components/rates-page.test.tsx`

**Interfaces:**
- Consumes: `TablePricing` rows with `durationMinutes = 60`.
- Produces:
  - `RateSetting`
  - `getRateSettings(businessId: string): Promise<RateSetting[]>`
  - `updateHourlyRateAction(input: unknown): Promise<ActionResult>`
  - `RatesPage({ rates }: { rates: RateSetting[] })`

- [ ] **Step 1: Write failing rate settings unit test**

Create `tests/unit/rate-settings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapRateSettings } from "@/features/rates/queries";

describe("mapRateSettings", () => {
  it("maps hourly rules to owner-facing rate labels", () => {
    const rates = mapRateSettings([
      { id: "r1", gameType: "SNOOKER", pricingGroup: "royal", durationMinutes: 60, priceAmount: 350 },
      { id: "r2", gameType: "SNOOKER", pricingGroup: "mini", durationMinutes: 60, priceAmount: 330 },
      { id: "r3", gameType: "POOL", pricingGroup: "standard", durationMinutes: 60, priceAmount: 160 },
      { id: "r4", gameType: "PS5", pricingGroup: "standard", durationMinutes: 60, priceAmount: 200 }
    ]);

    expect(rates.map((rate) => `${rate.label}:${rate.hourlyRate}`)).toEqual([
      "Royal Snooker:350",
      "Mini Snooker:330",
      "Pool:160",
      "PS5:200"
    ]);
  });
});
```

- [ ] **Step 2: Write failing rates component test**

Create `tests/components/rates-page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RatesPage } from "@/features/rates/components/rates-page";

describe("RatesPage", () => {
  it("renders editable hourly rates for tables and PS5", () => {
    render(
      <RatesPage
        rates={[
          { id: "r1", label: "Royal Snooker", gameType: "SNOOKER", pricingGroup: "royal", hourlyRate: 350 },
          { id: "r2", label: "Mini Snooker", gameType: "SNOOKER", pricingGroup: "mini", hourlyRate: 330 },
          { id: "r3", label: "Pool", gameType: "POOL", pricingGroup: "standard", hourlyRate: 160 },
          { id: "r4", label: "PS5", gameType: "PS5", pricingGroup: "standard", hourlyRate: 200 }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Hourly Rates" })).toBeInTheDocument();
    expect(screen.getByText("Royal Snooker")).toBeInTheDocument();
    expect(screen.getByText("Mini Snooker")).toBeInTheDocument();
    expect(screen.getByText("Pool")).toBeInTheDocument();
    expect(screen.getByText("PS5")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Update rate" })).toHaveLength(4);
  });
});
```

- [ ] **Step 3: Run rate tests to verify they fail**

Run: `npm test tests/unit/rate-settings.test.ts tests/components/rates-page.test.tsx`

Expected: FAIL because rate files do not exist.

- [ ] **Step 4: Implement rate types and query mapping**

Create `src/features/rates/types.ts`:

```ts
export type RateGameType = "POOL" | "SNOOKER" | "PS5";

export type RateSetting = {
  id: string;
  label: "Royal Snooker" | "Mini Snooker" | "Pool" | "PS5";
  gameType: RateGameType;
  pricingGroup: string;
  hourlyRate: number;
};
```

Create `src/features/rates/queries.ts`:

```ts
import { prisma } from "@/server/db/prisma";
import type { RateSetting } from "./types";

type RateRule = {
  id: string;
  gameType: "POOL" | "SNOOKER" | "PS5";
  pricingGroup: string;
  durationMinutes: number;
  priceAmount: unknown;
};

export function mapRateSettings(rules: RateRule[]): RateSetting[] {
  const order = ["Royal Snooker", "Mini Snooker", "Pool", "PS5"];
  return rules
    .filter((rule) => rule.durationMinutes === 60)
    .map((rule) => ({
      id: rule.id,
      label: rateLabel(rule.gameType, rule.pricingGroup),
      gameType: rule.gameType,
      pricingGroup: rule.pricingGroup,
      hourlyRate: Number(rule.priceAmount)
    }))
    .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

export async function getRateSettings(businessId: string): Promise<RateSetting[]> {
  const rules = await prisma.tablePricing.findMany({
    where: { businessId, durationMinutes: 60 }
  });
  return mapRateSettings(rules);
}

function rateLabel(gameType: "POOL" | "SNOOKER" | "PS5", pricingGroup: string): RateSetting["label"] {
  if (gameType === "PS5") return "PS5";
  if (gameType === "POOL") return "Pool";
  if (pricingGroup === "royal") return "Royal Snooker";
  return "Mini Snooker";
}
```

- [ ] **Step 5: Add validation and server action**

In `src/features/sessions/schemas.ts`, add:

```ts
export const rateFormSchema = z.object({
  id: z.string().min(1),
  hourlyRate: z.coerce.number().min(0)
});
```

Create `src/features/rates/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { rateFormSchema } from "@/features/sessions/schemas";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { requirePermission } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function updateHourlyRateAction(input: unknown): Promise<ActionResult> {
  try {
    const context = await getCurrentEmployeeContext();
    requirePermission(context, "settings.update");
    const parsed = rateFormSchema.parse(input);
    await prisma.tablePricing.update({
      where: { id: parsed.id, businessId: context.businessId },
      data: { priceAmount: parsed.hourlyRate }
    });
    revalidatePath("/rates");
    revalidatePath("/live-tables");
    revalidatePath("/dashboard");
    return { ok: true, message: "Hourly rate updated." };
  } catch {
    return { ok: false, message: "Hourly rate could not be updated." };
  }
}
```

- [ ] **Step 6: Implement Rates page component and route**

Create `src/features/rates/components/rates-page.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, textInputProps } from "@/components/ui/field";
import { Snackbar } from "@/components/ui/snackbar";
import { formatMoney } from "@/lib/money";
import { updateHourlyRateAction } from "../actions";
import type { RateSetting } from "../types";

export function RatesPage({ rates }: { rates: RateSetting[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRate(rate: RateSetting, hourlyRate: number) {
    startTransition(async () => {
      const result = await updateHourlyRateAction({ id: rate.id, hourlyRate });
      setMessage(result.message);
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hourly Rates</h1>
        <p className="mt-1 text-sm text-neutral-600">Change the hourly rate used for new running bills.</p>
      </div>
      <div className="overflow-hidden rounded-material border border-outline bg-surface shadow-sm">
        <div className="grid grid-cols-[1fr_160px_180px] gap-3 border-b border-outline px-4 py-3 text-xs font-semibold uppercase text-neutral-500">
          <span>Station type</span>
          <span>Hourly rate</span>
          <span>Actions</span>
        </div>
        {rates.map((rate) => (
          <RateRow key={rate.id} rate={rate} disabled={isPending} onUpdate={updateRate} />
        ))}
      </div>
      <Snackbar message={message} tone={message?.includes("could not") ? "danger" : "success"} />
    </section>
  );
}

function RateRow({
  rate,
  disabled,
  onUpdate
}: {
  rate: RateSetting;
  disabled: boolean;
  onUpdate: (rate: RateSetting, hourlyRate: number) => void;
}) {
  const [hourlyRate, setHourlyRate] = useState(rate.hourlyRate);

  return (
    <div className="grid grid-cols-[1fr_160px_180px] items-center gap-3 border-b border-outline px-4 py-3 text-sm last:border-b-0">
      <div>
        <strong>{rate.label}</strong>
        <p className="text-xs text-neutral-500">{formatMoney(rate.hourlyRate)}/hr current</p>
      </div>
      <Field label={`Rate for ${rate.label}`} hideLabel>
        <input
          {...textInputProps()}
          type="number"
          min={0}
          value={hourlyRate}
          onChange={(event) => setHourlyRate(Number(event.target.value))}
        />
      </Field>
      <Button type="button" className="h-9 px-3" disabled={disabled} onClick={() => onUpdate(rate, hourlyRate)}>
        Update rate
      </Button>
    </div>
  );
}
```

Create `src/app/(admin)/rates/page.tsx`:

```tsx
import { RatesPage } from "@/features/rates/components/rates-page";
import { getRateSettings } from "@/features/rates/queries";
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";

export const dynamic = "force-dynamic";

export default async function RatesRoute() {
  const context = await getCurrentEmployeeContext();
  const rates = await getRateSettings(context.businessId);
  return <RatesPage rates={rates} />;
}
```

- [ ] **Step 7: Run rate tests**

Run: `npm test tests/unit/rate-settings.test.ts tests/components/rates-page.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/rates src/app/'(admin)'/rates src/features/sessions/schemas.ts tests/unit/rate-settings.test.ts tests/components/rates-page.test.tsx
git commit -m "feat: add hourly rate settings"
```

---

### Task 5: Refresh Live Floor UI and Separate PS5 Section

**Files:**
- Modify: `src/features/live-tables/types.ts`
- Modify: `src/features/live-tables/queries.ts`
- Modify: `src/features/live-tables/components/live-table-page.tsx`
- Modify: `src/features/live-tables/components/table-grid.tsx`
- Modify: `src/features/live-tables/components/table-card.tsx`
- Modify: `src/features/live-tables/components/table-board-toolbar.tsx`
- Test: `tests/components/live-table-page.test.tsx`

**Interfaces:**
- Consumes: `LiveTableCardData[]` including `gameType: "PS5"`.
- Produces: visually separated live floor sections for snooker/pool and PS5, with summary counts and current hourly rate visible.

- [ ] **Step 1: Write failing live floor tests**

Update `tests/components/live-table-page.test.tsx` by adding a PS5 station to the first render:

```ts
{
  id: "ps5_1",
  number: "PS5 1",
  gameType: "PS5",
  status: "AVAILABLE",
  hourlyRate: 200,
  currentSession: null,
  recentBill: null
}
```

Add assertions:

```ts
expect(screen.getByRole("heading", { name: "Live Floor" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Snooker & Pool" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "PS5" })).toBeInTheDocument();
expect(screen.getByText("PS5 1")).toBeInTheDocument();
expect(screen.getByText("₹200.00/hr")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Start session for station PS5 1" })).toBeInTheDocument();
```

Update any existing `LiveTableCardData` fixtures to include `hourlyRate`.

- [ ] **Step 2: Run live table test to verify it fails**

Run: `npm test tests/components/live-table-page.test.tsx`

Expected: FAIL because `hourlyRate` and PS5 grouping are not implemented.

- [ ] **Step 3: Extend live table types and query mapping**

In `src/features/live-tables/types.ts`, add:

```ts
hourlyRate: number;
```

to `LiveTableCardData`.

In `src/features/live-tables/queries.ts`, set the mapped field:

```ts
hourlyRate,
```

on each returned table card.

- [ ] **Step 4: Refresh page layout and grouping**

In `src/features/live-tables/components/live-table-page.tsx`, replace the current `Live Tables` copy with `Live Floor`. Derive groups:

```ts
const tableStations = tables.filter((table) => table.gameType !== "PS5");
const ps5Stations = tables.filter((table) => table.gameType === "PS5");
const activeCount = tables.filter((table) => table.status === "OCCUPIED").length;
const availableCount = tables.filter((table) => table.status === "AVAILABLE").length;
```

Render:

```tsx
<section className="grid gap-3 md:grid-cols-4" aria-label="Live floor summary">
  <SummaryTile label="Active sessions" value={activeCount} />
  <SummaryTile label="Available stations" value={availableCount} />
  <SummaryTile label="Open counter bills" value={counterBills.length} />
  <SummaryTile label="Stations" value={tables.length} />
</section>
<StationSection title="Snooker & Pool" tables={tableStations} products={products} />
<StationSection title="PS5" tables={ps5Stations} products={products} />
```

- [ ] **Step 5: Refresh station card labels**

In `src/features/live-tables/components/table-card.tsx`, add:

```ts
const gameTypeLabel: Record<LiveTableGameType, string> = {
  POOL: "Pool",
  SNOOKER: "Snooker",
  PS5: "PS5"
};
```

Show the hourly rate:

```tsx
<p className="text-sm text-neutral-500">{gameTypeLabel[table.gameType]} · {formatMoney(table.hourlyRate)}/hr</p>
```

Change ARIA labels from `table` to `station`:

```tsx
aria-label={`Start session for station ${table.number}`}
aria-label={`Add items for station ${table.number}`}
aria-label={`Close bill and continue station ${table.number}`}
aria-label={`End session for station ${table.number}`}
```

- [ ] **Step 6: Keep blocked statuses out of primary workflow**

In `src/features/live-tables/components/table-board-toolbar.tsx`, ensure visible count labels include only:

```ts
const visibleStatuses = ["AVAILABLE", "RESERVED", "OCCUPIED"] as const;
```

In `src/features/live-tables/components/table-status-menu.tsx`, remove staff-facing options for `CLEANING`, `MAINTENANCE`, and `BLOCKED` if they are still rendered as normal choices.

- [ ] **Step 7: Run live floor tests**

Run: `npm test tests/components/live-table-page.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/live-tables tests/components/live-table-page.test.tsx
git commit -m "feat: refresh live floor with ps5 section"
```

---

### Task 6: Rename Settings to Food/Menu and Polish App Shell

**Files:**
- Modify: `src/features/settings/menu-settings-page.tsx`
- Modify: `src/app/(admin)/settings/page.tsx`
- Modify: `src/components/app/admin-shell.tsx`
- Modify: `src/styles/globals.css`
- Test: `tests/components/settings-page.test.tsx`

**Interfaces:**
- Consumes: existing product management actions.
- Produces: Food/Menu page that still manages Food, Cigarettes, and Beverages.

- [ ] **Step 1: Write failing Food/Menu test**

Update `tests/components/settings-page.test.tsx`:

```ts
expect(screen.getByRole("heading", { name: "Food/Menu" })).toBeInTheDocument();
expect(screen.getByText("Manage Food, Cigarettes, and Beverages. Price changes affect only new bill items.")).toBeInTheDocument();
```

Remove the assertion for heading `Menu Settings`.

- [ ] **Step 2: Run settings test to verify it fails**

Run: `npm test tests/components/settings-page.test.tsx`

Expected: FAIL because the heading is still `Menu Settings`.

- [ ] **Step 3: Update visible page copy**

In `src/features/settings/menu-settings-page.tsx`, change:

```tsx
<h1 className="text-2xl font-semibold">Food/Menu</h1>
```

Keep the existing explanatory line exactly:

```tsx
<p className="mt-1 text-sm text-neutral-600">Manage Food, Cigarettes, and Beverages. Price changes affect only new bill items.</p>
```

- [ ] **Step 4: Polish shell visual density**

In `src/components/app/admin-shell.tsx`, keep the nav labels from Task 3 and update the header subtitle:

```tsx
<p className="text-xs text-neutral-500">Dashboard, live floor, rates, and Food/Menu</p>
```

In `src/styles/globals.css`, use restrained operational styling: keep neutral background, stronger card borders, and avoid decorative gradients.

- [ ] **Step 5: Run settings test**

Run: `npm test tests/components/settings-page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/settings/menu-settings-page.tsx src/app/'(admin)'/settings/page.tsx src/components/app/admin-shell.tsx src/styles/globals.css tests/components/settings-page.test.tsx
git commit -m "feat: polish food menu settings"
```

---

### Task 7: Add End-to-End Coverage and Final Verification

**Files:**
- Modify: `tests/e2e/live-tables.spec.ts`
- Create: `tests/e2e/dashboard-rates.spec.ts`

**Interfaces:**
- Consumes: completed app routes `/dashboard`, `/live-tables`, `/settings`, and `/rates`.
- Produces: browser-level confidence that the owner workflows render and basic operations are reachable.

- [ ] **Step 1: Add dashboard and rates E2E test**

Create `tests/e2e/dashboard-rates.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("owner can view dashboard and rates", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Owner Dashboard" })).toBeVisible();
  await expect(page.getByText("Today's revenue")).toBeVisible();
  await expect(page.getByText("PS5 time")).toBeVisible();

  await page.goto("/rates");
  await expect(page.getByRole("heading", { name: "Hourly Rates" })).toBeVisible();
  await expect(page.getByText("Royal Snooker")).toBeVisible();
  await expect(page.getByText("Mini Snooker")).toBeVisible();
  await expect(page.getByText("Pool")).toBeVisible();
  await expect(page.getByText("PS5")).toBeVisible();
});
```

- [ ] **Step 2: Update live floor E2E for PS5**

In `tests/e2e/live-tables.spec.ts`, add assertions after navigating to `/live-tables`:

```ts
await expect(page.getByRole("heading", { name: "Live Floor" })).toBeVisible();
await expect(page.getByRole("heading", { name: "PS5" })).toBeVisible();
await expect(page.getByText("PS5 1")).toBeVisible();
await expect(page.getByText("PS5 2")).toBeVisible();
```

- [ ] **Step 3: Run full automated verification**

Run: `npm test`

Expected: all Vitest tests pass.

Run: `npm run typecheck`

Expected: TypeScript exits 0.

Run: `npm run build`

Expected: Next production build exits 0.

Run: `npm run test:e2e`

Expected: Playwright exits 0.

- [ ] **Step 4: Manual browser verification**

Start the dev server:

```bash
npm run dev
```

Open:

```bash
open http://localhost:3000/dashboard
```

Verify manually:

- Dashboard renders daily revenue tiles and busy hours.
- Rates page shows Royal Snooker, Mini Snooker, Pool, and PS5.
- Live Floor shows Snooker & Pool separately from PS5.
- PS5 1 can start a session.
- PS5 1 shows a running timer and current bill total.
- A Water Bottle can be added to PS5 1.
- The PS5 session can be ended and the table returns to available.
- Dashboard updates after the closed PS5 bill.

- [ ] **Step 5: Commit verification tests**

```bash
git add tests/e2e/live-tables.spec.ts tests/e2e/dashboard-rates.spec.ts
git commit -m "test: cover dashboard rates and ps5 floor"
```

---

## Final Handoff Checklist

- [ ] Run `git status --short --branch` and confirm the branch is clean except intended uncommitted work.
- [ ] Run `git log --oneline -8` and confirm task commits are present.
- [ ] If the user wants GitHub updated, run `git push origin codex/live-table-core`.
- [ ] Open the local app on `http://localhost:3000/dashboard`.

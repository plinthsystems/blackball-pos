# Live Table Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of the Pool & Snooker Club Management System: a production-ready admin live table board with backend-safe session lifecycle rules.

**Architecture:** Use a Next.js App Router monolith with feature folders, Prisma/PostgreSQL persistence, server-side services for all business rules, Zod boundary validation, and React Query-powered client views. Keep authoritative timing and billing rules on the server; UI timers are display-only.

**Tech Stack:** TypeScript, Next.js App Router, React, Tailwind CSS, Material Symbols, Prisma, PostgreSQL, Zod, React Hook Form, TanStack Query, Vitest, Testing Library, Playwright.

## Global Constraints

- Desktop-first, tablet-friendly, mobile only where layouts naturally collapse.
- UI follows Material Design 3 principles with Inter or Roboto, Google Blue primary actions, light gray background, white surfaces, subtle borders, and state colors only.
- Do not use emojis, decorative gradients, glassmorphism, neon colors, oversized typography, oversized icons, decorative illustrations, or marketing effects.
- Backend services own session timing, extension checks, final billable duration, and invoice draft creation.
- Prevent overlapping active sessions and confirmed bookings with service checks plus PostgreSQL constraints.
- Use feature-based folders, a service layer, repository boundaries, Zod validation, logging-ready domain errors, and tests around business-critical workflows.
- Keep Phase 1 limited to the admin live table core. Do not build POS, inventory, customer portal, kitchen, PDF invoice rendering, reports, or landing website screens.

---

## File Structure

- Create `package.json`: scripts and dependencies for the app, Prisma, tests, and Playwright.
- Create `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `docker-compose.yml`.
- Create `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(admin)/layout.tsx`, `src/app/(admin)/live-tables/page.tsx`, `src/app/(admin)/settings/page.tsx`.
- Create `src/styles/globals.css`: Material-inspired tokens and Tailwind base styles.
- Create `src/lib/cn.ts`, `src/lib/money.ts`, `src/lib/time.ts`.
- Create `src/server/db/prisma.ts`.
- Create `src/server/domain/errors.ts`, `src/server/domain/events.ts`, `src/server/domain/session-calculations.ts`, `src/server/domain/table-transitions.ts`.
- Create `src/server/auth/current-employee.ts`, `src/server/auth/permissions.ts`.
- Create `src/server/repositories/table-repository.ts`, `src/server/repositories/session-repository.ts`, `src/server/repositories/pricing-repository.ts`, `src/server/repositories/audit-log-repository.ts`.
- Create `src/server/services/table-service.ts`, `src/server/services/session-service.ts`, `src/server/services/pricing-service.ts`.
- Create `src/features/live-tables/types.ts`, `src/features/live-tables/queries.ts`, `src/features/live-tables/actions.ts`.
- Create `src/features/live-tables/components/live-table-page.tsx`, `table-board-toolbar.tsx`, `table-grid.tsx`, `table-card.tsx`, `table-status-menu.tsx`.
- Create `src/features/sessions/schemas.ts`, `src/features/sessions/components/start-walk-in-dialog.tsx`, `extend-session-dialog.tsx`, `end-session-dialog.tsx`.
- Create `src/components/app/admin-shell.tsx`, `src/components/ui/button.tsx`, `dialog.tsx`, `field.tsx`, `badge.tsx`, `snackbar.tsx`, `menu.tsx`.
- Create `prisma/schema.prisma`, `prisma/seed.ts`.
- Create tests under `tests/unit`, `tests/integration`, `tests/components`, and `tests/e2e`.

---

### Task 1: Scaffold App, Tooling, and Material-Style Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `src/styles/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/settings/page.tsx`
- Create: `src/components/app/admin-shell.tsx`
- Create: `src/components/ui/button.tsx`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: root app shell, Tailwind tokens, `Button`, `AdminShell`, and package scripts used by all later tasks.
- Consumes: no prior task interfaces.

- [ ] **Step 1: Write the smoke test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("project scaffold", () => {
  it("runs the test runner", () => {
    expect("live-table-core").toContain("table");
  });
});
```

- [ ] **Step 2: Run the smoke test and verify it fails before tooling exists**

Run: `npm test -- tests/unit/smoke.test.ts`

Expected: FAIL because `package.json` and the `test` script do not exist yet.

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "pool-snooker-club-management",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.0.0",
    "@prisma/client": "^6.0.0",
    "@tanstack/react-query": "^5.0.0",
    "clsx": "^2.1.1",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.53.0",
    "tailwind-merge": "^2.5.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.49",
    "prisma": "^6.0.0",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 4: Create TypeScript, Next, Tailwind, Vitest, Playwright, environment, and Docker config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

export default config;
```

Create `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1a73e8",
        surface: "#ffffff",
        background: "#f8fafd",
        outline: "#dadce0",
        success: "#188038",
        warning: "#f9ab00",
        danger: "#d93025"
      },
      borderRadius: {
        material: "8px"
      }
    }
  },
  plugins: []
};

export default config;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"]
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet", use: { ...devices["iPad Pro 11"] } }
  ]
});
```

Create `.env.example`:

```bash
DATABASE_URL="postgresql://club:club@localhost:5432/club_management?schema=public"
NEXT_PUBLIC_APP_NAME="Cue Club Admin"
```

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: club
      POSTGRES_PASSWORD: club
      POSTGRES_DB: club_management
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U club -d club_management"]
      interval: 5s
      timeout: 5s
      retries: 10
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Create global styles and shell components**

Create `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
  --app-background: #f8fafd;
  --app-surface: #ffffff;
  --app-text: #202124;
  --app-muted: #5f6368;
  --app-outline: #dadce0;
  --app-primary: #1a73e8;
}

body {
  margin: 0;
  background: var(--app-background);
  color: var(--app-text);
  font-family: Inter, Roboto, Arial, sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}
```

Create `src/components/ui/button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-blue-700",
  secondary: "border border-outline bg-surface text-neutral-900 hover:bg-neutral-50",
  danger: "bg-danger text-white hover:bg-red-700",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100"
};

export function Button({ className, variant = "secondary", icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-material px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
```

Create `src/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Create `src/components/app/admin-shell.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/live-tables", label: "Live Tables", icon: "grid_view" },
  { href: "/settings", label: "Settings", icon: "settings" }
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-neutral-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-outline bg-surface lg:block">
        <div className="border-b border-outline px-5 py-4">
          <p className="text-sm font-semibold">Cue Club Admin</p>
          <p className="text-xs text-neutral-500">Operations</p>
        </div>
        <nav className="p-3" aria-label="Admin navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-3 rounded-material px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-outline bg-surface px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Cue Club</p>
              <p className="text-xs text-neutral-500">Today&apos;s table operations</p>
            </div>
            <div className="text-sm text-neutral-600">Manager</div>
          </div>
        </header>
        <main className="px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
```

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Cue Club Admin",
  description: "Pool and snooker club operations"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/live-tables");
}
```

Create `src/app/(admin)/layout.tsx`:

```tsx
import { AdminShell } from "@/components/app/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
```

Create `src/app/(admin)/settings/page.tsx`:

```tsx
export default function SettingsPage() {
  return (
    <section className="max-w-3xl">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Business hours, taxes, booking buffers, and table pricing will be managed here after the live table workflow is stable.
      </p>
    </section>
  );
}
```

- [ ] **Step 6: Install dependencies and verify smoke test passes**

Run: `npm install`

Run: `npm test -- tests/unit/smoke.test.ts`

Expected: PASS for `project scaffold > runs the test runner`.

- [ ] **Step 7: Run static checks**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs tailwind.config.ts vitest.config.ts playwright.config.ts .env.example docker-compose.yml src tests
git commit -m "chore: scaffold live table admin app"
```

---

### Task 2: Add Prisma Domain Schema, PostgreSQL Constraints, and Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/server/db/prisma.ts`
- Test: `tests/unit/prisma-schema.test.ts`

**Interfaces:**
- Produces: Prisma Client models used by repositories in Task 4.
- Consumes: package scripts from Task 1.

- [ ] **Step 1: Write a failing schema contract test**

Create `tests/unit/prisma-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Prisma schema", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  it("models the Phase 1 live table domain", () => {
    expect(schema).toContain("model ClubTable");
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Booking");
    expect(schema).toContain("model Invoice");
    expect(schema).toContain("enum TableStatus");
    expect(schema).toContain("enum SessionStatus");
  });

  it("keeps mutable operational records versioned", () => {
    expect(schema).toMatch(/model ClubTable[\\s\\S]*version\\s+Int\\s+@default\\(1\\)/);
    expect(schema).toMatch(/model Session[\\s\\S]*version\\s+Int\\s+@default\\(1\\)/);
  });
});
```

- [ ] **Step 2: Run schema test and verify it fails**

Run: `npm test -- tests/unit/prisma-schema.test.ts`

Expected: FAIL because `prisma/schema.prisma` does not exist.

- [ ] **Step 3: Create Prisma schema**

Create `prisma/schema.prisma` with these models and enums:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum GameType {
  POOL
  SNOOKER
}

enum TableStatus {
  AVAILABLE
  RESERVED
  OCCUPIED
  CLEANING
  MAINTENANCE
  BLOCKED
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  PLAYING
  COMPLETED
  CANCELLED
  NO_SHOW
  EXPIRED
}

enum SessionStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PAID
  CANCELLED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  CASH
  CARD
  UPI
  SPLIT
}

model Business {
  id           String             @id @default(cuid())
  name         String
  phone        String?
  email        String?
  currency     String             @default("INR")
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  settings     BusinessSettings?
  employees    Employee[]
  customers    Customer[]
  tables       ClubTable[]
  bookings     Booking[]
  sessions     Session[]
  invoices     Invoice[]
  payments     Payment[]
  auditLogs    AuditLog[]
  pricingRules TablePricing[]
}

model BusinessSettings {
  id                   String   @id @default(cuid())
  businessId           String   @unique
  gstNumber            String?
  taxRateBasisPoints   Int      @default(1800)
  bookingBufferMinutes Int      @default(10)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  business             Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
}

model Employee {
  id         String         @id @default(cuid())
  businessId String
  name       String
  email      String         @unique
  phone      String?
  active     Boolean        @default(true)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  business   Business       @relation(fields: [businessId], references: [id], onDelete: Cascade)
  roles      EmployeeRole[]
  assignedSessions Session[] @relation("AssignedEmployee")
  createdSessions  Session[] @relation("CreatedByEmployee")
  auditLogs        AuditLog[]
}

model Role {
  id          String           @id @default(cuid())
  businessId  String
  name        String
  description String?
  employees   EmployeeRole[]
  permissions RolePermission[]
  @@unique([businessId, name])
}

model Permission {
  id    String           @id @default(cuid())
  key   String           @unique
  roles RolePermission[]
}

model EmployeeRole {
  employeeId String
  roleId     String
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  role       Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([employeeId, roleId])
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}

model Customer {
  id            String    @id @default(cuid())
  businessId    String
  name          String
  phone         String?
  email         String?
  totalSpend    Decimal   @default(0) @db.Decimal(12, 2)
  loyaltyPoints Int       @default(0)
  lastVisitAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  business      Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  bookings      Booking[]
  sessions      Session[]
  @@index([businessId, phone])
  @@index([businessId, email])
}

model ClubTable {
  id           String      @id @default(cuid())
  businessId   String
  number       String
  gameType     GameType
  status       TableStatus @default(AVAILABLE)
  pricingGroup String      @default("standard")
  version      Int         @default(1)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  business     Business    @relation(fields: [businessId], references: [id], onDelete: Cascade)
  bookings     Booking[]
  sessions     Session[]
  @@unique([businessId, number])
  @@index([businessId, status])
  @@index([businessId, gameType])
}

model Booking {
  id         String        @id @default(cuid())
  businessId String
  tableId    String
  customerId String?
  status     BookingStatus @default(PENDING)
  startsAt   DateTime
  endsAt     DateTime
  lockedUntil DateTime?
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
  business   Business      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  table      ClubTable     @relation(fields: [tableId], references: [id], onDelete: Restrict)
  customer   Customer?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
  @@index([businessId, tableId, status, startsAt, endsAt])
}

model Session {
  id                  String          @id @default(cuid())
  businessId          String
  tableId             String
  customerId          String?
  assignedEmployeeId  String?
  createdByEmployeeId String
  status              SessionStatus   @default(ACTIVE)
  startedAt           DateTime
  plannedEndAt        DateTime
  actualEndAt         DateTime?
  pausedAt            DateTime?
  billableSecondsSnapshot Int         @default(0)
  version             Int             @default(1)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  business            Business        @relation(fields: [businessId], references: [id], onDelete: Cascade)
  table               ClubTable       @relation(fields: [tableId], references: [id], onDelete: Restrict)
  customer            Customer?       @relation(fields: [customerId], references: [id], onDelete: SetNull)
  assignedEmployee    Employee?       @relation("AssignedEmployee", fields: [assignedEmployeeId], references: [id], onDelete: SetNull)
  createdByEmployee   Employee        @relation("CreatedByEmployee", fields: [createdByEmployeeId], references: [id], onDelete: Restrict)
  pauses              SessionPause[]
  extensions          SessionExtension[]
  invoices            Invoice[]
  @@index([businessId, tableId, status, startedAt, plannedEndAt])
}

model SessionPause {
  id        String   @id @default(cuid())
  sessionId String
  pausedAt  DateTime
  resumedAt DateTime?
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model SessionExtension {
  id                  String   @id @default(cuid())
  sessionId           String
  previousPlannedEndAt DateTime
  newPlannedEndAt     DateTime
  addedMinutes        Int
  createdAt           DateTime @default(now())
  session             Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model TablePricing {
  id                 String   @id @default(cuid())
  businessId         String
  gameType           GameType
  pricingGroup       String   @default("standard")
  durationMinutes    Int
  priceAmount        Decimal  @db.Decimal(12, 2)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  business           Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  @@unique([businessId, gameType, pricingGroup, durationMinutes])
}

model Invoice {
  id             String        @id @default(cuid())
  businessId     String
  sessionId      String
  status         InvoiceStatus @default(DRAFT)
  subtotalAmount Decimal       @db.Decimal(12, 2)
  taxAmount      Decimal       @db.Decimal(12, 2)
  discountAmount Decimal       @default(0) @db.Decimal(12, 2)
  totalAmount    Decimal       @db.Decimal(12, 2)
  currency       String        @default("INR")
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  business       Business      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  session        Session       @relation(fields: [sessionId], references: [id], onDelete: Restrict)
  payments       Payment[]
  @@unique([sessionId, status])
}

model Payment {
  id          String        @id @default(cuid())
  businessId  String
  invoiceId   String
  method      PaymentMethod
  status      PaymentStatus @default(PENDING)
  amount      Decimal       @db.Decimal(12, 2)
  createdAt   DateTime      @default(now())
  business    Business      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  invoice     Invoice       @relation(fields: [invoiceId], references: [id], onDelete: Restrict)
}

model AuditLog {
  id          String   @id @default(cuid())
  businessId  String
  employeeId  String?
  action      String
  entityType  String
  entityId    String
  metadata    Json
  createdAt   DateTime @default(now())
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  employee    Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  @@index([businessId, entityType, entityId, createdAt])
}

model Notification {
  id         String   @id @default(cuid())
  businessId String
  title      String
  body       String
  readAt     DateTime?
  createdAt  DateTime @default(now())
}
```

- [ ] **Step 4: Add Prisma client helper**

Create `src/server/db/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Add seed data**

Create `prisma/seed.ts` with one business, roles, permissions, employees, pricing, and 12 tables:

```ts
import { PrismaClient, GameType } from "@prisma/client";

const prisma = new PrismaClient();

const permissionKeys = [
  "tables.read",
  "tables.update_status",
  "sessions.start",
  "sessions.pause",
  "sessions.resume",
  "sessions.extend",
  "sessions.end",
  "settings.update"
];

async function main() {
  const business = await prisma.business.upsert({
    where: { id: "seed-business" },
    update: {},
    create: {
      id: "seed-business",
      name: "Cue Club",
      phone: "+91 90000 00000",
      email: "operations@cueclub.example",
      settings: {
        create: {
          taxRateBasisPoints: 1800,
          bookingBufferMinutes: 10
        }
      }
    }
  });

  await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key }
      })
    )
  );

  const ownerRole = await prisma.role.upsert({
    where: { businessId_name: { businessId: business.id, name: "Owner" } },
    update: {},
    create: { businessId: business.id, name: "Owner", description: "Full operational access" }
  });

  const owner = await prisma.employee.upsert({
    where: { email: "owner@cueclub.example" },
    update: {},
    create: {
      businessId: business.id,
      name: "Aarav Manager",
      email: "owner@cueclub.example",
      roles: { create: { roleId: ownerRole.id } }
    }
  });

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: permission.id }
      })
    )
  );

  const pricing = [
    { gameType: GameType.POOL, durationMinutes: 30, priceAmount: "250.00" },
    { gameType: GameType.POOL, durationMinutes: 60, priceAmount: "450.00" },
    { gameType: GameType.SNOOKER, durationMinutes: 30, priceAmount: "350.00" },
    { gameType: GameType.SNOOKER, durationMinutes: 60, priceAmount: "650.00" }
  ];

  for (const rule of pricing) {
    await prisma.tablePricing.upsert({
      where: {
        businessId_gameType_pricingGroup_durationMinutes: {
          businessId: business.id,
          gameType: rule.gameType,
          pricingGroup: "standard",
          durationMinutes: rule.durationMinutes
        }
      },
      update: { priceAmount: rule.priceAmount },
      create: { businessId: business.id, pricingGroup: "standard", ...rule }
    });
  }

  for (let number = 1; number <= 8; number += 1) {
    await prisma.clubTable.upsert({
      where: { businessId_number: { businessId: business.id, number: `P${number}` } },
      update: {},
      create: { businessId: business.id, number: `P${number}`, gameType: GameType.POOL }
    });
  }

  for (let number = 1; number <= 4; number += 1) {
    await prisma.clubTable.upsert({
      where: { businessId_number: { businessId: business.id, number: `S${number}` } },
      update: {},
      create: { businessId: business.id, number: `S${number}`, gameType: GameType.SNOOKER }
    });
  }

  console.log(`Seeded ${business.name} with owner ${owner.email}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 6: Run schema test and Prisma validation**

Run: `npm test -- tests/unit/prisma-schema.test.ts`

Expected: PASS.

Run: `npm run prisma:generate`

Expected: Prisma Client generated successfully.

Run: `npx prisma validate`

Expected: schema is valid.

- [ ] **Step 7: Start PostgreSQL, migrate, and seed**

Run: `docker compose up -d postgres`

Run: `cp .env.example .env`

Run: `npm run prisma:migrate -- --name init_live_table_core`

Run: `npm run prisma:seed`

Expected: seed output includes `Seeded Cue Club with owner owner@cueclub.example`.

- [ ] **Step 8: Commit**

```bash
git add prisma src/server/db tests/unit/prisma-schema.test.ts .env.example docker-compose.yml package.json package-lock.json
git commit -m "feat: add live table domain schema"
```

---

### Task 3: Implement Domain Calculations, Status Rules, and Validation Schemas

**Files:**
- Create: `src/server/domain/errors.ts`
- Create: `src/server/domain/session-calculations.ts`
- Create: `src/server/domain/table-transitions.ts`
- Create: `src/features/sessions/schemas.ts`
- Create: `src/lib/money.ts`
- Create: `src/lib/time.ts`
- Test: `tests/unit/session-calculations.test.ts`
- Test: `tests/unit/table-transitions.test.ts`
- Test: `tests/unit/session-schemas.test.ts`

**Interfaces:**
- Produces: `calculateBillableSeconds`, `calculateTableCharge`, `canTransitionTableStatus`, `DomainError`, `startWalkInSessionSchema`, `extendSessionSchema`, `endSessionSchema`.
- Consumes: Prisma enum names from Task 2.

- [ ] **Step 1: Write failing domain tests**

Create `tests/unit/session-calculations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateBillableSeconds, calculateTableCharge } from "@/server/domain/session-calculations";

describe("session calculations", () => {
  it("calculates billable seconds from server timestamps minus completed pauses", () => {
    const billable = calculateBillableSeconds({
      startedAt: new Date("2026-07-23T10:00:00.000Z"),
      endedAt: new Date("2026-07-23T11:30:00.000Z"),
      pauses: [
        {
          pausedAt: new Date("2026-07-23T10:20:00.000Z"),
          resumedAt: new Date("2026-07-23T10:35:00.000Z")
        }
      ]
    });

    expect(billable).toBe(75 * 60);
  });

  it("prices partial play by rounding up to the next 30 minute block", () => {
    const amount = calculateTableCharge({
      billableSeconds: 61 * 60,
      halfHourAmount: 250,
      fullHourAmount: 450
    });

    expect(amount).toBe(700);
  });
});
```

Create `tests/unit/table-transitions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canTransitionTableStatus } from "@/server/domain/table-transitions";

describe("table status transitions", () => {
  it("allows operational statuses to return to available", () => {
    expect(canTransitionTableStatus("CLEANING", "AVAILABLE")).toBe(true);
    expect(canTransitionTableStatus("MAINTENANCE", "AVAILABLE")).toBe(true);
    expect(canTransitionTableStatus("BLOCKED", "AVAILABLE")).toBe(true);
  });

  it("prevents occupied tables from being moved directly to maintenance", () => {
    expect(canTransitionTableStatus("OCCUPIED", "MAINTENANCE")).toBe(false);
  });
});
```

Create `tests/unit/session-schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { startWalkInSessionSchema, extendSessionSchema } from "@/features/sessions/schemas";

describe("session schemas", () => {
  it("accepts a 30 minute walk-in session", () => {
    const result = startWalkInSessionSchema.safeParse({
      tableId: "table_1",
      durationMinutes: 30,
      customerName: "Riya Shah",
      customerPhone: "9999999999"
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported extension durations", () => {
    const result = extendSessionSchema.safeParse({
      sessionId: "session_1",
      addedMinutes: 45
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run domain tests and verify they fail**

Run: `npm test -- tests/unit/session-calculations.test.ts tests/unit/table-transitions.test.ts tests/unit/session-schemas.test.ts`

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement domain errors and calculations**

Create `src/server/domain/errors.ts`:

```ts
export type DomainErrorCode =
  | "TABLE_NOT_AVAILABLE"
  | "SESSION_NOT_ACTIVE"
  | "SESSION_NOT_PAUSED"
  | "EXTENSION_CONFLICT"
  | "OVERLAPPING_SESSION"
  | "INVALID_STATUS_TRANSITION"
  | "UNAUTHORIZED";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly metadata: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "DomainError";
  }
}
```

Create `src/server/domain/session-calculations.ts`:

```ts
type PauseInterval = {
  pausedAt: Date;
  resumedAt: Date | null;
};

export function calculateBillableSeconds(input: {
  startedAt: Date;
  endedAt: Date;
  pauses: PauseInterval[];
}) {
  const totalSeconds = Math.max(0, Math.floor((input.endedAt.getTime() - input.startedAt.getTime()) / 1000));
  const pausedSeconds = input.pauses.reduce((sum, pause) => {
    if (!pause.resumedAt) {
      return sum;
    }

    return sum + Math.max(0, Math.floor((pause.resumedAt.getTime() - pause.pausedAt.getTime()) / 1000));
  }, 0);

  return Math.max(0, totalSeconds - pausedSeconds);
}

export function calculateTableCharge(input: {
  billableSeconds: number;
  halfHourAmount: number;
  fullHourAmount: number;
}) {
  const fullHours = Math.floor(input.billableSeconds / 3600);
  const remainingSeconds = input.billableSeconds % 3600;
  const halfHourBlocks = remainingSeconds === 0 ? 0 : Math.ceil(remainingSeconds / 1800);

  return fullHours * input.fullHourAmount + halfHourBlocks * input.halfHourAmount;
}
```

Create `src/lib/money.ts`:

```ts
export function formatMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}
```

Create `src/lib/time.ts`:

```ts
export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
```

- [ ] **Step 4: Implement table transitions and schemas**

Create `src/server/domain/table-transitions.ts`:

```ts
type TableStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";

const allowedTransitions: Record<TableStatus, TableStatus[]> = {
  AVAILABLE: ["CLEANING", "MAINTENANCE", "BLOCKED"],
  RESERVED: ["AVAILABLE", "OCCUPIED", "BLOCKED"],
  OCCUPIED: ["CLEANING"],
  CLEANING: ["AVAILABLE", "MAINTENANCE", "BLOCKED"],
  MAINTENANCE: ["AVAILABLE", "BLOCKED"],
  BLOCKED: ["AVAILABLE", "MAINTENANCE"]
};

export function canTransitionTableStatus(from: TableStatus, to: TableStatus) {
  return allowedTransitions[from].includes(to);
}
```

Create `src/features/sessions/schemas.ts`:

```ts
import { z } from "zod";

export const startWalkInSessionSchema = z.object({
  tableId: z.string().min(1),
  durationMinutes: z.union([z.literal(30), z.literal(60)]),
  customerName: z.string().trim().min(1).max(120).optional(),
  customerPhone: z.string().trim().min(7).max(20).optional(),
  assignedEmployeeId: z.string().min(1).optional()
});

export const extendSessionSchema = z.object({
  sessionId: z.string().min(1),
  addedMinutes: z.union([z.literal(30), z.literal(60)])
});

export const endSessionSchema = z.object({
  sessionId: z.string().min(1)
});

export const tableStatusSchema = z.object({
  tableId: z.string().min(1),
  status: z.enum(["AVAILABLE", "CLEANING", "MAINTENANCE", "BLOCKED"])
});

export type StartWalkInSessionInput = z.infer<typeof startWalkInSessionSchema>;
export type ExtendSessionInput = z.infer<typeof extendSessionSchema>;
export type EndSessionInput = z.infer<typeof endSessionSchema>;
export type TableStatusInput = z.infer<typeof tableStatusSchema>;
```

- [ ] **Step 5: Run domain tests and static checks**

Run: `npm test -- tests/unit/session-calculations.test.ts tests/unit/table-transitions.test.ts tests/unit/session-schemas.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/domain src/features/sessions/schemas.ts src/lib tests/unit/session-calculations.test.ts tests/unit/table-transitions.test.ts tests/unit/session-schemas.test.ts
git commit -m "feat: add session domain rules"
```

---

### Task 4: Implement Services, Repositories, Authorization, and Audit Events

**Files:**
- Create: `src/server/domain/events.ts`
- Create: `src/server/auth/current-employee.ts`
- Create: `src/server/auth/permissions.ts`
- Create: `src/server/repositories/table-repository.ts`
- Create: `src/server/repositories/session-repository.ts`
- Create: `src/server/repositories/pricing-repository.ts`
- Create: `src/server/repositories/audit-log-repository.ts`
- Create: `src/server/services/pricing-service.ts`
- Create: `src/server/services/session-service.ts`
- Create: `src/server/services/table-service.ts`
- Test: `tests/unit/session-service.test.ts`
- Test: `tests/unit/table-service.test.ts`

**Interfaces:**
- Produces: `SessionService`, `TableService`, `PricingService`, repository interfaces, `getCurrentEmployeeContext`, `requirePermission`.
- Consumes: Prisma schema from Task 2 and domain helpers from Task 3.

- [ ] **Step 1: Write failing service tests**

Create `tests/unit/session-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DomainError } from "@/server/domain/errors";
import { createSessionServiceForTests } from "./support/session-service-harness";

describe("SessionService", () => {
  it("starts a walk-in session only when the table is available", async () => {
    const { service, store } = createSessionServiceForTests();

    const result = await service.startWalkInSession({
      businessId: "business_1",
      employeeId: "employee_1",
      tableId: "table_available",
      durationMinutes: 60,
      now: new Date("2026-07-23T10:00:00.000Z")
    });

    expect(result.sessionId).toBeDefined();
    expect(store.tables.get("table_available")?.status).toBe("OCCUPIED");
  });

  it("rejects an extension that overlaps a future confirmed booking", async () => {
    const { service } = createSessionServiceForTests();

    await expect(
      service.extendSession({
        businessId: "business_1",
        employeeId: "employee_1",
        sessionId: "session_conflicting",
        addedMinutes: 60,
        now: new Date("2026-07-23T10:30:00.000Z")
      })
    ).rejects.toMatchObject<Partial<DomainError>>({
      code: "EXTENSION_CONFLICT"
    });
  });
});
```

Create `tests/unit/table-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DomainError } from "@/server/domain/errors";
import { createTableServiceForTests } from "./support/table-service-harness";

describe("TableService", () => {
  it("moves a cleaning table back to available", async () => {
    const { service, store } = createTableServiceForTests();

    await service.updateOperationalStatus({
      businessId: "business_1",
      employeeId: "employee_1",
      tableId: "table_cleaning",
      status: "AVAILABLE"
    });

    expect(store.tables.get("table_cleaning")?.status).toBe("AVAILABLE");
  });

  it("rejects an occupied table maintenance transition", async () => {
    const { service } = createTableServiceForTests();

    await expect(
      service.updateOperationalStatus({
        businessId: "business_1",
        employeeId: "employee_1",
        tableId: "table_occupied",
        status: "MAINTENANCE"
      })
    ).rejects.toMatchObject<Partial<DomainError>>({
      code: "INVALID_STATUS_TRANSITION"
    });
  });
});
```

- [ ] **Step 2: Run service tests and verify they fail**

Run: `npm test -- tests/unit/session-service.test.ts tests/unit/table-service.test.ts`

Expected: FAIL because services and test harnesses do not exist.

- [ ] **Step 3: Implement event and authorization primitives**

Create `src/server/domain/events.ts`:

```ts
export type DomainEventName =
  | "table.status_changed"
  | "session.started"
  | "session.paused"
  | "session.resumed"
  | "session.extended"
  | "session.ended";

export type DomainEvent = {
  name: DomainEventName;
  businessId: string;
  entityId: string;
  payload: Record<string, unknown>;
};

export type DomainEventPublisher = {
  publish(event: DomainEvent): Promise<void>;
};

export const noopDomainEventPublisher: DomainEventPublisher = {
  async publish() {
    return undefined;
  }
};
```

Create `src/server/auth/current-employee.ts`:

```ts
export type CurrentEmployeeContext = {
  businessId: string;
  employeeId: string;
  permissions: string[];
};

export async function getCurrentEmployeeContext(): Promise<CurrentEmployeeContext> {
  return {
    businessId: "seed-business",
    employeeId: "seed-employee",
    permissions: [
      "tables.read",
      "tables.update_status",
      "sessions.start",
      "sessions.pause",
      "sessions.resume",
      "sessions.extend",
      "sessions.end",
      "settings.update"
    ]
  };
}
```

Create `src/server/auth/permissions.ts`:

```ts
import { DomainError } from "@/server/domain/errors";
import type { CurrentEmployeeContext } from "./current-employee";

export function requirePermission(context: CurrentEmployeeContext, permission: string) {
  if (!context.permissions.includes(permission)) {
    throw new DomainError("UNAUTHORIZED", "You do not have permission to perform this action.", {
      permission
    });
  }
}
```

- [ ] **Step 4: Implement repository interfaces and Prisma-backed repositories**

Create repository files with interfaces first and Prisma implementations second. Use these signatures exactly:

```ts
export type TxClient = typeof import("@/server/db/prisma").prisma;
```

`TableRepository` methods:

```ts
findBoardTables(businessId: string): Promise<LiveTableRecord[]>;
findByIdForUpdate(input: { businessId: string; tableId: string; tx: TxClient }): Promise<TableRecord | null>;
updateStatus(input: { businessId: string; tableId: string; status: TableStatus; tx: TxClient }): Promise<void>;
```

`SessionRepository` methods:

```ts
createWalkInSession(input: CreateSessionInput): Promise<{ sessionId: string }>;
findActiveByTable(input: { businessId: string; tableId: string; tx: TxClient }): Promise<SessionRecord | null>;
findByIdForUpdate(input: { businessId: string; sessionId: string; tx: TxClient }): Promise<SessionRecord | null>;
findConflicts(input: { businessId: string; tableId: string; startsAt: Date; endsAt: Date; tx: TxClient }): Promise<ConflictRecord[]>;
extend(input: ExtendSessionRecordInput): Promise<void>;
end(input: EndSessionRecordInput): Promise<void>;
```

`PricingRepository` methods:

```ts
findRules(input: { businessId: string; gameType: GameType; pricingGroup: string }): Promise<PricingRule[]>;
```

`AuditLogRepository` methods:

```ts
record(input: { businessId: string; employeeId: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown>; tx: TxClient }): Promise<void>;
```

- [ ] **Step 5: Implement pricing, session, and table services**

`SessionService.startWalkInSession` must:

```ts
async startWalkInSession(input: StartWalkInSessionCommand): Promise<{ sessionId: string }> {
  return this.transaction(async (tx) => {
    const table = await this.tables.findByIdForUpdate({ businessId: input.businessId, tableId: input.tableId, tx });
    if (!table || table.status !== "AVAILABLE") {
      throw new DomainError("TABLE_NOT_AVAILABLE", "This table is not available for a new session.");
    }

    const startedAt = input.now;
    const plannedEndAt = addMinutes(startedAt, input.durationMinutes);
    const conflict = await this.sessions.findActiveByTable({ businessId: input.businessId, tableId: input.tableId, tx });
    if (conflict) {
      throw new DomainError("OVERLAPPING_SESSION", "This table already has an active session.");
    }

    const session = await this.sessions.createWalkInSession({ ...input, startedAt, plannedEndAt, tx });
    await this.tables.updateStatus({ businessId: input.businessId, tableId: input.tableId, status: "OCCUPIED", tx });
    await this.auditLogs.record({
      businessId: input.businessId,
      employeeId: input.employeeId,
      action: "session.started",
      entityType: "Session",
      entityId: session.sessionId,
      metadata: { tableId: input.tableId, plannedEndAt },
      tx
    });
    await this.events.publish({ name: "session.started", businessId: input.businessId, entityId: session.sessionId, payload: { tableId: input.tableId } });
    return session;
  });
}
```

`SessionService.extendSession` must:

```ts
async extendSession(input: ExtendSessionCommand): Promise<void> {
  return this.transaction(async (tx) => {
    const session = await this.sessions.findByIdForUpdate({ businessId: input.businessId, sessionId: input.sessionId, tx });
    if (!session || session.status !== "ACTIVE") {
      throw new DomainError("SESSION_NOT_ACTIVE", "Only an active session can be extended.");
    }

    const newPlannedEndAt = addMinutes(session.plannedEndAt, input.addedMinutes);
    const conflicts = await this.sessions.findConflicts({
      businessId: input.businessId,
      tableId: session.tableId,
      startsAt: session.plannedEndAt,
      endsAt: newPlannedEndAt,
      tx
    });
    if (conflicts.length > 0) {
      throw new DomainError("EXTENSION_CONFLICT", "A future booking prevents this extension.", {
        conflictId: conflicts[0]?.id
      });
    }

    await this.sessions.extend({ sessionId: session.id, previousPlannedEndAt: session.plannedEndAt, newPlannedEndAt, addedMinutes: input.addedMinutes, tx });
    await this.auditLogs.record({ businessId: input.businessId, employeeId: input.employeeId, action: "session.extended", entityType: "Session", entityId: session.id, metadata: { newPlannedEndAt }, tx });
    await this.events.publish({ name: "session.extended", businessId: input.businessId, entityId: session.id, payload: { newPlannedEndAt } });
  });
}
```

`TableService.updateOperationalStatus` must call `canTransitionTableStatus`, write audit logs, and publish `table.status_changed`.

- [ ] **Step 6: Add test harnesses**

Create `tests/unit/support/session-service-harness.ts` and `tests/unit/support/table-service-harness.ts` using in-memory Maps for tables, sessions, bookings, and audit entries. The harnesses must implement the repository interfaces from Step 4, not ad hoc service-only shortcuts.

- [ ] **Step 7: Run service tests and checks**

Run: `npm test -- tests/unit/session-service.test.ts tests/unit/table-service.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/server tests/unit/session-service.test.ts tests/unit/table-service.test.ts tests/unit/support
git commit -m "feat: add live table session services"
```

---

### Task 5: Add Live Table Query, Actions, and Board View

**Files:**
- Create: `src/features/live-tables/types.ts`
- Create: `src/features/live-tables/queries.ts`
- Create: `src/features/live-tables/actions.ts`
- Create: `src/app/(admin)/live-tables/page.tsx`
- Create: `src/features/live-tables/components/live-table-page.tsx`
- Create: `src/features/live-tables/components/table-board-toolbar.tsx`
- Create: `src/features/live-tables/components/table-grid.tsx`
- Create: `src/features/live-tables/components/table-card.tsx`
- Create: `src/features/live-tables/components/table-status-menu.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/menu.tsx`
- Test: `tests/components/live-table-page.test.tsx`

**Interfaces:**
- Produces: live table board UI and server actions for session/table mutations.
- Consumes: `TableService`, `SessionService`, and schemas from Tasks 3 and 4.

- [ ] **Step 1: Write failing board component test**

Create `tests/components/live-table-page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveTablePage } from "@/features/live-tables/components/live-table-page";

describe("LiveTablePage", () => {
  it("renders table states and primary session actions", () => {
    render(
      <LiveTablePage
        tables={[
          {
            id: "table_1",
            number: "P1",
            gameType: "POOL",
            status: "AVAILABLE",
            currentSession: null
          },
          {
            id: "table_2",
            number: "S1",
            gameType: "SNOOKER",
            status: "OCCUPIED",
            currentSession: {
              id: "session_1",
              customerName: "Riya Shah",
              plannedEndAt: "2026-07-23T11:00:00.000Z",
              billEstimate: 450,
              assignedStaffName: "Aarav Manager"
            }
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Live Tables" })).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("S1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start session for table P1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End session for table S1" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run component test and verify it fails**

Run: `npm test -- tests/components/live-table-page.test.tsx`

Expected: FAIL because `LiveTablePage` does not exist.

- [ ] **Step 3: Implement live table types, query, and actions**

Create `src/features/live-tables/types.ts`:

```ts
export type LiveTableStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";
export type LiveTableGameType = "POOL" | "SNOOKER";

export type LiveTableCardData = {
  id: string;
  number: string;
  gameType: LiveTableGameType;
  status: LiveTableStatus;
  currentSession: null | {
    id: string;
    customerName: string | null;
    plannedEndAt: string;
    billEstimate: number;
    assignedStaffName: string | null;
  };
};
```

Create `src/features/live-tables/queries.ts`:

```ts
import { prisma } from "@/server/db/prisma";
import type { LiveTableCardData } from "./types";

export async function getLiveTableBoard(businessId: string): Promise<LiveTableCardData[]> {
  const tables = await prisma.clubTable.findMany({
    where: { businessId },
    orderBy: [{ gameType: "asc" }, { number: "asc" }],
    include: {
      sessions: {
        where: { status: { in: ["ACTIVE", "PAUSED"] } },
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { customer: true, assignedEmployee: true }
      }
    }
  });

  return tables.map((table) => {
    const session = table.sessions[0];
    return {
      id: table.id,
      number: table.number,
      gameType: table.gameType,
      status: table.status,
      currentSession: session
        ? {
            id: session.id,
            customerName: session.customer?.name ?? null,
            plannedEndAt: session.plannedEndAt.toISOString(),
            billEstimate: Number(session.billableSecondsSnapshot),
            assignedStaffName: session.assignedEmployee?.name ?? null
          }
        : null
    };
  });
}
```

Create `src/features/live-tables/actions.ts` as server actions that parse schemas, load employee context, require permissions, call services, and return `{ ok: true }` or `{ ok: false, message: string }`.

- [ ] **Step 4: Implement badge, menu, toolbar, grid, and table card**

Create `src/components/ui/badge.tsx`:

```tsx
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-neutral-100 text-neutral-700",
  success: "bg-green-50 text-success",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-danger",
  info: "bg-blue-50 text-primary"
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}
```

Create `src/features/live-tables/components/table-card.tsx` with:

```tsx
export function TableCard({ table }: { table: LiveTableCardData }) {
  const isOccupied = table.status === "OCCUPIED" && table.currentSession;
  return (
    <article className="rounded-material border border-outline bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{table.number}</h2>
          <p className="text-sm text-neutral-500">{table.gameType === "POOL" ? "Pool" : "Snooker"}</p>
        </div>
        <StatusBadge status={table.status} />
      </div>
      <div className="mt-4 min-h-20 text-sm text-neutral-700">
        {isOccupied ? (
          <div className="space-y-1">
            <p className="font-medium">{table.currentSession.customerName ?? "Walk-in customer"}</p>
            <p>Ends {new Date(table.currentSession.plannedEndAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
            <p>Staff {table.currentSession.assignedStaffName ?? "Unassigned"}</p>
          </div>
        ) : (
          <p className="text-neutral-500">No active session</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {isOccupied ? (
          <button className="h-9 rounded-material bg-primary px-3 text-sm font-medium text-white" aria-label={`End session for table ${table.number}`}>
            End session
          </button>
        ) : (
          <button className="h-9 rounded-material bg-primary px-3 text-sm font-medium text-white" aria-label={`Start session for table ${table.number}`}>
            Start session
          </button>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Implement `LiveTablePage` and route**

`LiveTablePage` must render the heading, status counts, filters, and `TableGrid`.

Create `src/app/(admin)/live-tables/page.tsx`:

```tsx
import { getCurrentEmployeeContext } from "@/server/auth/current-employee";
import { getLiveTableBoard } from "@/features/live-tables/queries";
import { LiveTablePage } from "@/features/live-tables/components/live-table-page";

export default async function LiveTablesRoute() {
  const context = await getCurrentEmployeeContext();
  const tables = await getLiveTableBoard(context.businessId);
  return <LiveTablePage tables={tables} />;
}
```

- [ ] **Step 6: Run component test and checks**

Run: `npm test -- tests/components/live-table-page.test.tsx`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/live-tables src/app src/components/ui tests/components/live-table-page.test.tsx
git commit -m "feat: add live table board"
```

---

### Task 6: Add Session Dialogs, Forms, and Mutation Feedback

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/field.tsx`
- Create: `src/components/ui/snackbar.tsx`
- Create: `src/features/sessions/components/start-walk-in-dialog.tsx`
- Create: `src/features/sessions/components/extend-session-dialog.tsx`
- Create: `src/features/sessions/components/end-session-dialog.tsx`
- Modify: `src/features/live-tables/components/table-card.tsx`
- Modify: `src/features/live-tables/components/live-table-page.tsx`
- Test: `tests/components/session-dialogs.test.tsx`

**Interfaces:**
- Produces: accessible dialogs and form components wired to Phase 1 server actions.
- Consumes: server actions from Task 5 and schemas from Task 3.

- [ ] **Step 1: Write failing dialog tests**

Create `tests/components/session-dialogs.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StartWalkInDialog } from "@/features/sessions/components/start-walk-in-dialog";

describe("StartWalkInDialog", () => {
  it("shows validation feedback for missing required fields", async () => {
    const user = userEvent.setup();

    render(<StartWalkInDialog tableId="table_1" tableNumber="P1" open onOpenChange={() => undefined} />);
    await user.click(screen.getByRole("button", { name: "Start session" }));

    expect(screen.getByText("Choose a duration.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run dialog test and verify it fails**

Run: `npm test -- tests/components/session-dialogs.test.tsx`

Expected: FAIL because dialog components do not exist.

- [ ] **Step 3: Implement accessible UI primitives**

Create `Dialog`, `Field`, and `Snackbar` components with semantic labels, `role="dialog"`, `aria-modal="true"`, visible labels, and keyboard-close behavior for Escape.

- [ ] **Step 4: Implement session dialogs**

`StartWalkInDialog` uses React Hook Form and `startWalkInSessionSchema`. The form fields are:

```tsx
<Field label="Customer name" error={errors.customerName?.message}>
  <input {...register("customerName")} />
</Field>
<Field label="Phone" error={errors.customerPhone?.message}>
  <input {...register("customerPhone")} />
</Field>
<Field label="Duration" error={errors.durationMinutes?.message ?? durationError}>
  <select {...register("durationMinutes", { valueAsNumber: true })}>
    <option value="">Select duration</option>
    <option value={30}>30 minutes</option>
    <option value={60}>1 hour</option>
  </select>
</Field>
```

`ExtendSessionDialog` provides 30 and 60 minute choices and shows `EXTENSION_CONFLICT` messages from server actions.

`EndSessionDialog` confirms the current table, customer, planned end time, and draft invoice note before calling `endSessionAction`.

- [ ] **Step 5: Wire dialogs into table cards**

Available cards open `StartWalkInDialog`. Occupied cards show `End`, `Extend`, `Pause`, and `Resume` controls based on session state.

- [ ] **Step 6: Run component tests and accessibility checks**

Run: `npm test -- tests/components/session-dialogs.test.tsx tests/components/live-table-page.test.tsx`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui src/features/sessions src/features/live-tables tests/components/session-dialogs.test.tsx
git commit -m "feat: add session operation dialogs"
```

---

### Task 7: Add Integration and E2E Coverage for Critical Flows

**Files:**
- Create: `tests/integration/session-lifecycle.test.ts`
- Create: `tests/e2e/live-tables.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: critical workflow coverage for session start, extension conflict, end session, and table board rendering.
- Consumes: complete app behavior from Tasks 1 through 6.

- [ ] **Step 1: Write integration tests**

Create `tests/integration/session-lifecycle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";

describe("session lifecycle integration", () => {
  it("seeded database has live tables and pricing", async () => {
    const tables = await prisma.clubTable.findMany({ where: { businessId: "seed-business" } });
    const pricing = await prisma.tablePricing.findMany({ where: { businessId: "seed-business" } });

    expect(tables.length).toBeGreaterThanOrEqual(12);
    expect(pricing.length).toBe(4);
  });
});
```

- [ ] **Step 2: Write E2E smoke test**

Create `tests/e2e/live-tables.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("staff can view the live table board", async ({ page }) => {
  await page.goto("/live-tables");
  await expect(page.getByRole("heading", { name: "Live Tables" })).toBeVisible();
  await expect(page.getByText("Pool")).toBeVisible();
  await expect(page.getByText("Snooker")).toBeVisible();
});
```

- [ ] **Step 3: Run integration test and verify database dependency**

Run: `docker compose up -d postgres`

Run: `npm run prisma:migrate`

Run: `npm run prisma:seed`

Run: `npm test -- tests/integration/session-lifecycle.test.ts`

Expected: PASS.

- [ ] **Step 4: Run E2E test**

Run: `npm run test:e2e -- tests/e2e/live-tables.spec.ts`

Expected: PASS in Chromium and tablet projects.

- [ ] **Step 5: Run full verification**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/integration tests/e2e package.json package-lock.json
git commit -m "test: cover live table lifecycle"
```

---

### Task 8: Polish UI Responsiveness and Operational States

**Files:**
- Modify: `src/features/live-tables/components/live-table-page.tsx`
- Modify: `src/features/live-tables/components/table-board-toolbar.tsx`
- Modify: `src/features/live-tables/components/table-grid.tsx`
- Modify: `src/features/live-tables/components/table-card.tsx`
- Modify: `src/features/live-tables/components/table-status-menu.tsx`
- Modify: `src/styles/globals.css`
- Test: `tests/components/live-table-page.test.tsx`
- Test: `tests/e2e/live-tables.spec.ts`

**Interfaces:**
- Produces: final Phase 1 staff-friendly UI polish and responsive behavior.
- Consumes: working board and dialog components from Tasks 5 and 6.

- [ ] **Step 1: Extend tests for status controls and tablet layout**

Update `tests/components/live-table-page.test.tsx` with:

```tsx
it("shows status counts without relying on color alone", () => {
  render(
    <LiveTablePage
      tables={[
        { id: "1", number: "P1", gameType: "POOL", status: "AVAILABLE", currentSession: null },
        { id: "2", number: "P2", gameType: "POOL", status: "CLEANING", currentSession: null },
        { id: "3", number: "S1", gameType: "SNOOKER", status: "MAINTENANCE", currentSession: null }
      ]}
    />
  );

  expect(screen.getByText("Available")).toBeInTheDocument();
  expect(screen.getByText("Cleaning")).toBeInTheDocument();
  expect(screen.getByText("Maintenance")).toBeInTheDocument();
});
```

Update `tests/e2e/live-tables.spec.ts` with:

```ts
test("table cards remain usable on tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto("/live-tables");
  await expect(page.getByRole("heading", { name: "Live Tables" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start session for table/ }).first()).toBeVisible();
});
```

- [ ] **Step 2: Run updated tests and verify they fail if UI lacks counts or tablet controls**

Run: `npm test -- tests/components/live-table-page.test.tsx`

Run: `npm run test:e2e -- tests/e2e/live-tables.spec.ts`

Expected: FAIL until the missing status count or responsive behavior is implemented.

- [ ] **Step 3: Polish toolbar, grid, and cards**

Implement:

- Compact status count chips with text labels.
- Grid tracks using `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`.
- Stable card dimensions with `min-h` for session info.
- Text wrapping for customer names and staff names.
- Menus with visible labels and Material Symbols icons.
- State badges that include text labels, not only color.

- [ ] **Step 4: Run final verification**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `npm run test:e2e`

Expected: all commands PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/live-tables src/styles/globals.css tests/components/live-table-page.test.tsx tests/e2e/live-tables.spec.ts
git commit -m "polish: refine live table operations UI"
```

---

## Self-Review Notes

- Spec coverage: Tasks cover scaffold, Prisma schema, seed data, services, backend-safe timing, overlap/extension rules, table operations, live table UI, session dialogs, tests, and visual polish.
- Deferred scope: POS, inventory, customer portal, kitchen orders, PDF rendering, reports, landing website, transfer table, payment collection, and Socket.io push are intentionally excluded per the approved design.
- Type consistency: `LiveTableCardData`, `SessionService`, `TableService`, `DomainError`, and Zod schema names are consistent across tasks.
- Risk: exact package versions may need minor adjustment during `npm install` if current peer dependencies have changed. Keep the stack shape and scripts intact while resolving install-time compatibility.

# Test-Enrichment Audit — Phase 1 (Gap Report)

- Status: **research only** — no test or production code was changed.
- Date: 2026-08-17 · Branch: `wt/test-enrichment/test-gap-audit`
- Demand: "har chhoti si chij ka test case chahiye" → file-by-file / function-by-function
  coverage map of the whole `src/` tree against the vitest gate
  (`tests/unit` + `tests/components`).

## 1. Verified baseline (ran today)

| Check | Result |
|---|---|
| `npm run typecheck` | OK — 0 errors |
| `npx vitest run tests/unit tests/components` (gate) | OK — **30 files / 143 tests passed** (3.9s, jsdom; DB-free) |
| `tests/unit` | 19 files / **104 tests** |
| `tests/components` | 11 files / **39 tests** |
| `tests/integration` (real Neon DB — *not* a gate) | 2 files / 5 tests, state-dependent |
| `tests/e2e` (playwright) | 2 spec files / 3 scenarios (not run here) |
| Source tree | 109 files (56 `.ts`, 53 `.tsx`) |
| Source files directly imported by gate tests | ~35 (~32%) |
| Source files with **zero** unit/component coverage | **~74 (68%)**; ~54 contain real logic (actions/queries/services/routes/utils), the rest are thin page shells |

> Phase-1.5 follow-up (branch `wt/test-enrichment/fix-hq-analytics-db`): the warning below is
> **resolved** — `tests/unit/hq-analytics.test.ts` no longer touches Neon. The service's prisma
> calls are mocked (`vi.mock("@/server/db/prisma")` with in-memory fixtures), so the gate
> (`tests/unit` + `tests/components`) is now 100% DB-free and standalone-green; only
> `tests/integration/*` still hit the real Neon DB.

## 2. Coverage matrix — area vs existing tests vs gaps vs priority

Priority: **P0** security/payment/money-critical · **P1** core domain & feature logic ·
**P2** UI states & small components · **P3** pure utils / plumbing.

| Area | Existing tests (gate) | Gaps | Priority |
|---|---|---|---|
| **API routes** (`src/app/api/*`) | none | login, logout, magic-login, razorpay/stripe webhooks, qr image route — zero route tests | P0 |
| **Middleware** (`src/middleware.ts`) | none | authn/authz guard, password-change guard, demo-identity logic | P0 |
| **server/auth** | auth-service (7), authorization (3), current-employee (3), routes (1) | `rate-limit.ts` (2 fns: checkRateLimit, clientIpFromRequest), `permissions.ts` (requirePermission) untested | P0 |
| **server/integrations** | base-url (10) | `payments.ts` (7 fns incl. webhook signatures), `qr.ts`, `whatsapp.ts` (5 fns) | P0 |
| **server/services** | table-service (2), session-service (4), hq-analytics (4, prisma-mocked) | `pricing-service.ts` (estimateTableCharge) | P0 |
| **server/repositories** | interfaces exercised via in-memory harnesses | prisma adapters (table/session/pricing/audit-log) never tested directly | P1 |
| **server/domain** | bill-summary (2), booking-settings (22), booking-slots (15), session-calculations (5), table-transitions (2) | `errors.ts`, `events.ts` (noop publisher) trivial gaps | P2 |
| **server/db** | prisma-schema (7, schema-file assertions) | `connection.ts` (getDatabaseParts/buildDatabaseUrl), `prisma.ts` bootstrap | P3 |
| **src/lib** | none | `cn.ts`, `money.ts`, `time.ts` — zero tests | P3 |
| **components/ui** | dialog (6), toast (9) | badge, button, field, menu — zero tests | P2 |
| **components/app** | admin-shell (4) | store-switcher, demo-account-switcher — zero tests | P2 |
| **App pages** | change-password (3) | home (430 ln), login, magic-login + builder (455 ln), docs viewer (481 ln), admin pages, hq, platform setup pages, demo persona UI (308 ln), book/[slug] | P1/P2 |
| **features/auth** | change-password page test (action **mocked**) | `changePasswordAction` itself never unit-tested | P0 |
| **features/booking** | BookPageView (1, action mocked) | 6 actions, 5 queries (only type-imported), staff-bookings widget; failure/loading states | P0 |
| **features/live-tables** | LiveTablePage (3) | 10 actions, 3 queries (getLiveTableBoard covered by integration only), 7 subcomponents incl. live-clock fns | P0 |
| **features/tables** | pricing-groups + schemas (7) | 3 actions & getBookableItems (integration only), bookable-items-page (229 ln) | P1 |
| **features/sessions** | schemas (8 of 14), 2 dialogs (5) | end/extend/add-item dialogs (3), 6 schemas incl. rateFormSchema & tableStatusSchema | P1 |
| **features/settings** | MenuSettingsPage (1) | 4 actions, failure states | P1 |
| **features/rates** | mapRateSettings (1), RatesPage (2) | updateHourlyRateAction, getRateSettings, error/empty states | P1 |
| **features/platform** | 3 page components (3) | 2 setup actions (createSaasSetupAction/createFranchiseSetupAction), TemporaryCredential | P1 |
| **features/dashboard** | buildOwnerDashboardData (2), OwnerDashboardPage (1) | getOwnerDashboardData wrapper; empty dashboard state | P2 |
| **features/hq + docs** | hq-analytics service (4, prisma-mocked) | HqMasterDashboard (151 ln), DocsViewer (481 ln) | P2 |
| **Whole-tree totals** | 140 tests on ~35 of 109 files | ~74 files uncovered; zero route/middleware/action tests at unit level | — |

## 3. File-by-file gap registry (concrete suggested cases)

### 3.1 API routes + middleware — all untested (P0)

| File | Exports | Suggested cases |
|---|---|---|
| `src/app/api/auth/login/route.ts` | `POST` | happy path sets `auth_session` cookie + redirectUrl per accountType (PLATFORM_ADMIN→/platform/setup, HQ_ADMIN→/hq/dashboard, mustChangePassword→/change-password, else /dashboard); 400 missing email/password; 401 inactive employee / no passwordHash / wrong password; 429 after 10 attempts (rate-limit); 500 on prisma throw; demo cookies only when `NODE_ENV !== "production"`; email matched case-insensitively + trimmed |
| `src/app/api/auth/logout/route.ts` | `POST` | clears `auth_session` (and demo cookies); returns success JSON |
| `src/app/api/auth/magic-login/route.ts` | `GET` (module-private helpers `devAccessKey`/`isMagicLoginEnabled`/`matchesAccessKey` — exercise through GET) | disabled → redirect `?error=disabled`; wrong key → `?error=invalid_key`; timing-safe compare equal-length requirement; rate-limit `?error=rate_limited`; missing email → /magic-login; unknown/inactive employee → `?error=user_not_found`; success sets cookie + redirects to role route; store override param used |
| `src/app/api/integrations/razorpay/webhook/route.ts` | `POST` | missing/bad signature → 503 (must not touch DB); valid sig + `payment_link.paid` → booking with matching `paymentExternalId` marked PAID; unknown event → `{received:true}` no DB write; invalid JSON body → handled 503/error path |
| `src/app/api/integrations/stripe/webhook/route.ts` | `POST` | 503 on missing/bad sig; `checkout.session.completed` matches by `paymentExternalId`/`id`/`id.endsWith(reference)`; unknown type no-op; malformed body |
| `src/app/qr/book/[slug]/route.ts` | `GET` | 404 unknown slug; 200 image/png + `Cache-Control: public, max-age=3600`; base-url resolution from request host |
| `src/middleware.ts` | `middleware` | public routes pass through (`/login`, `/book/*`, `/qr/*`, `/docs`, `/api/auth`, `/api/integrations`); unauthenticated API → 401 JSON vs page → redirect /login; valid token → pass; `/login` while authenticated → redirect by role (incl. demo-email platform/hq detection in dev); mustChangePassword guard → /change-password (except `/api/`); `/platform` guard → non-admin to /dashboard; `/hq` guard allows HQ+PLATFORM; invalid/tampered token treated as unauthenticated |

### 3.2 App pages — change-password (3 tests) is the only covered page (P1/P2)

| File (lines) | Coverage | Suggested cases |
|---|---|---|
| `src/app/page.tsx` (430) | none | render marketing/home sections; links to /docs and /login; no crash with missing demo data |
| `src/app/login/page.tsx` (103) | none | renders form; submit calls `POST /api/auth/login`; error display; Enter-to-submit |
| `src/app/magic-login/page.tsx` + `magic-login-builder.tsx` (455) | none | renders `?error=` variants (disabled/invalid_key/rate_limited/user_not_found); form fields call magic login URL; copy/empty states |
| `src/app/docs/page.tsx` + `features/docs/docs-viewer.tsx` (481) | none | renders doc list; empty docs state; renders markdown content; nav/active states |
| `src/app/book/[slug]/page.tsx` | none (BookPageView covered) | thin server page — slug lookup 404 vs catalog render (needs query mocking) |
| `src/app/(admin)/dashboard|live-tables|tables|bookings|rates|settings/page.tsx` | none | thin shells — render data pass-through, loading/empty/error states at page level |
| `src/app/(admin)/platform/setup*, hq/dashboard, demo` pages + `persona-selector-ui.tsx` (308) | none | persona switcher renders accounts, copies creds, empty list; page shells pass-through |
| `src/app/(admin)/layout.tsx`, `src/app/layout.tsx` | none | root layout renders children; admin layout guards (needs mock) |

### 3.3 Shared UI/components (P2)

| File | Coverage | Suggested cases |
|---|---|---|
| `components/ui/badge.tsx` | none | renders label; each `tone` maps to class; default neutral |
| `components/ui/button.tsx` | none | renders variants/sizes; disabled state; `asChild`/link usage; type passthrough; onClick fires |
| `components/ui/field.tsx` | none | label+error rendering; `textInputProps()` ids/aria wiring (invalid w/ error text, describedby) |
| `components/ui/menu.tsx` | none | MenuGroup renders children; empty group |
| `components/ui/dialog.tsx` | 6 tests (escape, backdrop, focus trap, scroll lock, focus restore, initial focus) | **gaps:** open/close animation states, no-onClose-when-closed no-throw, children render only when open |
| `components/ui/toast.tsx` | 9 tests (show, auto-hide, stack, hover-pause, escape, role=alert, no-provider no-throw, closable) | **gaps:** success/info tones, toast while provider re-renders, long message truncation |
| `components/app/admin-shell.tsx` | 4 tests | **gaps:** mobile nav toggle, active-route highlight, sign-out flow |
| `components/app/store-switcher.tsx` (134) | none | renders current store; menu opens; switching calls callback + router; no stores → fallback |
| `components/app/demo-account-switcher.tsx` (224) | none | renders demo accounts; switching sets cookie via route; empty state |

### 3.4 Features — actions/queries (all server-side, DB-touching) (P0/P1)

The single biggest structural gap: **no gate test mocks `@/server/db/prisma`**. All feature
actions/queries are prisma-importing modules, so today they are covered **only** by
`tests/integration/*` (real Neon) or by component tests that mock them away entirely.

| Feature file | Exports | Coverage | Suggested cases |
|---|---|---|---|
| `features/auth/actions.ts` | `changePasswordAction` | none (mocked in page test) | wrong current password → `{ok:false}`, success path sets `mustChangePassword=false` + session cookie, prisma error → failure result not throw, zod reject |
| `features/booking/actions.ts` (380 ln) | `createPublicBookingAction`, `listBookableSlotsAction`, `confirmBookingAction`, `cancelBookingAction`, `markBookingPaidAction`, `updateBookingSettingsAction` | none | per action: happy path, invalid input (zod), missing business/slug, booking disabled, conflict slot, payment-link creation when advance>0 & provider configured, whatsapp notify failure tolerated, permission errors |
| `features/booking/queries.ts` (267 ln) | `ensureBookingSettingsFor`, `getPublicBookCatalog`, `listBookableSlots`, `getUpcomingBookings`, `getUpcomingBookingBadges`, `toLocalDateKey` re-export | type-only import in one test | catalog null for unknown slug; disabled/closed windows; slot list ordering & boundary times; badge counts by status |
| `features/booking/components/staff-bookings.tsx` (155) | `StaffBookingsPanel` | none | renders list; empty state; cancel/confirm buttons callbacks; badges |
| `features/live-tables/actions.ts` (415 ln) | 10 actions (startWalkIn, extend, end, addBillItem, addSessionItem, removeBillItem, closeBill+continue, startCounterBill, closeCounterBill, updateTableStatus) | none | mirror `SessionService` tests: each action zod-validates, calls service, maps `DomainError`→`{ok:false,message}`, propagates unexpected errors; session-not-found, table-occupied conflict, paused/end edge cases |
| `features/live-tables/queries.ts` (181 ln) | `getLiveTableBoard`, `getOpenCounterBills`, `getProductOptions` | integration only (getLiveTableBoard) | empty business (no tables/bills); ordering by gameType/number; recentBills cap 25; bill summary math per table |
| `features/tables/actions.ts` | create/update/setActive bookable item | integration only | duplicate number; unknown id; inactive item reactivation; zod reject |
| `features/tables/queries.ts` | `getBookableItems` | integration only | active/inactive filtering, ordering |
| `features/tables/components/bookable-items-page.tsx` (229) | `BookableItemsPage` | none | render table rows; empty state; add/edit form validation display; active toggle |
| `features/rates/actions.ts` | `updateHourlyRateAction` | none | invalid rule id, missing rule row, success result |
| `features/rates/queries.ts` | `mapRateSettings` (tested 1), `getRateSettings` | map only | `getRateSettings` with no rules → defaults; unknown gameType/pricingGroup ordering |
| `features/settings/actions.ts` | updateBookingSettings, createOrUpdateProduct, deactivateProduct, updateBranding | none | each: zod reject, not-found, success; deactivate on product with open bill items |
| `features/platform/actions.ts` (522 ln) | `createSaasSetupAction`, `createFranchiseSetupAction` | none | form parsing, transaction failure rollback, slug uniqueness conflict, temporary credential generation |
| `features/dashboard/queries.ts` | `getOwnerDashboardData` | wrapper untested (build fn tested) | DB fetch + `buildOwnerDashboardData` composition; empty day |

### 3.5 Features — client components lacking coverage (P1/P2)

| File | Suggested cases |
|---|---|
| `sessions/components/add-session-item-dialog.tsx` (113), `end-session-dialog.tsx`, `extend-session-dialog.tsx` | covered siblings: start-walk-in (2), start-counter-bill (3). Mirror those: validation, Enter submit, Escape close, action failure message |
| `live-tables/components/live-clock.tsx` | **pure fns `formatElapsed`/`formatDigitalElapsed` untested** (0→"00:00", 3661→"1:01:01", negative clamp); component: tick updates, variant digital |
| `live-tables/components/table-card.tsx` (216), `table-grid.tsx`, `table-status-menu.tsx`, `table-board-toolbar.tsx`, `booking-countdown.tsx`, `booking-qr-dialog.tsx` | empty grid; card occupied/available states (partially via page test); status menu open/cancel/apply; countdown expiry; QR dialog copy/close |
| `platform/components/temporary-credential.tsx` | renders label+value, copy button |
| `hq/components/HqMasterDashboard.tsx` (151) | outlet summary rows, empty organization, peak-hours bars |
| `dashboard/components/owner-dashboard-page.tsx` | 1 test exists — add zero-revenue day, empty sessions |

### 3.6 src/lib + server plumbing (P3)

| File | Suggested cases |
|---|---|
| `lib/cn.ts` | merges conflicting tailwind classes (e.g. `p-1`+`p-4`→`p-4`); falsy values dropped |
| `lib/money.ts` | `formatMoney(350)` → "₹350.00"; decimals; negative; custom currency |
| `lib/time.ts` | `addMinutes` DST/day-crossing; `formatClockTime` pads hours |
| `server/db/connection.ts` | `getDatabaseParts` parses URLs; `buildDatabaseUrl` env-override without leaking secrets |
| `server/domain/errors.ts`, `events.ts` | DomainError code/message/context; noop publisher returns/records nothing |
| `server/auth/rate-limit.ts` | window expiry resets counter; limit boundary (limit-1 ok, limit+1 blocked); `clientIpFromRequest` x-forwarded-for multi-ip, x-real-ip fallback, "unknown" |
| `server/auth/permissions.ts` | mustChangePassword blocks unless `allowPasswordChange`; missing permission throws DomainError UNAUTHORIZED |
| `server/integrations/qr.ts` | generates PNG buffer; rejects on bad slug |
| `server/integrations/whatsapp.ts` | unconfigured → false (no fetch); non-ok response → false; network throw → false; image type payload shape |
| `server/integrations/payments.ts` | **P0:** `verifyRazorpayWebhookSignature`/`verifyStripeWebhookSignature` valid+tampered+missing-secret; `isPaymentProviderConfigured` per provider; `paymentEnabledForBooking` advance=0 → false; `getActivePaymentProvider`; `createBookingPaymentLink` razorpay/stripe fetch mock incl. non-2xx throw; `isWebhookEnabled` |
| `server/repositories/*` (prisma adapters, 4 files) | map query args between domain and prisma shapes; transaction use for session lifecycle (via harness DI — extend harnesses with prisma-mock or adapter-level tests) |
| `server/services/pricing-service.ts` | 30/60-min rule lookup, missing rules → ₨0 fallback, half-hour only |

## 4. Testing conventions review (current state)

**Verified config**
- `vitest.config.ts`: jsdom env, `globals: true`, setup file `tests/setup.ts`, excludes
  `node_modules`, `.next`, `.worktrees`, `tests/e2e`. Gate = `tests/unit` + `tests/components`
  (per AGENTS.md / `wt.sh`). Alias `@` → `src`.
- `tests/setup.ts` is minimal: jest-dom matchers + a single `next/navigation` mock
  (`useRouter` → `refresh/push/replace`). Nothing else is centralized.

**Mocking patterns in use (good, to keep)**
1. *Component tests* — dependency-injected props + `vi.hoisted`/`vi.mock` for the feature
   action module (see `book-page.test.tsx`, `rates-page.test.tsx`, `session-dialogs.test.tsx`,
   `change-password.test.tsx`). Actions are never callable with real DB in the gate.
2. *Service tests* — constructor-injected repositories with in-memory fakes
   (`tests/unit/support/in-memory-store.ts`, `session-service-harness.ts`,
   `table-service-harness.ts`). This is the correct pattern for DB-touching logic and the
   natural home for future action tests: extract/DI or mock `PricingService`/`SessionService`
   per test.
3. *Pure domain* — direct import tests with explicit dates passed as args
   (no `vi.useFakeTimers` reliance; `now` is injected — keep doing this).
4. *Server helpers* — `vi.spyOn(module, ...)` for `getCurrentEmployeeContext`
   (`authorization.test.ts`).

**Gaps in conventions**
- Until phase 1.5 there was **no unit-level mock of `@/server/db/prisma`** anywhere;
  `hq-analytics.test.ts` now carries the first one (module-mocked prisma + in-memory fixtures).
  Phase 2 should extract a shared `mockPrisma` helper (per-module `vi.mock("@/server/db/prisma")`)
  so every action gets `{ok:false}`-path tests without a DB.
- `request`/`NextRequest` in route tests: no helper exists yet. Suggest `tests/unit/support/`
  additions: `makeRequest(url, {headers, body, method})` + cookie assertion helper
  (`response.headers.getSetCookie()`).
- **No `next/headers`, `next/cache`, or `next/server` mocks centralized**; integration tests
  mock `next/cache` locally — should move to `tests/setup.ts` or a shared support file.
- Deterministic env: tests toggle `process.env` (webhook secrets, NODE_ENV) inline — consider
  a `withEnv()` helper that saves/restores env per test. Be careful: `setup.ts` globals are
  shared, so env must be reset in `afterEach`.
- Locale/scheduler sensitivity: `money.ts`/`time.ts` use `Intl` (en-IN) — fine in tests only
  if the runner locale is stable; pin `process.env.TZ` in setup for `booking-slots`/clock tests.
- Only `tests/integration/*` hit the real Neon DB and are state-dependent (seed
  `org-blackball-franchise`); never trust them as a pass/fail gate. The hq-analytics test was
  the last DB-toucher inside the gate — fixed in phase 1.5 by mocking `@/server/db/prisma`
  (unit gate is now verifiably DB-free).

## 5. Suggested phase-2 plan (test-writing, not done here)

1. **P0 security layer (highest ROI)**: middleware guard tests; login/magic-login/webhook
   route tests with prisma mock; `rate-limit.ts`, `permissions.ts`, `payments.ts` signature
   verifiers; `changePasswordAction` (3 new files, ~40 cases).
2. **P0 money paths**: `booking/actions.ts` (± payment-link + whatsapp branches),
   `live-tables/actions.ts` via SessionService/TableService mocks (~35 cases).
3. **P1 feature logic**: `settings/actions.ts`, `rates/actions.ts`, `tables/actions.ts`,
   `platform/actions.ts`, remaining `sessions/schemas.ts` (6 schemas), `pricing-service.ts`.
4. **P1 UI**: 3 session dialogs, live-clock pure fns, bookable-items-page, staff-bookings.
5. **P2 UI**: ui/badge|button|field|menu, store/demo switchers, HqMasterDashboard, docs-viewer,
   magic-login-builder, persona-selector, home/login pages.
6. **P3 plumbing**: lib (cn/money/time), db/connection, qr/whatsapp, repository adapters.
7. **Housekeeping**: hq-analytics unit test converted to prisma-mocked (done, phase 1.5);
   extract shared `mockPrisma` + `makeRequest` support helpers; add `withEnv()` helper.

Target after phase 2: every `src/features/*` action & query with ≥1 happy + ≥1 failure case,
every route with status-code assertions, every ui component with a render test — i.e. the
"har chhoti si chij" bar.

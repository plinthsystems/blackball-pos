# Application Walkthrough Guide — BlackBall POS

Complete page-by-page, feature-by-feature guide covering every user story and use case.
Use this as a demo script, test checklist, and onboarding reference.

---

## 0. How to run the app

```bash
# 1. Start the database (docker)
docker compose up -d postgres

# 2. Apply schema + seed demo data
npx prisma migrate status        # expect: "Database schema is up to date!"
npx prisma db seed               # creates 12 demo accounts + outlets

# 3. Start the dev server
npm run dev                      # http://localhost:3000

# Optional: fresh re-run / reset demo data
# npx prisma migrate reset && npx prisma db seed
```

Magic login is now opt-in everywhere. Local dev uses (already in `.env`):
`MAGIC_LOGIN_ENABLED=true` + `DEV_ACCESS_KEY=bhaarati-local-dev-key`

---

## 1. Personas & Permission Matrix

| # | Persona | Email | Password | Can |
|---|---|---|---|---|
| 1 | **Public visitor / Customer** | — (no login) | — | Landing, booking page, QR, docs |
| 2 | **Store Staff** | `staff@cueclub.example` | `Password@123` | Live tables: start/pause/resume/extend/end sessions, add items, bills |
| 3 | **Store Manager** | `manager.mgroad@blackball.example` | `Password@123` | Staff + dashboard, rates, settings, tables (bookable items), bookings manage |
| 4 | **Store Owner** | `owner@cueclub.example` | `Password@123` | Same as manager (owner of seed outlet) |
| 5 | **HQ Admin** | `hq.blackball@example.com` | `Password@123` | HQ analytics across the franchise network + full store ops |
| 6 | **Platform Admin** | `platform@blackball.example` | `Password@123` | Everything + platform setup (create SaaS/Franchise outlets) |

Role-based access is enforced at 3 layers: middleware (route guard + role gates), page-level
permission checks, and server actions (`requirePermission` + `businessId` scoping).

- Not logged in + protected page → `307 /login`
- Logged in but wrong role (e.g. owner hits `/platform/setup`) → `307 /dashboard`
- API without session → JSON `401 {"error":"Unauthorized"}`

---

## 2. Journey A — Public Visitor / Customer

### 2.1 Landing page — `/`
- Hero + product pitch; scroll past features/pricing.
- **Try:** click the main CTA and the Login link in the header.

### 2.2 Store front / Online booking — `/book/<slug>` (e.g. `/book/seed-business`)
**User story:** "As a customer, I want to book a pool table online so I reach and play without waiting."
1. Page shows the store info + table list (POOL/SNOOKER/PS5).
2. Pick a table → pick date (today only) + start time + duration (30/60/90/120 min).
3. Enter name + phone.
4. Submit → booking created with status:
   - `CONFIRMED` automatically if `requireConfirmation` is OFF
   - `PENDING` if confirmation is required (store must confirm in `/bookings`)
   - WhatsApp confirmation message is sent if `WHATSAPP_API_URL` is configured
   - If advance payment is enabled (`bookingAdvanceAmount > 0` + payment provider keys),
     a Razorpay/Stripe hosted payment link opens; success → `paymentStatus: PAID`
5. Invalid/full slot messages:
   - Slot in the past or < 90 min lead → rejected server-side
   - Outside business hours (open/close hour in settings) → rejected server-side
   - Double-booked (race) → "That slot was just booked by someone else" (atomic row-lock)
   - Too many attempts (30/5min per IP, 5/5min per phone) → rate-limit message

### 2.3 Booking QR — `/qr/book/<slug>`
- Dynamic QR PNG generated for the store; scan → opens `/book/<slug>`.
- On admin side, the QR is displayed/sharable from the Bookings page.

### 2.4 Docs — `/docs`
- Full dev handbook viewer (dev mode). In production → 404 unless `DOCS_ENABLED=true`.

---

## 3. Journey B — Store Staff

**User stories: "I run the floor — I start sessions, add items, and settle bills on my table board."**

### 3.1 Login — `/login`
1. Email `staff@cueclub.example` / `Password@123` → landing on dashboard.

### 3.2 Dashboard — `/dashboard`
- Store picker (if multiple business access), revenue summary, active sessions, table summary.

### 3.3 Live Tables — `/live-tables` (core floor board)
Board shows every table with status: `AVAILABLE / RESERVED / OCCUPIED / CLEANING`, plus live countdowns.

**Use case 3.3.1 — Start a walk-in session (POOL table)**
1. Click an AVAILABLE table → “Start walk-in session”.
2. Choose game type (POOL default) + optional member/PS5 rate snapshot.
3. Table flips to OCCUPIED; timer starts; bill opens.
   - **Expected:** ticking clock, session row in side panel, countdown warning near planned end.

**Use case 3.3.2 — Add items to an active session**
1. Click the session → "Add item" (snacks, drinks from menu with prices).
2. Amount + tax computed from DB rates.

**Use case 3.3.3 — Pause / Resume**
1. Pause → clock freezes (break). Resume → clock continues.

**Use case 3.3.4 — Extend session**
1. Extend by slot → planned end shifts; auto-blocked if future booking conflicts.

**Use case 3.3.5 — End session & settle bill**
1. End session → final total computed from elapsed time × rate + items + tax.
2. Settle / mark paid → table returns to AVAILABLE; audit record written.

**Use case 3.3.6 — Counter bill (walk-in sales without table time)**
1. "Start counter bill" → bill running at the counter.
2. Add items, then close bill when the customer pays.

**Use case 3.3.7 — Force status changes**
- AVAILABLE → RESERVED → CLEANING etc. via the status menu (permission `tables.update_status`).

**Staff NOT allowed (expect redirect/error):** rates, settings, tables page, bookings management.

---

## 4. Journey C — Store Manager / Owner

**User stories: "I run pricing, products, bookable tables, booking rules, and confirm/cancel bookings."**

### 4.1 Same as staff: dashboard + live-tables (all of section 3) + additionally:

### 4.2 Rates — `/rates`
**Use case:** update hourly pricing per game type (POOL/SNOOKER/PS5)
1. Edit rate → save → new sessions use the new snapshot; running sessions keep theirs.
2. PS5 pricing works the same (member vs non-member if configured).

### 4.3 Tables (Bookable items) — `/tables`
**Use case:** control which tables can be booked online
1. Toggle Active/Inactive — inactive tables disappear from the public `/book/<slug>` page.
2. Add a new bookable item (table number, game type).
3. Update item (rename / change game type).

### 4.4 Settings — `/settings`
**Use case 4.4.1 — Menu/Products:** create, update, deactivate products shown in bills.
**Use case 4.4.2 — Branding:** app name, logo initials, brand/accent colors (store front reflects).
**Use case 4.4.3 — Booking rules:**
- Enable/disable online booking
- Require manager confirmation (`PENDING` vs `CONFIRMED`)
- Buffer minutes between bookings
- Open hour / close hour (server-enforced on public booking!)
- Advance payment amount (in ₹) — >0 + provider keys → paid booking links
- Payment provider: NONE / RAZORPAY / STRIPE

### 4.5 Bookings — `/bookings`
**User story: "I manage the booking queue for my store."**
1. Incoming bookings list with references (last 6 of id), customer, slot, status.
2. **Confirm** a `PENDING` booking → `CONFIRMED` (WhatsApp notify if configured).
3. **Cancel** → `CANCELLED` (WhatsApp notify if configured).
4. **Mark paid** → `PAID` + a real-time `GET` (webhook) marks paid automatically when payments enabled.
5. **QR share** — show/share the booking QR used for the store's public page.

### 4.6 Change password — `/change-password`
1. Enter current + new password (min 8 chars).
2. Session re-issued with `mustChangePassword: false`; other role pages then open.

---

## 5. Journey D — HQ Admin

**User story: "I run the franchise network — I compare outlet performance without touching their operations."**

1. Login as `hq.blackball@example.com`.
2. `/hq/dashboard`:
   - Network-wide revenue + sessions across BlackBall outlets
   - Per-outlet comparisons (revenue, tables, bookings)
3. HQ can also operate any outlet (store switch) — full store permissions across the organization.

---

## 6. Journey E — Platform Admin (Setup / Provisioning)

**User story: "I onboard new clubs onto the platform."**

1. Login `platform@blackball.example` → `/platform/setup`.
2. Choose a model:

### 6.1 SaaS Club — `/platform/setup/saas`
1. Fill: organization name, outlet name, owner email, optional staff email, plan.
2. Submit → creates organization + outlet + owner/staff logins + subscription + default catalog
   (tables, PS5 stations, rates, menu items) inside one transaction.
3. **NEW (security round):** accounts get **random one-time passwords** — a temporary
   credentials box shows them (owner + staff) with copy buttons; expires in 30 min.
4. **Use case:** log out, log in as the new owner with the OTP → must change password on first
   entry (everything redirects to `/change-password` until done).

### 6.2 Franchise outlet — `/platform/setup/franchise`
Same as SaaS + franchise brand, franchisee account, royalty rule, and outlet limit.

### 6.3 Re-run behavior (safe)
- Re-running the setup for the same outlet **does not reset passwords** anymore (update branch
  leaves credentials untouched); OTP box only appears for genuinely new accounts.

---

## 7. Quick Route Reference

| Route | Access | Unauth behavior | Purpose |
|---|---|---|---|
| `/` | Public | — | Product landing page |
| `/login` | Public | — | Email+password login |
| `/magic-login` | Public | — | Key-gated one-click login (opt-in) |
| `/change-password` | Any session | 307 → /login | Forced/voluntary password change |
| `/dashboard` | dashboard.read | 307 → /login | Owner revenue overview |
| `/live-tables` | Any session | 307 → /login | Floor board + session lifecycle |
| `/rates` | rates.manage | 307 → /login | Hourly pricing |
| `/tables` | Any session (reads); tables.manage writes | 307 → /login | Bookable items |
| `/settings` | settings.update | 307 → /login | Menu, branding, booking rules |
| `/bookings` | bookings.manage | 307 → /login | Booking queue + QR |
| `/hq/dashboard` | HQ_ADMIN/PLATFORM_ADMIN | 307 → /dashboard (wrong role) | Network analytics |
| `/platform/setup*` | platform.setup.manage | 307 → /dashboard (wrong role) | Provisioning |
| `/book/<slug>` | Public | — | Customer booking page |
| `/qr/book/<slug>` | Public | — | Booking QR PNG |
| `/docs` | Public (prod: env-gated) | — | Handbook viewer |
| `/api/auth/login` `logout` `magic-login` | Public | — | Auth APIs |
| `/api/integrations/*/webhook` | Public (signature-verified) | — | Razorpay/Stripe webhooks |
| any other `/api/*` | Session | 401 JSON | — |

---

## 8. User Story → Use Case Map (regression checklist)

| User story | Where to walk | Verify |
|---|---|---|
| Customer books a table online | `/book/seed-business` | Booking created; no double-booking; window/hours enforced |
| Staff runs the floor | Live tables | Start → add item → pause → extend → end → settle |
| Owner sets prices | Rates page | New snapshot applies to new sessions |
| Owner manages menu/branding | Settings | Product/brand changes visible in bills + store front |
| Owner controls online booking | Settings + Bookings | Toggle + confirm/cancel/paid + QR |
| HQ tracks network | HQ dashboard | Revenue/session comparisons per outlet |
| Platform onboard a club | Platform setup | Outlet + logins + OTP + first-login password change |
| Any user updates password | Change password | Session refreshed; `mustChangePassword` cleared |
| Security: weak creds/unknown paths | — | 307/401 behavior in table above |

---

## 9. Demo Reset & Re-runs

- Wipe + reseed for a repeatable demo: `npx prisma migrate reset && npx prisma db seed`
- Seed refuses to run in production unless `SEED_ALLOWED=true` (security guard).
- Always use fresh incognito windows or log out between role changes to see role gates clearly.

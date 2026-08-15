# Security Audit Report — BlackBall POS

**Branch:** feature/customer-online-booking · **Date:** 2026-08-15
**Scope:** Full-stack Next.js 15 + Prisma + PostgreSQL audit: auth, sessions, authorization,
public endpoints, bookings/payments/WhatsApp integrations, dependencies, config.

**Methodology:** Static code review (every server action, route, middleware, auth module),
runtime exploitation attempts against a production build, `npm audit`.

---

## 1. Executive Summary

| Finding | Severity | Status |
| :--- | :--- | :--- |
| 1. Anonymous manager fallback + header/cookie spoofing → full auth bypass | **CRITICAL** | ✅ FIXED |
| 2. Unauthenticated magic-login (any account takeover incl. platform admin) | **CRITICAL** | ✅ FIXED |
| 3. Hardcoded fallback `AUTH_SECRET` — session forgery + missing env | **CRITICAL** | ✅ FIXED |
| 4. Sessions never expire (no `exp` claim, no reissue on password change) | HIGH | ✅ FIXED (exp + forced change) |
| 5. Shared default passwords (`Password@123`) for every seeded/provisioned account | HIGH | ✅ FIXED (forced change) |
| 6. Middleware decoded tokens WITHOUT verifying signature | **CRITICAL** | ✅ FIXED |
| 7. No rate limiting on login / magic-login / public booking | HIGH | ✅ FIXED (in-memory) |
| 8. `demo_user_email` / `demo_store_slug` cookies set even in production | MEDIUM | ✅ FIXED |
| 9. No security headers (CSP, HSTS, X-Frame-Options, etc.) | MEDIUM | ✅ FIXED |
| 10. `/docs` publicly serves the internal handbook | MEDIUM | ✅ FIXED (env-gated) |
| 11. Docs viewer: CDN scripts w/o SRI + mermaid `securityLevel: loose` | MEDIUM | ✅ FIXED (SRI + strict) |
| 12. Booking double-book race (check+create not atomic) | MEDIUM | ✅ FIXED (row lock + tx) |
| 13. Dependency vulnerabilities (6 high, build/dev chain) | MEDIUM | ✅ FIXED (audit fix + overrides) |

---

## 2. CRITICAL Findings — Fixed

### 2.1 Auth bypass via spoofable identity (FIXED)
**Type:** Broken Authentication / Authorization Bypass — CVSS ~9.8
**Location:** `src/server/auth/current-employee.ts` (`getRequestIdentity`, `buildFallbackContext`)

**Problem (before):**
- Any request could set `x-user-email` / `x-tenant-slug` headers; those were trusted over every other source.
- An email not present in DB still produced a full "Store Manager" context with operational permissions.
- Emails containing `platform.` / `hq.` produced **PLATFORM_ADMIN / HQ_ADMIN** contexts including `platform.setup.manage` and `hq.dashboard.read`.

**Exploit (before):**
```
curl -H "x-user-email: platform.attacker@x.com" -H "x-tenant-slug: seed-business" /live-tables
→ full platform-admin access, any store.
```

**Fix:**
- Production (`NODE_ENV=production`): identity comes **only** from a cryptographically verified `auth_session` token. Headers, demo cookies and env-identity fallbacks are ignored.
- Unknown identity → `buildDeniedContext()` (empty permissions, empty employeeId) — never an implicit role.
- `requireAuth()` rejects contexts without an `employeeId`.
- Middleware now **verifies the HMAC signature** (`verifySessionTokenEdge`, Web Crypto) instead of base64-decoding unauthenticated claims.
- Verified at runtime against a production build: forged cookie, header spoofing and demo-cookie attempts all redirect to `/login`.

### 2.2 Magic login — account takeover via public GET (FIXED)
**Type:** Authentication bypass — CVSS ~9.8
**Location:** `src/app/api/auth/magic-login/route.ts`

**Problem (before):** `GET /api/auth/magic-login?email=<any>` created a valid 7-day session with zero authentication — including `platform@blackball.example`.

**Fix:**
- **Disabled in production by default** (`MAGIC_LOGIN_ENABLED=false` semantics). Production use requires `MAGIC_LOGIN_ENABLED=true` **and** `DEV_ACCESS_KEY`.
- Every request requires an **access key** compared with `timingSafeEqual`.
- Local dev keeps a documented default (`local-dev-key`) — no env needed for development; the UI now has a mandatory "Access Key" field and clear error states.
- Rate limited per IP (30/5 min).

### 2.3 Hardcoded fallback AUTH_SECRET (FIXED)
**Type:** Cryptographic misconfiguration / session forgery — CVSS ~9.1
**Location:** `src/server/auth/auth-service.ts`

**Problem (before):** `process.env.AUTH_SECRET ?? "default-antigravity-dev-secret-key-32chars!"` — a known key: anyone could sign arbitrary session tokens. Not mentioned anywhere in `.env.example`.

**Fix:**
- `getAuthSecret()` **throws in production** when `AUTH_SECRET` is missing (fail-closed boot).
- Development uses an explicit clearly-labeled fallback with a startup warning.
- `.env.example` documents `AUTH_SECRET` (required, `openssl rand -hex 32`).

### 2.4 Session expiry (FIXED)
**Problem:** tokens had no `exp`; verified tokens were valid indefinitely until cookie deletion.
**Fix:** `exp = now + 7d` baked into every token; both node verifier and edge verifier reject expired tokens.

---

## 3. HIGH Findings — Fixed

### 3.1 Shared default passwords (FIXED — operational guidance below)
- `Password@123` was seeded for every account (incl. platform admin) with **no change** mechanism.
- Fixes: new `mustChangePassword` column + `/change-password` page; middleware forces redirect to it until changed; platform provisioning stamps `mustChangePassword: true` on created owner/staff accounts; password change re-issues a clean session token.

### 3.2 Rate limiting (FIXED — in-memory)
`src/server/auth/rate-limit.ts`:
- Login: 10 attempts / 5 min per IP → 429.
- Magic login: 30 / 5 min per IP.
- Public booking creation: 30 / 5 min per IP **and** 5 / 5 min per phone number.
> ⚠️ Single-instance only — replace with Redis/Upstash when scaling horizontally.

---

## 4. Remaining Items — All Resolved (2026-08-15 hardening pass)

| # | Item | Resolution |
| :--- | :--- | :--- |
| 9 | **Security headers** | `next.config.ts` `headers()`: CSP (self + cloudflare/jsdelivr CDNs), HSTS, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, Permissions-Policy |
| 10 | **Public `/docs`** | `src/app/docs/page.tsx` returns 404 in production unless `DOCS_ENABLED=true`; `file:///` local paths removed from handbook files |
| 11 | **Docs viewer CDN** | highlight.js 11.9.0 + mermaid **10.9.3 pinned** with SRI `integrity` + `crossOrigin` hashes; mermaid `securityLevel: "strict"` |
| 12 | **Booking double-book race** | check + create wrapped in `prisma.$transaction` with `SELECT ... FOR UPDATE` on the table row — concurrent bookings on the same table serialize |
| 13 | **npm audit: 6 high** | `npm audit fix` + overrides: `sharp ^0.35.3` (libvips CVEs) & `postcss ^8.5.26` (nested in next) → **0 vulnerabilities** |

---

## 5. Verified Good Practices (Keep)

- Passwords: scrypt + random salt + `timingSafeEqual`.
- Every admin server action enforces `requirePermission` + businessId scoping.
- Payment webhooks verify signatures; integrations are env-gated and disabled by default.
- `.env` ignored; React escapes all user output; zod validation everywhere.
- Booking business record queries scoped by `businessId` derived from verified identity.

## 6. Runtime Verification Performed

Against a `next build` production server (docs avoid prod-only keys):
- No cookie → 307 `/login` ✅
- Forged `auth_session` → 307 `/login` ✅
- `x-user-email: platform@...` header → 307 `/login` ✅
- `/api/auth/magic-login` in prod → `error=disabled` ✅
- Magic-login with `MAGIC_LOGIN_ENABLED=true` + wrong key → `error=invalid_key`; correct key → login ✅
- 12 rapid logins → 429 ✅
- Dev mode: key-less magic login blocked; `local-dev-key` works ✅

---

## 7. Second Full Audit (2026-08-15) — Post-Merge `main`

**Method:** two parallel static reviews (auth/session/middleware + public endpoints/actions/webhooks), SQLi & secret scan, npm audit, SRI re-verification, headless-Chrome CSP/hydration check, curl exploitation suite against a production build.

### 7.1 New findings

| # | Severity | Finding | Status |
| :--- | :--- | :--- | :--- |
| 14 | **HIGH (functional)** | Round-2 CSP blocked Next.js inline hydration scripts + Google Fonts — app rendered server-only, **no client interactivity** (only caught with a real browser). | ✅ FIXED during audit — `'unsafe-inline'` for script-src, fonts.googleapis/gstatic allowed; re-verified 0 CSP violations + hydration OK |
| 15 | **HIGH** | `Password@123` re-stamped everywhere: `seed.ts` `updateMany` resets **all** employees' passwords on every seed run; platform provisioning `update` branch resets owner/staff password **without** `mustChangePassword` (`platform/actions.ts:306`) | ⏳ |
| 16 | **HIGH** | Magic-login auto-enabled with public key `local-dev-key` whenever `NODE_ENV !== "production"` → any misconfigured staging/preview = full account takeover (incl. platform admin) | ⏳ |
| 17 | **HIGH** | Booking action enforces only "not in the past" — no opening window / business hours / lead time server-side → schedule poisoning, availability DoS on any store | ⏳ |
| 18 | **MEDIUM** | Payment webhooks matched by middleware auth guard → always 307 → payments never marked PAID; protected APIs return HTML redirect, not JSON 401 | ⏳ |
| 19 | **MEDIUM** | Webhook verification: no Stripe timestamp tolerance (replay), no amount/currency check, `{ id: { endsWith: ref } }` can mark wrong booking PAID, plain non-constant-time compare | ⏳ |
| 20 | **MEDIUM** | Stateless 7-day tokens: logout only clears cookie; password change doesn't revoke other sessions; HQ page trusts middleware `accountType` claim instead of DB-derived perms | ⏳ |
| 21 | **MEDIUM** | `listBookableSlotsAction`: unauthenticated, no slug scoping, no rate limit → any store's table occupancy + enumeration | ⏳ |
| 22 | **MEDIUM** | Login user-enumeration via timing (scrypt only runs for existing users) | ⏳ |
| 23 | **MEDIUM** | Rate limiter: in-memory + first `X-Forwarded-For` trusted → spoofable when origin directly reachable; per-process on serverless | ⏳ |
| 24 | **LOW** | `/live-tables` + `/tables` pages render business data with middleware auth only (no `tables.read` check; sibling pages check) | ⏳ |
| 25 | **LOW** | `verifyPassword` throws on malformed hash (timingSafeEqual length mismatch); HMAC compare non-constant-time (`auth-service.ts:73`) | ⏳ |
| 26 | **LOW** | Magic-login GET: key in query string, `store` claim unvalidated, `user_not_found` vs `invalid_key` enumeration | ⏳ |
| 27 | **LOW** | `booking-qr-dialog.tsx:29` `document.write` with DB-controlled `businessName`; docs viewer `dangerouslySetInnerHTML` unsanitized (repo-controlled today) | ⏳ |
| 28 | **LOW** | `ensureBookingSettingsFor` performs public `CREATE` on missing settings (public write row spam) | ⏳ |
| 29 | **LOW** | Dev-mode spoofable identity (`x-user-email` headers) sharpens #16 whenever non-prod | ⏳ |
| 30 | **LOW** | `addSessionItemAction` lacks own `requirePermission` (delegates; fragile); `assignedEmployeeId` unchecked FK | ⏳ |
| 31 | **LOW** | `bookingWindowDays` dead code; `/book/success` + `/book/cancel` routes missing (404 after paying) | ⏳ |
| 32 | **LOW** | Money via JS `Number` on Decimal fields (float artifacts) | ⏳ |
| 33 | **CRITICAL** | **Production auth completely broken** — every valid session rejected (307 → `/login`). Root cause: `auth-service.ts` top-level `import crypto from "crypto"`; in the edge-middleware bundle this node stub throws on access ("edge runtime does not support Node.js 'crypto'"), so `crypto.subtle.importKey` in `verifySessionTokenEdge` always threw → `null` → any valid cookie got logged out instantly. Surfaced only by testing a **valid** token (prior rounds tested only forgeries — which "failed closed" for the wrong reason). | ✅ FIXED during audit — node crypto renamed `nodeCrypto` (node-only paths), edge verifier uses `globalThis.crypto.subtle`; full role/page matrix now passes |

### 7.2 Re-verified GOOD (unchanged)

- Edge middleware verifies HMAC signature (Web Crypto, verify-before-parse); `exp` enforced in both verifiers.
- `NODE_ENV=production` identity is token-only; headers/demo cookies/env fallbacks ignored → runtime: forged cookie, `x-user-email: platform.*`, demo cookies all 307 → `/login`.
- `AUTH_SECRET` fail-closed in prod; scrypt + random salt + `timingSafeEqual` (happy path); cookie flags `httpOnly`/`secure`/`SameSite=Lax`.
- Every ~24 mutating server action calls `requirePermission`; no client-controlled `businessId` anywhere; SQLi: none (only parameterized `$queryRaw`).
- Public booking create is atomic (`SELECT ... FOR UPDATE` + in-tx conflict re-check).
- Security headers now browser-verified (CSP violations: 0, hydration OK across `/login`, `/magic-login`, `/`).
- `/docs` 404 in prod without `DOCS_ENABLED`; SRI hashes re-matched CDN content; **npm audit: 0 vulnerabilities**.

### 7.3 Runtime suite (production build, port 3111) — **DB round 2**

- no cookie / forged token / `x-user-email` spoof / demo cookie → `307 /login` ✅
- `/api/auth/magic-login` in prod → `307 /magic-login?error=disabled` ✅
- 12 rapid logins → 429 with JSON ✅
- `/docs` → 404 ✅ · `/api/integrations/*/webhook` → **307 (finding #18)** ❌
- Headless Chrome: `/login`, `/magic-login`, `/` → 0 CSP violations, RSC hydration OK ✅
- **4 seeded roles login OK**; page matrix after #33 fix:
  `/live-tables` → all roles 200 · `/hq/dashboard` → hq+platform 200 / owner+manager 307 · `/platform/setup` → platform 200 / others 307 · `/rates` `/tables` `/settings` → session-bearing roles 200 ✅
- `mustChangePassword=true` fresh login → claim baked into token → `/rates` → `307 /change-password`; `/change-password` → 200 ✅ (page-level enforcement works; action-level gap = finding #15)
- Cross-tenant spoof (`x-tenant-slug` header) with valid owner session → no escalation (header ignored in prod) ✅
- Signed Stripe-style webhook POST → still 307 (finding #18) ❌

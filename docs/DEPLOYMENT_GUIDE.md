# Deployment Guide — BlackBall POS

Step-by-step production deployment (Vercel + managed PostgreSQL) with the
security requirements from `docs/SECURITY_AUDIT.md` baked in.

---

## 1. Pre-Flight (Command-Line on Prod-Ready Machine)

```bash
# Audit deps (no high left ideally)
npm audit

# Clean build + tests
npm run typecheck && npm run test && npm run build
```

## 2. Database (Any managed Postgres — Neon / Railway / Supabase)

1. Create a Postgres instance (16.x). Note the connection string.
2. (Recommended) Create an app-only role, e.g. `blackball_app` with
   SELECT/INSERT/UPDATE/DELETE on the schema — do not use the admin user.
3. Production migrations (NOT `migrate dev`):
   ```bash
   npx prisma migrate deploy
   ```
4. **NEVER seed the production database.** `prisma/seed.ts` creates demo users
   with `Password@123`. Skip seeding entirely in prod.

## 3. Environment Variables (Vercel → Settings → Environment Variables)

### Required
| Variable | Value |
| :--- | :--- |
| `DATABASE_URL` | Prod Postgres URL (with SSL query if required) |
| `AUTH_SECRET` | `openssl rand -hex 32` — app **refuses to boot** without it |

### Required for integrations (only if you wire them)
| Variable | Where from |
| :--- | :--- |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe dashboard |
| `WHATSAPP_API_URL` / `WHATSAPP_API_TOKEN` / `WHATSAPP_FROM` | WhatsApp gateway (see INTEGRATIONS_GUIDE.md) |
| `APP_BASE_URL` | `https://your-domain.com` — QR image + payment links depend on it |

### Never set in production
`BLACKBALL_USER_EMAIL`, `BLACKBALL_TENANT_SLUG`, `MAGIC_LOGIN_ENABLED`,
`DEV_ACCESS_KEY` (unless you intentionally enable key-gated magic login).

## 4. Security Checklist (mandatory)

- [ ] `AUTH_SECRET` set (64 hex chars) — verify app boots: without it server refuses to start.
- [ ] Magic login left **disabled** (default). If you must test remotely, use
      `MAGIC_LOGIN_ENABLED=true` + long `DEV_ACCESS_KEY`, then remove both.
- [ ] No demo cookies in production (code now guarantees it).
- [ ] All deployed staff set custom passwords (forced-change flow exists).
- [ ] `npm audit` — no HIGH remaining (schedule Next 16 upgrade for the full fix).
- [ ] Security headers still pending (report item #9) — add `next.config.ts` headers before public launch:
  ```ts
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" }
      ]
    }];
  }
  ```
- [ ] Rate limiter is in-memory — for multi-instance scaling switch to Redis (upstash).

## 5. Webhooks (after deploy)

| Provider | URL | Event(s) |
| :--- | :--- | :--- |
| Razorpay | `https://<domain>/api/integrations/razorpay/webhook` | `payment_link.paid` |
| Stripe | `https://<domain>/api/integrations/stripe/webhook` | `checkout.session.completed` |

Get the webhook secrets **from the dashboards** and add them to env. Webhooks
auto-respond 503 if secrets are missing (safe default).

## 6. Deploy (Vercel example)

> **Beginner walkthrough (step-by-step, sab details ke saath):**
> `docs/VERCEL_DEPLOYMENT_GUIDE.md` — entry-level se lekar production tak.

```bash
npm i -g vercel
vercel login
vercel link
vercel env add AUTH_SECRET production
# ... add every env var above
vercel build && vercel deploy --prod
```

Or push to GitHub and enable Vercel auto-deploy with "production" env group.

## 7. Post-Deploy Smoke Test

1. `/` and `/login` load (TLS).
2. Login with a real staff account → dashboard.
3. `/book/<slug>` renders; make a same-day booking; confirm on `/bookings`.
4. WhatsApp: booking message arrives (if configured).
5. Payment: enable provider in settings, book, complete payment, webhook flips to PAID.
6. `/live-tables` "Booking QR" downloads correctly.
7. Check `/docs` exposure decision — restrict if undesired.
8. `curl -I https://<domain>` — confirm HSTS/X-Content-Type-Options headers present.

## 8. Operations

- **Backups** on the DB provider (daily + point-in-time).
- **Error tracking:** Sentry or Vercel logs.
- **Uptime:** UptimeRobot / BetterStack checks on `/login`.
- **Password hygiene:** rotate `AUTH_SECRET` only with a logout-everyone plan
  (all sessions become invalid immediately — good for incidents).

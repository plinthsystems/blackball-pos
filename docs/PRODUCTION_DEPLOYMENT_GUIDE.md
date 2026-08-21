# 🚀 Production Deployment Guide — BlackBall POS & SaaS

> **Full production deployment playbook** covering database setup, Vercel configuration, CI/CD, monitoring, rollback strategies, and all deployment scenarios.

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Pre-flight Checks](#2-pre-flight-checks)
3. [Database Setup](#3-database-setup)
4. [Vercel Configuration](#4-vercel-configuration)
5. [Environment Variables](#5-environment-variables)
6. [Database Migrations](#6-database-migrations)
7. [First Admin Setup](#7-first-admin-setup)
8. [Domain & SSL](#8-domain--ssl)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Monitoring & Alerting](#10-monitoring--alerting)
11. [Backup Strategy](#11-backup-strategy)
12. [Rollback & Disaster Recovery](#12-rollback--disaster-recovery)
13. [Performance Optimization](#13-performance-optimization)
14. [Security Checklist](#14-security-checklist)
15. [Production Deployment Stories](#15-production-deployment-stories)
16. [Troubleshooting](#16-troubleshooting)
17. [Post-Deployment Checklist](#17-post-deployment-checklist)

---

## 1. Prerequisites

| Item | Description | Link/Notes |
|------|-------------|------------|
| GitHub Account | Repository host | https://github.com/plinthsystems/blackball-pos |
| Vercel Account | Hosting platform | https://vercel.com (Paid plan recommended for DB connections) |
| Database Provider | Managed PostgreSQL | Neon (recommended), Railway, Supabase, or self-hosted |
| Domain (Optional) | Custom domain | e.g., `pos.yourbrand.com` |
| Payment Gateway (Optional) | Online booking payments | Razorpay or Stripe |
| WhatsApp Gateway (Optional) | Customer notifications | WhatsApp Business API, Twilio, WATI, or AiSensy |

---

## 2. Pre-flight Checks

Before deploying, ensure your codebase is production-ready:

```bash
# 1. Run type checking
npm run typecheck

# 2. Run unit and component tests (DB-independent suites only)
npx vitest run tests/unit tests/components

# 3. Full build verification
npm run build

# 4. Check for security vulnerabilities
npm audit

# 5. Verify Prisma client is generated
npx prisma generate
```

> **Note:** Integration tests (`npm test`) hit the real database and are state-dependent. Run them locally with Docker, not in production.

---

## 3. Database Setup

### Option A: Neon (Recommended — Serverless PostgreSQL)

#### Step 1: Create Project
1. Go to [neon.tech](https://neon.tech) → Sign up
2. Click **New Project** → Name it `blackball-pos`
3. Set a strong **database password** (minimum 16 characters)
4. Note the **region** (e.g., `us-east-1.aws`)

#### Step 2: Get Connection String
Neon provides two connection string formats:

| Type | Use Case | Example |
|------|----------|---------|
| **Pooled** | Production (recommended) | `postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require` |
| **Direct** | Local development only | `postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require` |

**For production, use the Pooled connection string:**
```bash
DATABASE_URL="postgresql://club_management_user:YOUR_STRONG_PASSWORD@ep-xxx-xxx.region.aws.neon.tech/club_management?sslmode=require"
```

> **Pool Size Recommendation:**
> - Dev: 1-2 connections
> - Staging: 5-10 connections
> - Production: 10-20 connections (adjust based on traffic)

#### Step 3: Create Database Schema
Neon creates an empty database. You'll apply migrations in Section 6.

### Option B: Railway

1. Go to [railway.app](https://railway.app) → Sign up
2. Click **New Project** → **PostgreSQL**
3. Copy the **DATABASE_URL** from Railway dashboard
4. Use this URL as your `DATABASE_URL` environment variable

### Option C: Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note the **Connection String** from Project Settings → Database
3. Use the **pooled** connection string (Supabase Pooler)
4. Enable SSL mode in your connection string

### Option D: Self-Hosted PostgreSQL

```bash
# Create database
createdb -U postgres club_management

# Create user
createuser -U postgres -s club

# Set password
psql -U postgres -c "ALTER USER club WITH PASSWORD 'your_strong_password';"

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE club_management TO club;"
```

**Connection string format:**
```bash
DATABASE_URL="postgresql://club:your_strong_password@your-server.com:5432/club_management?sslmode=require"
```

---

## 4. Vercel Configuration

### Step 1: Connect Repository
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import `plinthsystems/blackball-pos` from GitHub
3. **Framework Preset:** Next.js (auto-detected)
4. **Root Directory:** `./`
5. **Build Command:** Leave as default (`npx next build`) or set to `npx prisma generate && next build`

### Step 2: Create `.vercel.json` (Optional but Recommended)

Create this file in your repository root to configure Vercel explicitly:

```json
{
  "buildCommand": "npx prisma generate && next build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=()"
        }
      ]
    }
  ],
  "crons": []
}
```

> **Configuration Notes:**
> - `regions`: Set to your primary user region (`iad1` = US East, `sfo1` = US West, `hnd1` = Tokyo, `sin1` = Singapore)
> - `maxDuration`: Increase for long-running operations (migrations, webhooks)
> - `headers`: Security headers for production

---

## 5. Environment Variables

Add these in **Vercel Dashboard → Settings → Environment Variables**:

### Required Variables

| Variable | Value | Environment | Notes |
|----------|-------|-------------|-------|
| `DATABASE_URL` | Neon/Railway connection string | **Production**, **Preview**, **Build** | Must include `?sslmode=require` |
| `AUTH_SECRET` | `openssl rand -base64 32` | **Production**, **Preview**, **Build** | Rotate annually |
| `MAGIC_LOGIN_ENABLED` | `true` (dev) / `false` (prod) | **All** | **Must be `false` in production** |
| `DEV_ACCESS_KEY` | *(leave empty in prod)* | **Production**, **Preview** | **Must be empty in production** |
| `NODE_ENV` | `production` | **Production** | Set automatically in prod |
| `VERCEL` | `1` | **All** | Vercel sets automatically |

### Integration Variables (Optional)

| Variable | Value | Environment | Notes |
|----------|-------|-------------|-------|
| `RAZORPAY_KEY_ID` | `rzp_live_xxxxxxxx` | **Production** | Live mode for production |
| `RAZORPAY_KEY_SECRET` | Secret key from Razorpay | **Production** | Keep confidential |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret from Razorpay | **Production** | Verify webhook signatures |
| `STRIPE_SECRET_KEY` | `sk_live_xxxxxxxx` | **Production** | Live mode for production |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret from Stripe | **Production** | Verify webhook signatures |
| `WHATSAPP_API_URL` | Gateway endpoint URL | **Production** | e.g., WhatsApp Cloud API |
| `WHATSAPP_API_TOKEN` | API token | **Production** | Generated by provider |
| `WHATSAPP_FROM` | Phone number ID | **Production** | Your WhatsApp business number |
| `APP_BASE_URL` | `https://pos.yourbrand.com` | **Production** | Used for payment redirects, QR links |

### Preview/Testing Variables

| Variable | Value | Environment | Notes |
|----------|-------|-------------|-------|
| `DATABASE_URL` | Separate Neon branch DB | **Preview** | Use Neon's branch feature for previews |
| `RAZORPAY_KEY_ID` | `rzp_test_xxxxxxxx` | **Preview** | Test mode for preview deployments |
| `DEV_ACCESS_KEY` | `your-dev-key` | **Preview** | Enable magic login for testing |

---

## 6. Database Migrations

### Apply Migrations on Production

After the first deploy, apply Prisma migrations to your production database:

#### Method 1: Via Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Pull production environment variables
vercel env pull .env.production.local --prod

# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate deploy
```

#### Method 2: Via Vercel Dashboard

1. Go to **Settings → Git** → Enable **Automatic Git Integration**
2. Add a **Post-Build Command**: `npx prisma generate && npx prisma migrate deploy`
3. Push to `main` branch → Vercel will auto-apply migrations

#### Method 3: Via GitHub Actions (Automated)

Create `.github/workflows/migrate.yml`:

```yaml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'prisma/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Apply migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 7. First Admin Setup

After migrations are applied, create your Platform Admin:

### Step 1: Visit Setup Page
```
https://your-app.vercel.app/setup
```

### Step 2: Fill In Details
- **Full Name:** Your name
- **Email:** Your admin email
- **Password:** Strong password (minimum 12 characters, mix of upper, lower, numbers, symbols)
- **Click "Create Platform Admin"**

### Step 3: Verify Creation
- You'll be redirected to `/platform/setup`
- Dashboard should show empty state (no outlets/franchises yet)

### Step 4: Lock Down Setup Page
Once your admin is created:
- The `/setup` page automatically disables (redirects to `/login`)
- Only the first admin can access it
- Subsequent admins must be created via `/platform/setup`

> **Important:** `prisma/seed.ts` is **locked** in production (PR #24). It won't create demo data. This prevents accidental seed data in production.

---

## 8. Domain & SSL

### Step 1: Add Custom Domain in Vercel
1. Go to **Vercel Dashboard → Your Project → Settings → Domains**
2. Enter your domain: `pos.yourbrand.com`
3. Click **Add**

### Step 2: Configure DNS

#### Option A: CNAME (Recommended for subdomains)
```
Type: CNAME
Name: pos (or your subdomain)
Value: cname.vercel-dns.com
TTL: Auto
```

#### Option B: A Record (For root domain)
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto
```

#### Option C: ALIAS/ANAME (For root domain, Cloudflare)
```
Type: ALIAS
Name: @
Value:cname.vercel-dns.com
```

### Step 3: SSL Certificate
- Vercel **automatically provisions** Let's Encrypt SSL certificates
- No manual configuration needed
- SSL activates within 5-10 minutes after DNS propagation
- Certificate auto-renews

### Step 4: Verify SSL
```bash
# Check SSL status
curl -I https://your-domain.com
# Should return: HTTP/1.1 200, include "strict-transport-security" header
```

---

## 9. CI/CD Pipeline

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Pre-deploy checks (runs on all pushes/PRs)
  checks:
    name: Run Type Check & Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run unit & component tests
        run: npx vitest run tests/unit tests/components
      
      - name: Build app
        run: npm run build

  # Deploy to Vercel (only on main branch pushes)
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: checks
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./
```

### Vercel Auto-Deploy
- **Push to `main`** → Auto-deploy to production
- **Pull Request** → Auto-deploy to preview URL
- **Comment on PR** → `/vercel deploy` to trigger manual deploy

---

## 10. Monitoring & Alerting

### Vercel Analytics (Built-in)
1. Go to **Vercel Dashboard → Analytics**
2. Enable **Real-time metrics**
3. Track: Page views, request rates, error rates, load times

### Error Tracking (Sentry)

#### Step 1: Create Sentry Project
1. Go to [sentry.io](https://sentry.io) → Sign up
2. Create new project → **Next.js**
3. Get **DSN** (Data Source Name)

#### Step 2: Install Sentry SDK
```bash
npm install @sentry/nextjs
```

#### Step 3: Configure `sentry.client.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### Step 4: Configure `sentry.edge.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

#### Step 5: Add to Vercel Environment Variables
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry DSN |

### Uptime Monitoring (BetterStack/UptimeRobot)

#### BetterStack Setup
1. Go to [betterstack.com](https://betterstack.com) → Sign up
2. Create new monitor → Enter your domain URL
3. Set check interval: **1 minute**
4. Configure alerts: Email, Slack, PagerDuty

#### UptimeRobot Setup (Free)
1. Go [uptimerobot.com](https://uptimerobot.com) → Sign up
2. Add new monitor → HTTP(s)
3. Enter your domain URL
4. Alert contact: Email

---

## 11. Backup Strategy

### Database Backups (Neon)

#### Automatic Backups
- Neon provides **automatic daily backups**
- **Point-in-Time Recovery (PITR)** enabled by default
- Retention: 7 days (free tier), 30 days (paid tier)

#### Manual Backup
```bash
# Export database to SQL file
pg_dump -h your-host.neon.tech -U your-user -d your-database > backup-$(date +%Y%m%d).sql

# Restore from backup
psql -h your-host.neon.tech -U your-user -d your-database < backup-YYYYMMDD.sql
```

#### Neon Branching (Staging)
```bash
# Create a branch from production (read-only copy)
neon branches create production-branch --parent main

# Use branch connection string for staging
DATABASE_URL="postgresql://user:pass@ep-xxx-branch.region.aws.neon.tech/dbname"
```

### Backup Schedule Recommendation

| Frequency | Type | Purpose |
|-----------|------|---------|
| **Daily** | Automatic (Neon) | Point-in-time recovery |
| **Weekly** | Manual export | Long-term retention |
| **Before major release** | Manual snapshot | Rollback safety |

---

## 12. Rollback & Disaster Recovery

### Code Rollback

#### Vercel Dashboard Rollback
1. Go to **Vercel Dashboard → Deployments**
2. Find the last working deployment
3. Click **...** → **Promote to Production**

#### Git Rollback
```bash
# Find last good commit
git log --oneline

# Create rollback branch
git checkout -b rollback-$(date +%Y%m%d) <good-commit-hash>

# Push rollback
git push origin rollback-$(date +%Y%m%d)
```

### Database Rollback

#### Prisma Migration Rollback
```bash
# View all migrations
npx prisma migrate status

# Roll back last migration (if applied)
npx prisma migrate resolve --rolled-back <migration-name>

# Apply previous migration version
npx prisma migrate deploy --create-only
```

#### Database Restore from Backup
```bash
# Restore from SQL backup
psql -h your-host.neon.tech -U your-user -d your-database < backup-YYYYMMDD.sql

# Or use Neon's PITR feature
# Go to Neon Dashboard → Restore from backup → Select timestamp
```

### Disaster Recovery Plan

| Scenario | Recovery Steps | Estimated Time |
|----------|----------------|----------------|
| **Deployment fails** | Rollback to previous Vercel deployment | 2-5 minutes |
| **Database migration fails** | Restore from backup, rollback migration | 10-30 minutes |
| **Security breach** | Rotate secrets, revoke sessions, restore from backup | 1-2 hours |
| **DDoS attack** | Enable Vercel DDoS protection, enable Cloudflare | 5-15 minutes |
| **Data corruption** | Restore from latest backup | 30-60 minutes |

---

## 13. Performance Optimization

### Vercel Edge Network
- **Automatic global CDN** — Your app is deployed to 50+ edge locations
- **Region selection:** Set primary region in `.vercel.json` or Vercel Dashboard
- **Edge caching:** Configure cache headers for static assets

### Database Connection Pooling
- **Neon:** Automatic pooling enabled
- **Recommended pool size:** 10-20 connections for production
- **Connection string:** Use **pooled** URL (includes `?sslmode=require`)

### Next.js Optimization
- **Image Optimization:** Next.js auto-optimizes images
- **Font Optimization:** Auto-subset and self-host fonts
- **Static Generation:** Use `generateStaticParams` for static pages
- **Server Components:** Default to Server Components for better performance

### Example: Optimize Specific Route
```typescript
// app/dashboard/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | BlackBall POS',
  description: 'Manage your cue club operations',
}

// Use revalidation for dynamic data
export const revalidate = 60 // Revalidate every 60 seconds
```

---

## 14. Security Checklist

### Mandatory Items
- [ ] `AUTH_SECRET` is set (32+ character random string)
- [ ] `DEV_ACCESS_KEY` is **empty** in production
- [ ] `MAGIC_LOGIN_ENABLED` is `false` in production
- [ ] `DATABASE_URL` uses **pooled** connection with `sslmode=require`
- [ ] `NODE_ENV` is `production`
- [ ] HTTPS is enabled (automatic on Vercel)
- [ ] Security headers are configured (see `.vercel.json`)

### Recommended Items
- [ ] Rate limiting enabled (Vercel Edge Functions)
- [ ] Content Security Policy (CSP) configured
- [ ] Error monitoring (Sentry) enabled
- [ ] Uptime monitoring enabled
- [ ] Database backups configured
- [ ] DNSSEC enabled (for domain)
- [ ] Two-factor authentication enabled on all accounts

### Penetration Testing
- Test authentication flows
- Test API endpoints for unauthorized access
- Test payment integrations
- Test webhook endpoints
- Verify CORS policies

---

## 15. Production Deployment Stories

### Story 1: First-Time Production Deployment

**Scenario:** Deploying the application for the first time on a new domain.

**Steps:**
1. Create Neon project → Get connection string
2. Create Vercel project → Connect GitHub repo
3. Add environment variables (`DATABASE_URL`, `AUTH_SECRET`, etc.)
4. Push to `main` → Vercel auto-deploys
5. Run migrations: `npx prisma migrate deploy`
6. Visit `/setup` → Create Platform Admin
7. Verify all pages load correctly
8. Set up domain and SSL

**Expected Outcome:** Fully functional production app at `https://your-domain.com`

### Story 2: Adding Payment Integration

**Scenario:** Enable Razorpay for advance booking payments.

**Steps:**
1. Create Razorpay account → Get live API keys
2. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` to Vercel env
3. Configure webhook in Razorpay dashboard:
   - URL: `https://your-domain.com/api/integrations/razorpay/webhook`
   - Events: `payment_link.paid`
4. Test with test mode keys first
5. Switch to live keys in production
6. Verify payments are processed correctly

**Expected Outcome:** Customers can pay advance for bookings online.

### Story 3: Multi-Outlet Franchise Deployment

**Scenario:** Deploying the SaaS for a franchise with multiple outlets.

**Steps:**
1. Deploy main platform to Vercel
2. Create Platform Admin via `/setup`
3. Use `/platform/setup` to create:
   - Franchise brand (e.g., "BlackBall Franchise Group")
   - Individual franchises (e.g., "Bangalore Central")
   - Outlets (e.g., "Koramangala", "MG Road")
4. Each outlet gets its own dashboard and data
5. HQ Admin can view all outlets from `/hq/dashboard`

**Expected Outcome:** Franchise owner manages multiple outlets from a single platform.

### Story 4: Migration to Custom Domain

**Scenario:** Moving from `your-app.vercel.app` to `pos.yourbrand.com`.

**Steps:**
1. Add domain in Vercel Dashboard → Settings → Domains
2. Configure DNS (CNAME or A record)
3. Wait for DNS propagation (up to 48 hours, usually < 1 hour)
4. SSL certificate auto-provisions
5. Update `APP_BASE_URL` in environment variables
6. Update payment gateway webhook URLs
7. Update WhatsApp gateway configuration
8. Verify all links and redirects work

**Expected Outcome:** App accessible at custom domain with SSL.

### Story 5: Emergency Rollback

**Scenario:** Production deployment causes critical bug.

**Steps:**
1. **Identify issue** → Check Vercel logs, Sentry errors
2. **Rollback code** → Vercel Dashboard → Deployments → Promote previous deployment
3. **If database corrupted** → Restore from Neon backup or PITR
4. **Rotate secrets** if security breach suspected
5. **Verify recovery** → Test critical flows (login, booking, payments)
6. **Communicate** → Notify users of downtime and resolution

**Expected Outcome:** App restored to last working state within 15 minutes.

### Story 6: Scaling for Traffic Spike

**Scenario:** Sudden increase in traffic (e.g., marketing campaign).

**Steps:**
1. **Monitor** → Check Vercel Analytics for traffic spikes
2. **Auto-scale** → Vercel automatically scales serverless functions
3. **Database** → Increase Neon connection pool if needed
4. **Cache** → Enable edge caching for static assets
5. **CDN** → Verify edge network is serving requests
6. **Monitor** → Watch error rates and response times

**Expected Outcome:** App handles traffic spike without degradation.

---

## 16. Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Can't reach database server"** | Database URL incorrect or DB down | Check `DATABASE_URL`, ensure Neon/Railway is running |
| **"AUTH_SECRET is not set"** | Missing environment variable | Add `AUTH_SECRET` to Vercel env vars |
| **Seed data in production** | `seed.ts` not locked | PR #24 locks `seed.ts` — verify it's applied |
| **Magic login works in prod** | `DEV_ACCESS_KEY` not empty | Clear `DEV_ACCESS_KEY` in production env |
| **Migration fails on deploy** | Schema changes not applied | Run `npx prisma migrate deploy` manually |
| **SSL certificate not working** | DNS not propagated | Wait 1-48 hours for DNS propagation |
| **404 on /setup page** | Setup page disabled (admin exists) | First admin already created |
| **Webhook not receiving events** | Webhook URL incorrect | Verify URL matches production domain |
| **Payment not processing** | Test vs live mode mismatch | Ensure live keys in production |
| **Slow page loads** | No caching, high latency | Enable edge caching, optimize queries |

---

## 17. Post-Deployment Checklist

After deployment, verify:

### Security
- [ ] Visit `https://your-domain.com` → Should show site over HTTPS
- [ ] Visit `http://your-domain.com` → Should redirect to HTTPS
- [ ] Check security headers: `curl -I https://your-domain.com`
- [ ] Verify magic login is disabled: Visit `/api/auth/magic-login` → Should redirect to `/setup`
- [ ] Verify seed data is disabled: `prisma/seed.ts` should not run

### Functionality
- [ ] Login with Platform Admin credentials
- [ ] Visit `/platform/setup` → Should show empty dashboard
- [ ] Create a test SaaS club
- [ ] Verify booking flow works
- [ ] Test payment integration (if enabled)
- [ ] Test WhatsApp notifications (if enabled)

### Performance
- [ ] Run Lighthouse audit (Chrome DevTools)
- [ ] Check Vercel Analytics → Response times < 200ms
- [ ] Check error rates in Sentry → Should be near zero

### Monitoring
- [ ] Verify Vercel Analytics is tracking
- [ ] Verify Sentry error tracking is working
- [ ] Verify uptime monitoring is active
- [ ] Verify log access in Vercel Dashboard

---

## 📞 Support

| Resource | Link |
|----------|------|
| Vercel Docs | https://vercel.com/docs |
| Neon Docs | https://neon.tech/docs |
| Prisma Docs | https://www.prisma.io/docs |
| Next.js Docs | https://nextjs.org/docs |
| Sentry Docs | https://docs.sentry.io |
| Project Issues | https://github.com/plinthsystems/blackball-pos/issues |

---

**Last Updated:** 2026-08-21  
**Version:** 1.0.0  
**Author:** BlackBall POS Team

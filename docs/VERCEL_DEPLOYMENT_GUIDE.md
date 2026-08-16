# Vercel Deployment Walkthrough — BlackBall POS (Beginner Edition)

This guide shows you how to deploy the `BlackBall POS` app on **Vercel**,
step by step. You do not need any experience. Every command is explained.
Every setting is explained.

> **Overview in simple words:** Your code lives in a GitHub repository
> (`plinthsystems/blackball-pos`). **Vercel** is a hosting service. It runs
> your code on the internet (https://your-domain.com). Your app data (login,
> tables, bookings) is stored in a **Postgres database**. For the database we
> use only the database service from **Neon**. Every time you `push` code to
> GitHub, Vercel builds the app again and deploys it. This is called "GitHub
> auto-deploy".

---

## Table of Contents

1. [What You Need](#1-what-you-need)
2. [Phase 0 — Pre-flight: check everything first](#2-phase-0--pre-flight-check-everything-first)
3. [Phase 1 — Neon: create the database and run migrations](#3-phase-1--neon-create-the-database-and-run-migrations)
4. [Phase 2 — Vercel: import the project](#4-phase-2--vercel-import-the-project)
5. [Phase 3 — Add environment variables (env vars)](#5-phase-3--add-environment-variables-env-vars)
6. [Phase 4 — First deploy and your domain](#6-phase-4--first-deploy-and-your-domain)
7. [Phase 5 — Post-deploy smoke test](#7-phase-5--post-deploy-smoke-test)
8. [Phase 6 — Updates and daily operations](#8-phase-6--updates-and-daily-operations)
9. [Troubleshooting — common problems and fixes](#9-troubleshooting--common-problems-and-fixes)
10. [Glossary — a small dictionary](#10-glossary--a-small-dictionary)

---

## 1. What You Need

| Item | Where to get it | What it does |
| :--- | :--- | :--- |
| GitHub repo | You already have it | Stores your code |
| Vercel account | https://vercel.com (free signup) | Deploys your code on the internet |
| Neon account | https://console.neon.tech | Gives you a database (Postgres) — **database only** |
| Domain (optional) | Namecheap / GoDaddy / .vercel.app | We will handle this later, no need to worry now |

**Important note:** We use Neon only for the database. We do not add Neon
Auth, Neon SDK, or the Neon CLI to the code. The app uses one connection
string named `DATABASE_URL`, exactly like with any Postgres provider.

---

## 2. Phase 0 — Pre-flight: check everything first

Before you deploy, confirm that your code is safe. Run these 3 commands one
by one inside your repo folder on your laptop
(`/Users/purusottamkhedre/Dev/projects/github/Business`):

```bash
npm run typecheck
```

- **What it does:** Checks the TypeScript code for type errors. If something
  is wrong, it shows errors — fix them first, do not move on.
- **Good result:** no red errors.

```bash
npm test
```

- **What it does:** Runs all unit and integration tests (122 tests).
- **Good result:** `122 passed`, `0 failed`.

```bash
npm run build
```

- **What it does:** Creates a production-ready bundle. This is the same
  build that Vercel will run.
- **Good result:** something like `Compiled successfully`.

> **For beginners:** If all 3 commands pass, your code is ready to deploy.
> If one fails, read the error, fix it, and run the command again.

---

## 3. Phase 1 — Neon: create the database and run migrations

The app needs a **database**. We will create a project and a database on
Neon.

### Step 1.1 — Open the Neon console

1. Open https://console.neon.tech in your browser and log in.
2. Use the existing project **"Blackball POS"**, or create a new one
   ("Create project" → give a name, choose the region
   `US East (N. Virginia)` — we will keep Vercel in the same region, so the
   app stays fast).

### Step 1.2 — Create the databases

You need **two** databases (for two different environments):

| Environment | Who uses it | Database name (suggested) |
| :--- | :--- | :--- |
| Production | Live customers | `blackball` |
| Preview | PR/branch testing (a safe place for you) | `blackball_preview` |

To create a database in Neon: open your project → **Databases** tab →
**Create database** → type the name (`blackball`) → Create.

> **In simple words:** Production holds real data. Preview holds test data
> that changes all the time. Keeping them apart protects customer data from
> mistakes.

### Step 1.3 — Copy the connection strings

1. Go to the **Branches** tab → open the default branch (the production
   branch is usually named "production").
2. Click **Connect** → under **Connection strings**, copy the **Pooled
   connection string**. It looks like this:

   ```
   postgresql://neondb_owner:password@ep-abc-123-pooler.us-east-1.aws.neon.tech/blackball?sslmode=require
   ```

3. Replace `/neondb` in the URL with your database name (`/blackball`).
   Neon may also give the full URL when you create the database.
4. Do the same for `blackball_preview`, and save the pooled URL in a safe
   place. **(The URL contains a password — never share it, and never commit
   it to code.)**

> **Beginner note — what is "Pooled"?** When many people use the app,
> Vercel's server connects to the database many times. A pooled URL uses a
> gateway to manage these connections. That is why we use the `-pooler` URL.
> Important: the URL must contain `sslmode=require`. This means the
> connection is encrypted and safe.

### Step 1.4 — Run the migrations (create the tables)

The app needs **tables** in the database (Users, Tables, Bookings, etc.).
**Prisma migrations** create these tables.

```bash
DATABASE_URL="postgresql://neondb_owner:...@...pooler...us-east-1.aws.neon.tech/blackball?sslmode=require" npx prisma migrate deploy
```

- `DATABASE_URL="..."` — this tells the app which database to talk to. Put
  the PROD URL here (replace `...` with your actual URL).
- `npx prisma migrate deploy` — applies all pending migrations to the
  database.
- **Good output:** `All migrations have been successfully applied.` (12
  migrations will run).

Run the same command for the preview database, but use the `blackball_preview`
URL instead.

> **Very IMPORTANT — never run SEED in production:**
> `npm run prisma:seed` only creates DEMO data (demo users with
> `Password@123`). Do not run it on production. The next step shows the
> right way to create your first admin.

### Step 1.5 — Create your first Platform Admin (one-time task)

Who logs in first? We do not run seed, so we create one **PLATFORM_ADMIN**
with a one-time script. This admin is you.

Create a new file: `scripts/bootstrap-admin.ts` (create the `scripts/`
folder if it does not exist), and paste this:

```ts
import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/auth-service";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var missing — pass it with the command: DATABASE_URL=...");

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? "platform@blackball.example";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? randomBytes(6).toString("base64url");

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await prisma.permission.upsert({
      where: { key: "platform.setup.manage" },
      update: {},
      create: { key: "platform.setup.manage" }
    });

    const admin = await prisma.employee.upsert({
      where: { id: "platform-admin-prod" },
      update: { email, passwordHash: hashPassword(password), accountType: "PLATFORM_ADMIN", active: true, mustChangePassword: false },
      create: {
        id: "platform-admin-prod",
        name: "Platform Admin",
        email,
        passwordHash: hashPassword(password),
        accountType: "PLATFORM_ADMIN",
        active: true
      }
    });

    console.log("Platform admin ready!");
    console.log("  Email:", admin.email);
    console.log("  Password:", password);
    console.log("  (Password shown once — note it now, then change it after login)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Then run it (with the PROD URL):

```bash
DATABASE_URL="postgresql://.../blackball?sslmode=require" npx tsx scripts/bootstrap-admin.ts
```

- **What it does:** Creates one `PLATFORM_ADMIN` account and adds the
  `platform.setup.manage` permission (this permission used to come from
  seed, so we add it manually).
- **Note:** the script upserts on a fixed `id` ("platform-admin-prod"), not
  on the email — because `Employee.email` is not unique in the schema. So
  you can run the script again: the password updates, and no duplicate
  account is created.
- The output shows the email and password — note them down now.
- After the deploy, log in at `https://your-domain.com/login` with this
  email and password. (You created this bootstrap script yourself, so treat
  it like seed — **remove this file from the repo after the deploy**, or
  better, do not commit it at all. Otherwise someone might see it.)

---

## 4. Phase 2 — Vercel: import the project

1. Go to https://vercel.com → sign up or log in with GitHub.
2. Click **Add New... → Project**.
3. Vercel shows your GitHub account → click **Import** next to the
   **plinthsystems/blackball-pos** repo.
4. A settings page opens — use these values:

   | Setting | Value | What it means |
   | :--- | :--- | :--- |
   | Framework Preset | **Next.js** (auto detected) | Vercel knows how to build the app |
   | Root Directory | `/` (default, box empty) | The code sits at the root of the repo |
   | Build Command | `npx prisma generate && next build` | Creates the Prisma client, then builds the app |
   | Install Command | `npm install` (auto) | Installs all packages |
   | Node.js Version | **22.x** (default/current) | Which Node version runs your code |

   > **Why `npx prisma generate` in the build command?**
   > Prisma creates code (the client) from your database "schema". Vercel
   > gets fresh code from GitHub, so the client must be regenerated before
   > the build. Then `next build` bundles the app.

5. Leave the **Environment Variables** section empty for now — we will add
   them in the next phase (after the project exists). Click **Deploy**.

> **How does the first deploy work?** Vercel picks up your code, builds it
> (takes 2-4 minutes), and gives you a FREE URL like
> `https://blackball-pos-xyz.vercel.app`. The first result is a green tick
> or a red cross. If it is red, read the error log in the "Deployments" tab
> (the Troubleshooting section also helps).

---

## 5. Phase 3 — Add environment variables (env vars)

**In simple words:** An env var is a secret or config value. It works like a
`.env` file, but it lives in the Vercel dashboard. The code reads it with
`process.env.NAME`. **Secrets live here — NEVER put them in code.**

In the Vercel dashboard: open your project → **Settings → Environment
Variables**. Then add these one by one:

| Variable | Value | Where from | Scope |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | The Neon pooled URL (`.../blackball?sslmode=require`) | Copy from Neon console | Production, Preview, **Build-time** |
| `AUTH_SECRET` | The output of `openssl rand -hex 32` (a long random string) | Run the command on your laptop | Production, Preview (Runtime) |
| `NEXT_PUBLIC_APP_NAME` | `Cue Club Admin` | You | All |
| `APP_BASE_URL` | `https://<your-domain>` | Add after you know your domain | All (Runtime) |

**How to add (in detail):**

1. Type `DATABASE_URL` in the **Name** box.
2. Paste the Neon production pooled URL in the **Value** box.
3. In the **Environment** dropdown, tick both **Production** and **Preview**.
   - `DATABASE_URL` is also needed at build-time (the build runs `prisma
     generate`). If the "Advanced" section is open, keep **Expose to
     build-time** ticked — so the build can use it.
4. Click **Add**.

Do the same for: `AUTH_SECRET` (1-2 min: first run `openssl rand -hex 32`
on your laptop and put the output in the Value), `NEXT_PUBLIC_APP_NAME`,
`APP_BASE_URL`.

**Separate DATABASE_URL for Preview:** Add another variable named
`DATABASE_URL`, but put the `blackball_preview` URL in the value, and tick
**only Preview**. Result: when you push a PR or branch, the preview
deployment talks to the preview database — production data stays safe.

**Never add these variables:**

| Do not add | Why |
| :--- | :--- |
| `MAGIC_LOGIN_ENABLED=true` | It opens login without a password — unsafe |
| `DEV_ACCESS_KEY` | This is the key for magic login — not for prod |
| `DOCS_ENABLED` | It opens the `/docs` handbook to the public — only if you really want it |

---

## 6. Phase 4 — First deploy and your domain

### What is done so far...

- The project exists on Vercel, and the env vars are set.

### 6.1 Deploy every new change (just remember this)

**Just `git push` — Vercel redeploys automatically.** You can also run a
new test deploy now:
- Start a `PRODUCTION` deployment now: **Deployments** tab → dots
  menu → **Redeploy** (or just `git push` once and watch it build).

### 6.2 Add a custom domain (optional, recommended)

The app is now at `https://project.vercel.app`. To use your own domain
(like `blackball.example.com`):

1. Vercel → **Settings → Domains** → type your domain → **Add**.
2. Vercel tells you the DNS records to create:
   - **For a subdomain** (like `app.yourdomain.com`): create a **CNAME**
     record on your DNS → `app` → `cname.vercel-dns.com`.
   - **For a root domain** (`yourdomain.com`): an **A** record →
     `76.76.21.21`.
     (You create DNS records in your domain provider's dashboard —
     Namecheap, GoDaddy, Cloudflare — in their "DNS" section.)
3. As soon as the records exist, Vercel sets up TLS (SSL certificate)
   automatically — the URL will run on `https://`. It takes a few minutes;
   when the status turns green, you are done.

> **What is TLS/HTTPS?** It is the secure connection shown by the browser
> `lock` icon. Vercel gives it for free on custom domains. You never have
> to set up a certificate yourself.

---

## 7. Phase 5 — Post-deploy smoke test

After the deploy, open the app in the browser and check all of this (in
this order):

1. **Open the URL** — `https://app.yourdomain.com` (or the vercel.app URL).
   → The login page should open.
2. **Log in as platform admin** — with the email/password from the
   bootstrap script. → You should land on `/platform/setup`.
3. **Run a test:** enter a wrong password at `/login` → an error should
   appear. Try to open `/dashboard` without logging in → you should be
   sent to `/login`.
4. **Check the booking link:** open a store's booking link from
   settings/online booking (`/book/<slug>`) → the page should open and show
   the booking form.
5. **Check the headers** (from the command line): run this on your laptop:
   ```bash
   curl -I https://app.yourdomain.com/login
   ```
   → The output should show `Strict-Transport-Security`,
   `X-Frame-Options: DENY`, and `Content-Security-Policy`. (These security
   headers come from `next.config.ts` — you do not need to change
   anything.)
6. **Webhooks (optional):** If you have not wired Razorpay or Stripe, the
   webhook URLs return 503 because their secret is missing. This is
   expected behavior, not a problem.

> **Things that often go wrong the first time:**
> - Login redirect loop → the deployed `AUTH_SECRET` is old or missing →
>   check Settings → Environment Variables, then Redeploy.
> - "Database connection failed" → check the spelling and scope of
>   `DATABASE_URL`.
> - An error like "Please set AUTH_SECRET" → `AUTH_SECRET` is missing or
>   empty.

---

## 8. Phase 6 — Updates and daily operations

Your app is now LIVE. Here is what happens regularly:

### 8.1 New feature or schema change

1. Any `schema.prisma` change → **first** run `npx prisma migrate dev`
   (locally this creates a new migration file).
2. Commit the new migration file and push it.
3. **Migrate the prod database:** (from your laptop, with the prod URL)
   ```bash
   DATABASE_URL="postgresql://.../blackball?sslmode=require" npx prisma migrate deploy
   ```
4. Push the code → Vercel builds (generate + next build) → app is live.
   > **Order matters:** run the migration first, then deploy the code, so
   > the tables already exist when the new code runs.

### 8.2 Backups

Neon keeps backups automatically (point-in-time restore — you can restore
the database to any point in time, also with Neon's "Branching" feature).
Once a week, open the Neon console and do a health check.

### 8.3 View logs

Vercel dashboard → your project → **Logs** tab → all errors and traffic
show there.

### 8.4 Rotate a secret

If `AUTH_SECRET` leaks: generate a new `openssl rand -hex 32`, update it on
Vercel, and redeploy. Warning: this ends the session of every logged-in
user (they log in again). This is exactly what you want during incidents.

---

## 9. Troubleshooting — common problems and fixes

| Problem | Likely cause | Fix |
| :--- | :--- | :--- |
| Vercel build fails at `prisma generate` | `DATABASE_URL` not available at build-time | Give DATABASE_URL a "Production + Preview" scope with Build-time enabled |
| "Missing database env: DATABASE_*" | Prisma did not get the parts at build time | Just add `DATABASE_URL` (it overrides the parts) |
| "AUTH_SECRET is required" | `AUTH_SECRET` empty or missing | Settings → env vars → add → redeploy |
| Login sends you back to /login | Old session or `AUTH_SECRET` mismatch | Clear browser cookies; if `AUTH_SECRET` is set, redeploy |
| "Can't reach database" / 500 errors | `DATABASE_URL` wrong or misspelled | Copy the Neon URL again, check `sslmode=require` |
| Migration `channel_binding` parameter error | Some Prisma versions reject this URL parameter | Remove `&channel_binding=require` from the URL (keep sslmode) |
| Webhooks 503 | Payment/WhatsApp secrets not provided | Set them only when you enable the integration |
| Preview shows prod data | Preview env has the prod DATABASE_URL | Put the `blackball_preview` URL in the Preview env |
| `npm run build` fails locally | Type errors or missing dependencies | Run `npm install`, then fix typecheck and build |
| Domain does not resolve | DNS propagation or wrong record type | Verify CNAME vs A record, wait 15-60 min |

If anything else gets stuck:
- Vercel → Deployment → open the error log (on the red-cross deployment).
- Neon console → check that the database "compute" is active (instances
  with 0 CU suspend, but they start automatically when a request comes in).

---

## 10. Glossary — a small dictionary

| Word | Meaning (simple) |
| :--- | :--- |
| **Deploy** | Put the code on the internet so users can reach it |
| **Build** | The process of turning code into a production-ready bundle |
| **Repository (repo)** | The folder of code that lives on GitHub |
| **Environment** | Production / Preview / Development — separate modes |
| **Env var** | Config or secret values read from `process.env.X` |
| **Connection string / URL** | The address of the database + password (like an address) |
| **Pooled URL** | A gateway URL for multiple connections (`-pooler`) |
| **Migration** | A file describing a database schema change + the process of applying it |
| **Schema** | The definition of the database structure (prisma/schema.prisma) |
| **Seed** | A script that creates DEMO data — never in production |
| **CLI** | Commands run in the Terminal (command line) |
| **TLS/HTTPS** | Secure internet connection (browser lock icon) |
| **CNAME / A record** | DNS settings that connect a domain to Vercel |
| **Redirect loop** | The URL keeps sending you from one page to another, so the page never opens — a common `AUTH_SECRET` issue |

---

**Your app is now LIVE. 🎉** If you get stuck at any step, check the
Troubleshooting section (§9) first, then verify your env vars in the table
in §5. Happy shipping!

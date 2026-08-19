# Vercel Deployment Walkthrough — BlackBall POS (Beginner Edition)

Yeh guide tumhe `BlackBall POS` app ko **Vercel** pe deploy karne ka pura raasta
sikhayegi — step by step, zero experience ke saath bhi chal jayegi. Har command ka
matlab, har setting kya karti hai — sab likha hai.

> **Simple words mein overview:** Tumhare paas code ek GitHub repo mein hai
> (`plinthsystems/blackball-pos`). **Vercel** ek hosting service hai jo us code ko
> internet pe chala degi (https://tumhara-domain.com). App ka data (login, tables,
> bookings) ek **Postgres database** mein store hota hai. Database ke liye hum
> **Neon** ka sirf database service use karenge. Vercel har baar jab tum GitHub pe
> code `push` karo to naya build banakar deploy kar degi — isi ko "GitHub
> auto-deploy" kehte hain.

---

## Table of Contents

1. [Samjho: Kya kya cheezein chahiye](#1-samjho-kya-kya-cheezein-chahiye)
2. [Phase 0 — Pre-flight: pehle sab check kar lo](#2-phase-0--pre-flight-pehle-sab-check-kar-lo)
3. [Phase 1 — Neon: database banao aur migrations chalao](#3-phase-1--neon-database-banao-aur-migrations-chalao)
4. [Phase 2 — Vercel: project import karo](#4-phase-2--vercel-project-import-karo)
5. [Phase 3 — Environment variables (env vars) daalo](#5-phase-3--environment-variables-env-vars-daalo)
6. [Phase 4 — Pehla deploy + domain](#6-phase-4--pehla-deploy--domain)
7. [Phase 5 — Post-deploy: sab kaam karta hai ya nahi (smoke test)](#7-phase-5--post-deploy-sab-kaam-karta-hai-ya-nahi-smoke-test)
8. [Phase 6 — Updatess & daily operations](#8-phase-6--updates--daily-operations)
9. [Troubleshooting — aam galatiyan aur unka ilaaj](#9-troubleshooting--aam-galatiyan-aur-unka-ilaaj)
10. [Glossary — chhota shabdkosh](#10-glossary--chhota-shabdkosh)

---

## 1. Samjho: Kya kya cheezein chahiye

| Cheez | Kahan milegi | Kya karti hai |
| :--- | :--- | :--- |
| GitHub repo | Kya tumhare paas already hai | Code store karta hai |
| Vercel account | https://vercel.com (free signup) | Code ko internet pe deploy karta hai |
| Neon account | https://console.neon.tech | Database (Postgres) deta hai — **sirf database** |
| Domain (optional) | Namecheap / GoDaddy / .vercel.app | Thoda baad mein, chinta mat karo |

**Important note:** Hum Neon ka SIRF database use karenge. Neon Auth, Neon SDK,
neon CLI — kuch bhi code mein add nahi hoga. Sirf provider ki tarah
`DATABASE_URL` naam ki ek connection string use hogi, jaise kisi bhi Postgres
provider ki hoti hai.

---

## 2. Phase 0 — Pre-flight: pehle sab check kar lo

Deploy karne se pehle confirm kar lo ki code safe hai. Apne laptop ke repo
folder mein (`/Users/purusottamkhedre/Dev/projects/github/Business`) yeh 3
commands chalao, ek ek karke:

```bash
npm run typecheck
```

- **Matlab:** TypeScript ke type errors check karta hai. Kaam nahi kiya to
  errors dikhayega — pehle wo fix karo, aage mat badho.
- **Sahi result:** koi red error nahi dikhta.

```bash
npm test
```

- **Matlab:** Saare unit + integration tests chala deta hai (122 tests).
- **Sahi result:** `122 passed`, `0 failed`.

```bash
npm run build
```

- **Matlab:** Production-ready bundle banata hai. Yehi build Vercel pe banega.
- **Sahi result:** `Compiled successfully` jaisa kuch.

> **Beginners ke liye:** Agar yeh teeno commands successful hain to tumhara code
> deploy ke layak hai. Agar koi fail ho, to error padho, fix karo, dobara chalao.

---

## 3. Phase 1 — Neon: database banao aur migrations chalao

App ko **database** chahiye. Hum Neon pe ek project + usme database banayenge.

### Step 1.1 — Neon console kholo

1. Browser mein https://console.neon.tech pe jao aur login karo.
2. Ya to existing project **"Blackball POS"** use karo, ya naya project banao
   ("Create project" → name do, region `US East (N. Virginia)` choose karo —
   baad mein Vercel bhi isi region mein rakhenge taaki speed acchi rahe).

### Step 1.2 — Databases banao

Tumhe **do** databases chahiye (do alag environments ke liye):

| Environment | Kaun use karega | Database naam (suggested) |
| :--- | :--- | :--- |
| Production | Live customers | `blackball` |
| Preview | PR/branch testing (tumhare liye safe place) | `blackball_preview` |

Neon mein database banane ke liye: project kholo → **Databases** tab → **Create
database** → naam likho (`blackball`) → Create.

> **Simple words mein:** Production = asli duniya ka data. Preview = testing ka
> data jo udta-firta hai, koi farak nahi padta. Dono alag rakhne se koi galti
> se bhi customers ka data kharab nahi hoga.

### Step 1.3 — Connection string copy karo

1. **Branches** tab pe jao → default branch (**production** branch, naam might
   already be "production") kholo.
2. **Connect** button dabao → **Connection strings** section mein **Pooled
   connection string** copy karo. Kuch aisa dikhega:

   ```
   postgresql://neondb_owner:password@ep-abc-123-pooler.us-east-1.aws.neon.tech/blackball?sslmode=require
   ```

3. Is URL mein `/neondb` ki jagah apne database name (`/blackball`) bhejo —
   ya database me create karte waqt Neon khud URL dega.
4. Isi tarah `blackball_preview` ka pooled URL bhi copy karke kahin safe jagah
   note kar lo. **(URL mein password hai — ise kisi ko mat bhejna, aur code mein
   commit mat karna.)**

> **Beginner note — "Pooled" kya hota hai?** Jab bahut saare log app use karte
> hain, Vercel ka server kai baar database se connect hota hai. Pooled URL ek
> gateway se yeh connections manage karta hai. Isi liye hum `-pooler` wala URL
> use karte hain. Dhyan raho: URL mein `sslmode=require` hona chahiye (iska
> matlab: connection encrypted hai — safe hai).

### Step 1.4 — Migrations chalao (tables banate hain)

App chalaane ke liye database mein **tables** chahiye (Users, Tables, Bookings
etc.). Yeh tables banane ka kaam **prisma migrations** karte hain.

```bash
DATABASE_URL="postgresql://neondb_owner:...@...pooler...us-east-1.aws.neon.tech/blackball?sslmode=require" npx prisma migrate deploy
```

- `DATABASE_URL="..."` — yeh app ko batata hai ki kaunse database se baat karni hai
  (PROD wala URL yahan lagao, `...` ko apne actual URL se replace karo).
- `npx prisma migrate deploy` — saari pending migrations database pe apply karta hai.
- **Sahi output:** `All migrations have been successfully applied.` (12 migrations
  lagenge).

Preview database ke liye bhi yehi command chalao, bas URL badal ke
`blackball_preview` wala.

> **Bahut IMPORTANT — kabhi bhi production mein SEED mat chalao:**
> `npm run prisma:seed` sirf DEMO data banata hai (`Password@123` wale demo
> users). Production pe yeh bilkul nahi chalana — agla step dekho, wahan first
> admin banane ka sahi tareeka hai.

### Step 1.5 — First Platform Admin banao (ek baar ka kaam)

App mein sabse pehle login kaun karega? Seed nahi chalana, isliye hum ek
one-time script se ek **PLATFORM_ADMIN** bana denge (yehi Tum hoge).

Ek nayi file banao: `scripts/bootstrap-admin.ts` (agar `scripts/` folder nahi hai
to bana lo), aur yeh paste karo:

```ts
import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/auth-service";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var nahi hai — is command ke saath do: DATABASE_URL=...");

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
    console.log("  (Password sirf ab dikha — ise abhi note kar lo, phir login karke change kar dena)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Phir run karo (PROD URL ke saath):

```bash
DATABASE_URL="postgresql://.../blackball?sslmode=require" npx tsx scripts/bootstrap-admin.ts
```

- **Matlab:** Ek `PLATFORM_ADMIN` account banata hai + `platform.setup.manage`
  permission add karta hai (yeh permission seed se aati thi, isliye manually
  daalni padti hai).
- **Socho, script `email` pe nahi, ek fixed `id` ("platform-admin-prod") pe
  upsert karti hai** — kyunki schema mein Employee.email unique hai nahi. Isliye
  script dobaara bhi chala sakte ho: password update hoga, duplicate account
  nahi banega.
- Output mein email + password dikhega — abhi note kar lo.
- Deploy ke baad isi email/password se
  `https://tumhara-domain.com/login` pe login karna hai. (Bootstrap script tumne
  banayi hai to usko seed ki tarah treat karo — **deploy ke baad is file ko repo
  se hata dena** is safe, warna koi dekh sakta hai. Ya isse commit hi mat karo.)

---

## 4. Phase 2 — Vercel: project import karo

1. https://vercel.com pe jao → GitHub se sign up/login karo.
2. **Add New... → Project** dabao.
3. Vercel tumhara GitHub account dikhayega → **plinthsystems/blackball-pos**
   repo ke saamne **Import** dabao.
4. Ab ek settings page khulega — yeh rakho:

   | Setting | Value | Matlab |
   | :--- | :--- | :--- |
   | Framework Preset | **Next.js** (auto detected) | Vercel ko pata hai kaise build karna hai |
   | Root Directory | `/` (default, box empty) | Code repo ke root mein hai |
   | Build Command | `npx prisma generate && next build` | Prisma client banata hai, phir app banata hai |
   | Install Command | `npm install` (auto) | Saare packages install hote hain |
   | Node.js Version | **22.x** (default/current) | Code kis Node version pe chalega |

   > **Build command mein `npx prisma generate` kyun?**
   > Prisma tumhare database "schema" se code banata hai (client). GitHub se Vercel
   > pe fresh code aata hai, isliye build se pehle client regenerate karna zaroori
   > hai. Phir `next build` app ko bundle karta hai.

5. **Environment Variables** section abhi khaali chhodo — wo agle phase mein
   add karenge (pehle project ban jaye). **Deploy** button dabao.

> **Pehla deploy kaise hota hai?** Vercel tumhara code uthata hai, build karta
> hai (2-4 minute lagte hain), aur `https://blackball-pos-xyz.vercel.app` jaisa
> ek FREE URL deta hai. Pehli baar ya to green tick aayegi ya red cross — red ho
> to "Deployments" tab mein error log padho (Troubleshooting section bhi dekho).

---

## 5. Phase 3 — Environment variables (env vars) daalo

**Simple words mein:** Env var = aise secret/config values jo `.env` file ki
tarah hoti hain, lekin Vercel ke dashboard mein. Code unhe `process.env.NAAM`
se padhta hai. **Yahan secrets rakhe jaate hain — YE KABHI CODE MEIN NAHI
DAALNE KE.**

Vercel dashboard mein: apna project kholo → **Settings → Environment Variables**.
Phir ek ek karke yeh add karo:

| Variable | Value | Kahan se | Scope |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Neon wala pooled URL (`.../blackball?sslmode=require`) | Neon console se copy | Production, Preview, **Build-time** |
| `AUTH_SECRET` | `openssl rand -hex 32` chalao jo mile (ek long random string) | Apne laptop pe command chalao | Production, Preview (Runtime) |
| `NEXT_PUBLIC_APP_NAME` | `Cue Club Admin` | Tum | All |
| `APP_BASE_URL` | `https://<tumhara-domain>` | deploy ke baad domain jaan kar daalna | All (Runtime) |

**Add karna (detaial mein):**

1. **Name** box mein `DATABASE_URL` likho.
2. **Value** box mein Neon ka production pooled URL paste karo.
 3. **Environment** dropdown mein **Production** + **Preview** dono tick karo.
    - `DATABASE_URL` build-time pe bhi chahiye hai (build `prisma generate` chalata
      hai). Env var ka "Advanced" section khula ho to **Expose to build-time** pe
      tick rakho — taaki build ke waqt bhi mile.
4. **Add** dabao.

Aise hi: `AUTH_SECRET` (1-2 min: pehle apne laptop pe `openssl rand -hex 32` chalao,
output ko Value mein daalo), `NEXT_PUBLIC_APP_NAME`, `APP_BASE_URL`.

**Preview ke liye alag DATABASE_URL:** Add new variable `DATABASE_URL` ke naam se,
par value mein `blackball_preview` wala URL daalo, aur **sirf Preview**
environment tick karo. Iska result: jab tum koi PR/branch push karoge to preview
deployment naye preview database se baat karegi — production data safe rahega.

**Yeh variable kabhi mat daalna:**

| Mat daalo | Kyun |
| :--- | :--- |
| `MAGIC_LOGIN_ENABLED=true` | Isse bina password ke login khul jayega — unsafe |
| `DEV_ACCESS_KEY` | Yehi key paper hai magic login ki — prod mein nahi |
| `DOCS_ENABLED` | `/docs` handbook externally khulta hai — sirf isliye daalo agar tumhe do | 

---

## 6. Phase 4 — Pehla deploy + domain

### Yahan tak ho chuka hai...

- Vercel pe project bana hai, env vars daal chuke ho.

### 6.1 Har naya change deploy karne ke liye (sirf yaad rakho)

**Bas `git push` karo — Vercel khud redeploy kar degi.** Abhi ek naya test
deploy bhi chala kar dekh sakte ho:
- Abhi `PRODUCTION` deployment chaalu karo: **Deployments** tab → dots
  menu → **Redeploy** (ya ek baar `git push` karke dekho).

### 6.2 Custom domain lagao (optional, recommended)

Abhi app `https://project.vercel.app` pe hai. Apna domain (jaise
`blackball.example.com`) lagane ke liye:

1. Vercel → **Settings → Domains** → apna domain likho → **Add**.
2. Vercel tumhe 2 DNS records batayegi:
   - **Agar subdomain** (jaise `app.tumharadomain.com`): DNS pe **CNAME** record
     banao → `app` → `cname.vercel-dns.com`.
   - **Agar root domain** (`tumharadomain.com`): **A** record → `76.76.21.21`.
     (DNS records tumhare domain provider ke dashboard pe banate ho — Namecheap,
     GoDaddy, Cloudflare — wahan "DNS" section hota hai.)
3. Record bante hi Vercel automatic TLS (SSL certificate) lagayega — URL `https://`
   se chalegi. Kuch minutes lage; status green ho jaye to done.

> **TLS/HTTPS kya hai?** Browser wale `lock` icon wali safe connection — Vercel
> free mein automatically de deta hai custom domain pe. Kabhi khud certificate
> nahi lagana padta.

---

## 7. Phase 5 — Post-deploy: sab kaam karta hai ya nahi (smoke test)

Deploy hone ke baad browser mein kholo aur yeh sab check karo (isise order mein):

1. **URL khulo** — `https://app.tumharadomain.com` (ya vercel.app wala URL).
   → Login page khulna chahiye.
2. **Platform admin login karo** — wohi email/password jo bootstrap script se
   mile the. → `/platform/setup` pe land hona chahiye.
3. **Ek test karo:** `/login` pe galt password daalo → error aana chahiye.
   `/dashboard` pe bina login ke jaane ki koshish karo → `/login` pe bhej dena
   chahiye.
4. **Booking link check:** settings/online booking se kisi store ka booking link
   kholo (`/book/<slug>`) → page khulna chahiye, booking form dikhna chahiye.
5. **Headers check** (command-line se): apne laptop pe run karo:
   ```bash
   curl -I https://app.tumharadomain.com/login
   ```
   → Output mein `Strict-Transport-Security`, `X-Frame-Options: DENY`,
   `Content-Security-Policy` dikhna chahiye. (Yeh security headers code mein
   `next.config.ts` se aate hain — kuch change nahi karna.)
6. **Webhooks (optional):** Tumne Razorpay/Stripe nahi wire kiye to webhook URLs
   missing-secret pe 503 lote hain — designed behavior, no issue.

> **Pehli baar jo 2-3 cheezon mein problem aa sakti hai:**
> - Login redirect loop → `AUTH_SECRET` ka deploy purana/chhuta hai → Settings →
>   Environment Variables check karo, deploy ko Redploy karo.
> - "Database connection failed" → `DATABASE_URL` ka spelling/scope check karo.
> - "Please set AUTH_SECRET" jaisa error → AUTH_SECRET missing/empty hai.

---

## 8. Phase 6 — Updates & daily operations

Tumhara app ab LIVE hai. Ab regularly hota kya hai:

### 8.1 Naya feature/schema change

1. Koi bhi `schema.prisma` change → **sabse pehle** `npx prisma migrate dev`
   chalao (local mein isse nayi migration file banti hai).
2. Us nayi migration file ko commit + push karo.
3. **Database pe migrate prod:** (apne laptop se, prod URL ke saath)
   ```bash
   DATABASE_URL="postgresql://.../blackball?sslmode=require" npx prisma migrate deploy
   ```
4. Code push karo → Vercel build (generate + next build) → app live.
   > **Order important hai:** pehle migration deploy, phir code deploy, taki
   > naya code chalta waqt tables already exist karen.

### 8.2 Backups

Neon automatically backups rakhta hai (point-in-time restore — kisi bhi time pe
database restore kar sakte ho, Neon ke "Branching" feature se bhi). Weekly ek baar
Neon console kholkar health check karlo.

### 8.3 Logs dekho

Vercel dashboard → apna project → **Logs** tab → saare errors/traffic wahan
dikhte hain.

### 8.4 Secret rotate karna

Agar `AUTH_SECRET` leak ho jaye to: naya `openssl rand -hex 32` banao, Vercel pe
update karo, redeploy karo. Warning: isse saare logged-in users ka session khatam
ho jayega (wo dobara login karenge) — incidents mein yehi chahiye hota hai.

---

## 9. Troubleshooting — aam galatiyan aur unka ilaaj

| Problem | Likely cause | Ilaaj |
| :--- | :--- | :--- |
| Vercel build fail hota hai `prisma generate` pe | `DATABASE_URL` build time pe nahi mili | Env var mein DATABASE_URL "Production + Preview" + Build-time scope ke saath rakho |
| "Missing database env: DATABASE_*" | Build ke waqt prisma ko parts nahi mile | Bas `DATABASE_URL` daalo (wo override hota hai parts ke) |
| "AUTH_SECRET is required" | AUTH_SECRET empty/missing | Settings → env vars → add → redeploy |
| Login ke baad wapas /login pe aata hai | Purana session ya AUTH_SECRET mismatch | Browser ki cookies clear karo; AUTH_SECRET set hi ho to redeploy karo |
| "Can't reach database" / 500 errors | DATABASE_URL galat/spelling | Neon URL dobara copy karo, `sslmode=require` check karo |
| Migration `channel_binding` parameter error | Prisma kuch version is URL param ko na maane | URL se `&channel_binding=require` hatao (sslmode rakho) |
| Webhooks 503 | Payment/WhatsApp secrets nahi diye | Integration enable karo tabhi set karo |
| Preview bhi prod data dikha raha hai | Preview env mein prod DATABASE_URL | Preview mein `blackball_preview` URL daalo |
| `npm run build` locally fail | Type errors ya missing deps | `npm install` karo, typecheck + build fix karo |
| Domain resolve nahi ho raha | DNS propagation ya galat record type | CNAME vs A record verify karo, 15-60 min wait karo |

Yeh sab ke siway agar kuch aur atke, to:
- Vercel → Deployment → error log kholo (red cross wale deploy pe).
- Neon console → database ka "compute" active hai check karo (0 CU wale suspend ho
  jaate hain par request aate hi start ho jate hain).

---

## 10. Glossary — chhota shabdkosh

| Word | Matlab (simple) |
| :--- | :--- |
| **Deploy** | Code ko internet pe chala dena |
| **Build** | Code ko production-ready bundle banane ka process |
| **Repository (repo)** | Code ki folder jo GitHub pe hai |
| **Environment** | Production / Preview / Development — alag modes |
| **Env var** | `process.env.X` se milne wali config/secret values |
| **Connection string / URL** | Database tak pahunchne ka pata + password (jaise address) |
| **Pooled URL** | Multiple connections ke liye gateway wali URL (`-pooler`) |
| **Migration** | Database schema change ki file + usse apply karne ka process |
| **Schema** | Database ki structure definition (prisma/schema.prisma) |
| **Seed** | DEMO data banane wala script — production mein kabhi nahi |
| **CLI** | Terminal (command line) se run hone wale commands |
| **TLS/HTTPS** | Secure internet connection (browser lock icon) |
| **CNAME / A record** | DNS settings jo domain ko Vercel se jodte hain |
| **Redirect loop** | URL ek se dusre pe bhejta rahe, page kabhi khule na — aam AUTH_SECRET issue |

---

**Ab tumhara app LIVE hai. 🎉** Koi bhi step pe atko to Troubleshooting section
(§9) pehle dekho, phir is guide ki env var table (§5) verify karo. Happy shipping!

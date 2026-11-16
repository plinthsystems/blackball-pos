# The Nine — Local Testing Setup

The default local setup is now a single store: **The Nine**. The franchise,
HQ, and enterprise modules remain in the codebase, but they are not part of
the normal store workflow.

## Fast local setup

1. Start a PostgreSQL database and copy `.env.example` to `.env`.
2. Set `AUTH_SECRET` to any local-only secret, then run:

   ```bash
   npm ci
   npx prisma generate
   npx prisma migrate dev
   npm run prisma:seed
   npm run dev
   ```

3. Open [http://localhost:3000/](http://localhost:3000/). It goes directly to
   The Nine login screen.

## Login accounts

Both accounts are created by the seed. The default local password is
`Password@123`; change it with `THE_NINE_DEFAULT_PASSWORD` before seeding if
needed.

| Role | Email | Opens |
| --- | --- | --- |
| Admin | `admin@thenine.local` | Dashboard, Live Floor, Billing, Menu & Settings, Rates |
| Store | `store@thenine.local` | Live Floor, Billing |

Admin dashboard ranges are available at `/dashboard`, `/dashboard?range=7d`,
and `/dashboard?range=30d`.

## Reset local data

This clears the current database contents and recreates only The Nine's store
data, tables, products, rates, accounts, and sample sales history. Run it only
against the intended local database:

```bash
RESET_THE_NINE=true npx tsx scripts/reset-the-nine.ts
```

The script refuses to run unless `RESET_THE_NINE=true`. Production also needs
the separate `RESET_THE_NINE_PRODUCTION=true` safeguard.

## Verification commands

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The Playwright checks expect the database to be seeded and the app to be
available at `http://127.0.0.1:3000`.

## Preserved modules

Franchise organizations, HQ analytics, platform setup, public booking,
payments, WhatsApp, and the developer magic-login flow are still present for
future expansion. They are intentionally not shown in The Nine's minimal
navigation.

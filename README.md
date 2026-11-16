# The Nine POS

A focused single-store POS for The Nine cue sports club. The default workflow
has two logins:

- **Admin** — sales, revenue, analytics, rates, menu, and settings.
- **Store** — live floor and billing operations.

## Run locally

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Open [http://localhost:3000/](http://localhost:3000/); it redirects to the
login page. Local seed credentials are `admin@thenine.local` and
`store@thenine.local`, both using `Password@123` unless
`THE_NINE_DEFAULT_PASSWORD` is set before seeding.

See [docs/TESTING_AND_DEMO_SETUP.md](docs/TESTING_AND_DEMO_SETUP.md) for reset,
verification, and browser-test instructions.

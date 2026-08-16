# Project rules for AI agents (opencode)

Stack: Next.js 15 (App Router) + TypeScript, Prisma + Neon (Postgres), React Query, zod,
Tailwind, Vitest (unit/integration), Playwright (e2e).

## Verified commands

- typecheck: `npm run typecheck`
- unit/integration tests: `npm test` (vitest run)
- e2e: `npm run test:e2e` (playwright)
- schema change: `npx prisma generate` (after editing `prisma/schema.prisma`); migrations are
  only ever created in the MAIN tree, never inside a worktree
- local db is via .env (Neon); never commit or print secrets

## Layout

- `src/app` — route pages
- `src/features/<feature>` — feature modules (booking, live-tables, players, etc.); logic lives
  here (actions/queries), not in page files
- `src/components` — shared UI
- `src/lib` — shared utilities
- `src/server` — server-only code
- `docs/` — design/notes (docs/handbook excluded)
- `tests/` — e2e specs; `prisma/` — schema + seed

## Multi-window workflow (swarm)

The user runs several opencode windows on purpose — every large problem is a
"stream", every task gets its own window/worktree/conversation:

```
Window 0: commander  — main tree. Spawns sessions, monitors, integrates, promotes.
Window N: dev-lead   — one per task, inside `<repo>/.worktrees/<task>`.
```

Agent-facing commands (`./.opencode/wt.sh`, the user never runs these):

- `base [name]` — show/set integration base branch (currently `fix/change-password-nav-and-rate-tests`)
- `stream <name>` — create a stream branch for one big problem
- `open <task> [--stream <s>]` — create worktree+branch `wt/<task>` and open a
  new Terminal window with a fresh opencode conversation there
- `status` — per-task dashboard (ahead, mergeable, dirty)
- `sync <task>` — pull newest stream/base into a task worktree
- `integrate [task...]` — merge open tasks into stream/base: no-ff + conflict
  auto-resolve (headless agent, ≤3 attempts) + deterministic gate
- `promote <stream> [--pr]` — merge a stream into base, optionally open a PR
- `cleanup <task|stream>` — remove worktree + branch (refuses dirty)

Non-negotiables:

- Sessions (dev-lead) only commit; integration/merging happens via `wt.sh`
  from the commander window. Never push/pull/force.
- Test gate inside `wt.sh`: typecheck + `npx vitest run tests/unit tests/components`.
  Full `npm test` includes integration tests that hit the real Neon DB
  (`seed-business` shared state) and are state-dependent/flaky standalone —
  never use them as a pass/fail gate; DB cleanliness is handled separately.
- `.worktrees/` is gitignored AND excluded from vitest (`vitest.config.ts`) —
  do not add worktree test files to suites.
- Symlinks (node_modules, .env) inside worktrees must never be modified.
- Migrations are only ever created in the MAIN tree, never inside a worktree.
- When tests fail, fix or report precisely — never fake success.

Rules every agent obeys:
- never push/pull/force — except the commander pushing a stream branch once per
  user-requested `promote <stream> --pr`; never commit the user's unrelated
  uncommitted changes
- never edit code in a worktree you weren't assigned (commander may edit main
  tree only to resolve integrate conflicts)
- when tests fail, fix or report precisely — never fake success

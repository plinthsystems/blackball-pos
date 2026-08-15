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

## Multi-agent workflow (swarm)

When a task is handed off to multiple agents, or the user asks to run several
issues at once, the orchestrator agent drives git worktrees:

1. `./.opencode/wt.sh create <task-name>` — branch `wt/<task-name>` + worktree in
   `.worktrees/` (node_modules/.env are symlinked; never touch those symlinks).
2. Workers implement and commit inside their worktree, running typecheck + tests there.
3. `./.opencode/wt.sh merge <task-name>` — sequential no-ff merges into the current
   branch; conflicts surface in the main tree (exit 4) and are resolved by the
   orchestrator, never by a worker.
4. `./.opencode/wt.sh cleanup <name>` — remove worktree + branch.
5. Full verification (`npm run typecheck` + `npm test`) happens on the merged MAIN tree.

Rules every agent obeys:
- never push/pull/force; never commit the user's unrelated uncommitted changes
- never edit code in a worktree you weren't assigned
- when tests fail, fix or report precisely — never fake success

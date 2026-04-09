---
phase: "01"
plan: "03"
subsystem: infrastructure
tags:
  - ci
  - github-actions
  - sentry
  - observability
  - turborepo
dependency_graph:
  requires:
    - "01-01"
  provides:
    - ci-pipeline
    - sentry-scaffolds
  affects:
    - all-plans
tech_stack:
  added:
    - GitHub Actions (CI pipeline)
    - "@sentry/node (API Fastify)"
    - "@sentry/nextjs (customer-web, admin-web)"
    - "@sentry/react (company-web Vite)"
  patterns:
    - Turborepo task orchestration in CI (pnpm turbo lint/typecheck/test)
    - Conditional Sentry init (graceful no-op when DSN absent)
    - pnpm/action-setup@v4 with frozen-lockfile install
key_files:
  created:
    - .github/workflows/ci.yml
    - apps/api/src/lib/sentry.ts
    - apps/customer-web/sentry.client.config.ts
    - apps/customer-web/sentry.server.config.ts
    - apps/customer-web/sentry.edge.config.ts
    - apps/admin-web/sentry.client.config.ts
    - apps/admin-web/sentry.server.config.ts
    - apps/admin-web/sentry.edge.config.ts
    - apps/company-web/src/lib/sentry.ts
  modified: []
decisions:
  - "Sentry DSN conditional init: warn + return (never crash) if DSN missing — allows CI to pass without Sentry account configured"
  - "tracesSampleRate: 0.1 in production, 1.0 in development across all surfaces — low sampling reduces Sentry costs at scale"
  - "company-web uses @sentry/react (not @sentry/nextjs) — Vite SPA, no Next.js runtime"
  - "TURBO_TOKEN/TURBO_TEAM are optional secrets — CI works without them (local cache only), remote cache enabled when Vercel account is configured"
  - "Mobile apps (customer-mobile, washer-mobile) deferred to Phase 3 — no Expo Sentry SDK scaffolded here"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-31"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 0
---

# Phase 01 Plan 03: CI Pipeline and Sentry Scaffolds Summary

**One-liner:** GitHub Actions CI with pnpm + Turborepo lint/typecheck/test pipeline, plus conditional Sentry init scaffolds for API (Node.js), customer-web, admin-web (Next.js), and company-web (Vite React).

## What Was Built

### Task 1: GitHub Actions CI Pipeline (INFRA-08)

`.github/workflows/ci.yml` created. The pipeline:
- Triggers on `pull_request` and `push` to `main`
- Uses `pnpm/action-setup@v4` with pnpm 9 and `actions/setup-node@v4` with Node 20
- Installs with `--frozen-lockfile` to catch lockfile drift
- Caches `.turbo` directory via `actions/cache@v4` for incremental CI
- Runs `pnpm turbo lint`, `pnpm turbo typecheck`, and `pnpm turbo test --continue`
- Uses concurrency group with `cancel-in-progress: true` — saves CI minutes when multiple commits are pushed quickly
- Optional `TURBO_TOKEN` / `TURBO_TEAM` secrets for Vercel Remote Cache (CI works without them)

### Task 2: Sentry Scaffolds (INFRA-09)

8 files created across 4 app surfaces:

| File | Surface | SDK |
|------|---------|-----|
| `apps/api/src/lib/sentry.ts` | Fastify API | `@sentry/node` |
| `apps/customer-web/sentry.client.config.ts` | Next.js client | `@sentry/nextjs` |
| `apps/customer-web/sentry.server.config.ts` | Next.js server | `@sentry/nextjs` |
| `apps/customer-web/sentry.edge.config.ts` | Next.js edge | `@sentry/nextjs` |
| `apps/admin-web/sentry.client.config.ts` | Next.js client | `@sentry/nextjs` |
| `apps/admin-web/sentry.server.config.ts` | Next.js server | `@sentry/nextjs` |
| `apps/admin-web/sentry.edge.config.ts` | Next.js edge | `@sentry/nextjs` |
| `apps/company-web/src/lib/sentry.ts` | Vite React SPA | `@sentry/react` |

All files follow the same pattern: check for DSN env var first, warn and return if absent, initialize Sentry only when DSN is present. Production uses 10% trace sampling; development uses 100%.

## Decisions Made

1. Conditional Sentry init (warn + return, never crash) ensures the monorepo can run without Sentry configured during early development.
2. `tracesSampleRate: 0.1` in production keeps Sentry performance costs manageable at Gulf-region scale.
3. Mobile Sentry (Expo SDK) deferred to Phase 3 when `customer-mobile` and `washer-mobile` are built out.
4. `TURBO_TOKEN`/`TURBO_TEAM` are optional — CI is fully functional without remote cache, which can be configured once a Vercel account is established.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — these are scaffold files by design. The Sentry SDK packages (`@sentry/node`, `@sentry/nextjs`, `@sentry/react`) are not yet installed in the workspace `package.json` files. They will be installed when Sentry DSNs are configured (after Sentry account creation). The scaffolds are ready to activate by:
1. Creating a Sentry project for each surface
2. Adding DSN environment variables to Railway (API) and Vercel (web apps)
3. Running `pnpm add @sentry/node` in `apps/api` and `pnpm add @sentry/nextjs` in `apps/customer-web` and `apps/admin-web`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 — CI Pipeline | `106dbb6` | `feat(01-03): add GitHub Actions CI pipeline` |
| Task 2 — Sentry Scaffolds | `dbc253f` | `feat(01-03): scaffold Sentry initialization for all app surfaces` |

## Self-Check: PASSED

All 9 files verified on disk. Both commits (`106dbb6`, `dbc253f`) confirmed in git log.

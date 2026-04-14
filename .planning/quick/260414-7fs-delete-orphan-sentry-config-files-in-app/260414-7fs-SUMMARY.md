---
phase: 260414-7fs
plan: 01
subsystem: admin-web / build
tags: [quick-task, cleanup, dead-code, vercel, build-fix]
type: summary
autonomous: true
requirements: [QUICK-260414-7fs]
dependency_graph:
  requires: []
  provides:
    - "apps/admin-web is free of @sentry/nextjs dead-code imports"
  affects:
    - "apps/admin-web/next.config.ts (untouched - no wiring ever existed)"
    - "Vercel build pipeline for @cleanly/admin-web"
tech_stack:
  added: []
  patterns:
    - "Delete orphan integration configs rather than install unused dep"
key_files:
  created: []
  modified: []
  deleted:
    - apps/admin-web/sentry.client.config.ts
    - apps/admin-web/sentry.server.config.ts
    - apps/admin-web/sentry.edge.config.ts
decisions:
  - "Delete the three sentry.*.config.ts files instead of installing @sentry/nextjs - Sentry is not in use on admin-web and nothing wires withSentryConfig"
metrics:
  duration: "~3min"
  tasks_completed: 2
  files_touched: 3
  completed: "2026-04-14"
commit: e29b767
---

# Quick Task 260414-7fs: Delete Orphan Sentry Config Files in apps/admin-web Summary

Deleted three orphan `sentry.*.config.ts` files from `apps/admin-web` that imported `@sentry/nextjs` - a package not present in `package.json` and not wired into `next.config.ts` - unblocking the Vercel build's `Cannot find module '@sentry/nextjs'` type error.

## Files Deleted

Exact paths (all three staged via `git rm`, committed together):

- `apps/admin-web/sentry.client.config.ts`
- `apps/admin-web/sentry.server.config.ts`
- `apps/admin-web/sentry.edge.config.ts`

Combined diff: `3 files changed, 21 deletions(-)`.

## Build Status: Before vs After

### Before

Vercel's `next build` for `@cleanly/admin-web` failed during type-checking with:

```
Cannot find module '@sentry/nextjs' or its corresponding type declarations.
  at apps/admin-web/sentry.client.config.ts:1
  (and same at sentry.server.config.ts / sentry.edge.config.ts)
```

### After

`pnpm --filter @cleanly/admin-web build` now:

- Compiles successfully (`Compiled successfully`)
- Passes linting and type validation (no more `@sentry/nextjs` error, no references to any `sentry.*.config.ts` file anywhere in output)
- Fails later, at an unrelated stage (see Deferred Issues below)

Grep confirms no remaining references in admin-web source:

```
grep -R "@sentry/nextjs" apps/admin-web --exclude-dir=node_modules --exclude-dir=.next
# (only match is apps/admin-web/tsconfig.tsbuildinfo - stale build cache, will
#  regenerate on next build; no source/config references)
```

## Commit

- **SHA:** `e29b767`
- **Message:** `fix(admin-web): delete orphan Sentry config files [260414-7fs]`
- Body documents orphan-status evidence, the deliberate decision not to install `@sentry/nextjs`, and the separate unrelated post-deletion failure.

## Verification Results

| Check | Result |
|-------|--------|
| `apps/admin-web/sentry.client.config.ts` absent | PASS |
| `apps/admin-web/sentry.server.config.ts` absent | PASS |
| `apps/admin-web/sentry.edge.config.ts` absent | PASS |
| No `@sentry/nextjs` source references in `apps/admin-web` | PASS (only stale tsbuildinfo cache) |
| `apps/admin-web/next.config.ts` unchanged | PASS |
| `apps/admin-web/package.json` unchanged (no @sentry/nextjs added) | PASS |
| Build no longer errors on `@sentry/nextjs` | PASS |
| Build log contains no `sentry.*.config.ts` references | PASS |

All success criteria from PLAN.md met.

## Deviations from Plan

None - plan executed exactly as written. No auto-fix rules triggered. No checkpoints. No architectural decisions needed.

## Deferred Issues

The post-deletion build uncovered a pre-existing, unrelated failure - **out of scope** for this quick task per constraints, but logged here so it can be triaged as a separate follow-up:

**NextAuth route page-data collection crash**

- **Where:** `apps/admin-web/.next/server/app/api/auth/[...nextauth]/route.js`
- **Error:** `TypeError: Cannot read properties of undefined (reading 'GET')`
- **Stage:** "Collecting page data" (after compile + type-check succeed)
- **Likely cause:** The route handler file at `apps/admin-web/src/app/api/auth/[...nextauth]/route.ts` is not exporting a valid `GET` (and/or `POST`) handler function - most commonly because of a default export / named export mismatch with NextAuth.js v5 (Auth.js) vs legacy v4 patterns, or a build-time env var causing the NextAuth config to evaluate to `undefined` handlers.
- **Impact:** Vercel build for `admin-web` still fails, but for a reason unrelated to Sentry.
- **Recommendation:** File as a new quick task (e.g., `/gsd:quick fix admin-web NextAuth route handler export for production build`). Do NOT block this Sentry cleanup on it - the scoped fix here is complete.

## Self-Check: PASSED

Verified:

- File `apps/admin-web/sentry.client.config.ts` correctly ABSENT on disk
- File `apps/admin-web/sentry.server.config.ts` correctly ABSENT on disk
- File `apps/admin-web/sentry.edge.config.ts` correctly ABSENT on disk
- Commit `e29b767` FOUND in `git log`
- `git diff HEAD~1 HEAD --name-only` lists exactly the three deleted files and nothing else
- `apps/admin-web/next.config.ts` confirmed unchanged (not in commit diff)
- No `package.json` modifications (no `@sentry/nextjs` added anywhere)

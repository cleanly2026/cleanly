---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [turborepo, pnpm, monorepo, typescript, expo, nextjs, vite, prisma]

# Dependency graph
requires: []
provides:
  - Turborepo monorepo root with pnpm@9.15.0 workspace config
  - 6 app workspace stubs (api, customer-web, company-web, admin-web, customer-mobile, washer-mobile)
  - 6 shared package stubs (db, types, i18n, ui, ui-native, config)
  - Expo-compatible .npmrc with node-linker=hoisted
  - Shared tsconfig.base.json with strict ES2022 settings
  - Turborepo pipeline (build/dev/lint/typecheck/test)
  - Prisma schema.prisma stub for packages/db
affects: [01-02, 01-03, 01-04, 01-05, 01-06, all-subsequent-plans]

# Tech tracking
tech-stack:
  added:
    - turbo@2.9.1
    - pnpm@9.15.0
    - typescript@^5.7.0
    - prettier@^3.4.0
    - next@15.2.4 (customer-web, admin-web)
    - vite@^6.0.0 (company-web)
    - expo@~55.0.0 (customer-mobile, washer-mobile)
    - react-native@0.79.0 (mobile apps)
    - prisma@^6.5.0 + @prisma/client@^6.5.0
    - @prisma/adapter-neon@^7.6.0
    - @neondatabase/serverless@^1.0.2
    - zod@^3.24.0 (packages/types)
  patterns:
    - Turborepo pipeline: build depends on ^build (upstream-first ordering)
    - pnpm hoisted linker for Expo SDK 55 native module compatibility
    - Shared tsconfig.base.json extended by all workspaces
    - Barrel exports (src/index.ts) on shared packages for workspace referencing

key-files:
  created:
    - package.json (root workspace root with pnpm packageManager)
    - pnpm-workspace.yaml (apps/* and packages/* globs)
    - .npmrc (node-linker=hoisted + shamefully-hoist=true)
    - turbo.json (build/dev/lint/typecheck/test pipeline)
    - tsconfig.base.json (strict ES2022 base config)
    - .gitignore
    - apps/api/package.json
    - apps/customer-web/package.json
    - apps/company-web/package.json
    - apps/admin-web/package.json
    - apps/customer-mobile/package.json
    - apps/washer-mobile/package.json
    - packages/db/package.json
    - packages/db/schema.prisma (stub)
    - packages/types/package.json + src/index.ts
    - packages/i18n/package.json + src/index.ts
    - packages/ui/package.json + src/index.ts
    - packages/ui-native/package.json + src/index.ts
    - packages/config/package.json
  modified: []

key-decisions:
  - "node-linker=hoisted in .npmrc is required for Expo SDK 55 + pnpm native module resolution — without this, Metro bundler cannot resolve native dependencies"
  - "shamefully-hoist=true added alongside node-linker=hoisted for full compatibility"
  - "apps/company-web uses Vite (not Next.js) — authenticated SPA with no SEO requirement, Vite HMR 10x faster than Next.js for ops dashboard"
  - "tsconfig.base.json uses moduleResolution=bundler for compatibility with Next.js Turbopack and Vite"

patterns-established:
  - "Pattern 1: All @cleanly/* packages use src/index.ts barrel export as entry point"
  - "Pattern 2: Turborepo tasks always use dependsOn: [^build] to ensure upstream packages build first"
  - "Pattern 3: .npmrc hoisting config must never be removed — required for all Expo SDK versions in this monorepo"

requirements-completed: [INFRA-01]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 1 Plan 01: Monorepo Bootstrap Summary

**Turborepo monorepo scaffolded with 6 app workspaces and 6 shared packages, pnpm hoisted linker for Expo SDK 55 compatibility, and strict TypeScript pipeline config**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-31T16:05:21Z
- **Completed:** 2026-03-31T16:09:50Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments

- Created monorepo root config (package.json, pnpm-workspace.yaml, .npmrc, turbo.json, tsconfig.base.json, .gitignore)
- Scaffolded all 6 app workspace directories with correctly-named @cleanly/* package.json files
- Scaffolded all 6 shared package directories with package stubs, barrel exports, and Prisma schema stub
- Expo pnpm compatibility established via node-linker=hoisted in .npmrc

## Task Commits

Each task was committed atomically:

1. **Task 1: Create monorepo root config files** - `a25b4d6` (chore)
2. **Task 2: Scaffold 6 app workspaces and shared package stubs** - `49806c2` (chore)

## Files Created/Modified

- `package.json` - Root workspace root with pnpm@9.15.0 packageManager, turbo scripts
- `pnpm-workspace.yaml` - Workspace globs: apps/* and packages/*
- `.npmrc` - node-linker=hoisted + shamefully-hoist=true for Expo SDK 55 pnpm compat
- `turbo.json` - Build pipeline with dependsOn: [^build] for all tasks
- `tsconfig.base.json` - Strict ES2022 base TypeScript config
- `.gitignore` - node_modules, .turbo, dist, .next, .expo, .env files
- `apps/api/package.json` - @cleanly/api with tsx dev server and vitest
- `apps/customer-web/package.json` - @cleanly/customer-web with Next.js 15.2.4 on port 3001
- `apps/company-web/package.json` - @cleanly/company-web with Vite 6 on port 3002
- `apps/admin-web/package.json` - @cleanly/admin-web with Next.js 15.2.4 on port 3003
- `apps/customer-mobile/package.json` - @cleanly/customer-mobile with Expo SDK ~55.0.0
- `apps/washer-mobile/package.json` - @cleanly/washer-mobile with Expo SDK ~55.0.0
- `packages/db/package.json` - @cleanly/db with Prisma 6.5 + neon adapter
- `packages/db/schema.prisma` - Stub with PostgreSQL datasource (full schema in Plan 04)
- `packages/types/package.json` + `src/index.ts` - @cleanly/types with zod dependency
- `packages/i18n/package.json` + `src/index.ts` - @cleanly/i18n barrel stub
- `packages/ui/package.json` + `src/index.ts` - @cleanly/ui with React 19 peer dep
- `packages/ui-native/package.json` + `src/index.ts` - @cleanly/ui-native barrel stub
- `packages/config/package.json` - @cleanly/config with eslint + tailwindcss devDeps

## Decisions Made

- node-linker=hoisted is required for Expo SDK 55 + pnpm — without it, Metro bundler cannot resolve native dependencies at the hoisted level. This is a documented Expo+pnpm compatibility requirement.
- apps/company-web uses Vite (not Next.js) per STACK.md recommendation — authenticated SPA with no SEO requirement benefits from Vite's 10x faster HMR.
- moduleResolution=bundler in tsconfig.base.json enables compatibility with both Next.js Turbopack and Vite bundlers.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. This plan is pure file scaffolding.

## Next Phase Readiness

- Monorepo structure is complete — all subsequent plans can reference @cleanly/* workspace packages
- pnpm install can now be run from root to resolve all 12 workspace packages
- Plan 01-02 (Fastify API server skeleton) can proceed immediately
- Plan 01-03 (Next.js customer web shell) can proceed immediately
- All workspace package.json files use correct @cleanly/* names

---
*Phase: 01-foundation*
*Completed: 2026-03-31*

## Self-Check: PASSED

- All 19 key files verified present on disk
- Both task commits (a25b4d6, 49806c2) confirmed in git log
- pnpm-workspace.yaml contains apps/* and packages/* globs
- .npmrc contains node-linker=hoisted and shamefully-hoist=true
- turbo.json build task has dependsOn: ["^build"]

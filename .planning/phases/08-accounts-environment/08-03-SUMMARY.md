---
phase: 08-accounts-environment
plan: 03
subsystem: infra
tags: [env, 1password, turbo, op-inject, developer-setup]

# Dependency graph
requires:
  - phase: 08-02
    provides: "WHATSAPP_ENABLED and BYPASS_SENTRY feature flags in env.ts"
provides:
  - "Complete .env.example documentation for all 7 apps/packages"
  - "7 .env.op.tpl files for 1Password CLI bootstrap"
  - "turbo.json EXPO_PUBLIC_* cache poisoning fix"
  - "pnpm setup:env single-command env bootstrap"
  - "SETUP.md fresh-clone developer documentation"
affects: [09-infrastructure-deployment, 11-mobile-distribution]

# Tech tracking
tech-stack:
  added: [1password-cli]
  patterns: [op-inject-env-bootstrap, env-op-tpl-convention]

key-files:
  created:
    - apps/api/.env.op.tpl
    - apps/customer-web/.env.op.tpl
    - apps/admin-web/.env.op.tpl
    - apps/company-web/.env.op.tpl
    - apps/customer-mobile/.env.op.tpl
    - apps/washer-mobile/.env.op.tpl
    - packages/db/.env.op.tpl
    - SETUP.md
  modified:
    - apps/api/.env.example
    - turbo.json
    - package.json
    - .gitignore

key-decisions:
  - "Added !.env.op.tpl to .gitignore — .env.* glob was blocking template commits"

patterns-established:
  - "op://Cleanly/<Item>/<field> naming convention for 1Password vault references"
  - ".env.op.tpl files alongside .env.example for automated env bootstrap"
  - "pnpm setup:env as the single entry point for developer env setup"

requirements-completed: [ENV-01, ENV-05]

# Metrics
duration: 5min
completed: 2026-04-12
---

# Phase 08 Plan 03: Env Scaffolding Summary

**Complete env documentation, 1Password CLI bootstrap templates, turbo.json EXPO_PUBLIC cache fix, and SETUP.md developer onboarding docs**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T06:33:20Z
- **Completed:** 2026-04-12T06:38:48Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Updated apps/api/.env.example with WHATSAPP_ENABLED and BYPASS_SENTRY feature flags section
- Fixed turbo.json cache poisoning by adding 5 EXPO_PUBLIC_* vars to tasks.build.env
- Created 7 .env.op.tpl files with op://Cleanly/ 1Password references for all apps and packages/db
- Added pnpm setup:env script that runs op inject for all 7 apps in one command
- Created SETUP.md with fresh-clone workflow (1Password CLI path + manual fallback)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update .env.example files and fix turbo.json EXPO_PUBLIC gaps** - `a32c1e7` (chore)
2. **Task 2: Create .env.op.tpl files for 1Password CLI bootstrap** - `4c91cbb` (chore)
3. **Task 3: Add setup:env script and SETUP.md** - `5a4aa69` (chore)

## Files Created/Modified
- `apps/api/.env.example` - Added Feature Flags section (WHATSAPP_ENABLED, BYPASS_SENTRY)
- `turbo.json` - Added 5 EXPO_PUBLIC_* vars to tasks.build.env
- `apps/api/.env.op.tpl` - Full API env template with all 1Password references
- `apps/customer-web/.env.op.tpl` - Customer web env template (output: .env.local)
- `apps/admin-web/.env.op.tpl` - Admin web env template with NextAuth + Google OAuth refs
- `apps/company-web/.env.op.tpl` - Company web env template (Vite vars)
- `apps/customer-mobile/.env.op.tpl` - Customer mobile env template (Expo vars)
- `apps/washer-mobile/.env.op.tpl` - Washer mobile env template (Google Maps key)
- `packages/db/.env.op.tpl` - Database env template (Neon URLs)
- `package.json` - Added setup:env script
- `SETUP.md` - Fresh-clone developer setup documentation
- `.gitignore` - Added !.env.op.tpl exception

## Decisions Made
- Added `!.env.op.tpl` to .gitignore because the existing `.env.*` glob was blocking .env.op.tpl files from being committed. The templates contain no secrets (only `op://` references) and must be version-controlled.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added .gitignore exception for .env.op.tpl**
- **Found during:** Task 2 (Create .env.op.tpl files)
- **Issue:** `.env.*` pattern in .gitignore blocked all .env.op.tpl files from being committed
- **Fix:** Added `!.env.op.tpl` exception line after `!.env.example`
- **Files modified:** .gitignore
- **Verification:** git add succeeded after the fix
- **Committed in:** 4c91cbb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix — without it, .env.op.tpl files could not be committed. No scope creep.

## Issues Encountered
None beyond the .gitignore blocking issue documented above.

## User Setup Required
None - no external service configuration required. The .env.op.tpl files reference 1Password vault items that will be created when the actual provider accounts are set up.

## Known Stubs
None - all files contain functional content. The op:// references will resolve once 1Password vault items are created during provider account setup.

## Next Phase Readiness
- All env documentation complete — .env.example files cover every var used in source code
- 1Password bootstrap ready — pnpm setup:env will work once vault items are created
- turbo.json cache-safe — EXPO_PUBLIC_* vars declared, preventing stale builds
- SETUP.md provides clear onboarding path for fresh clones
- Ready for Phase 09 (infrastructure deployment) which will use these env vars in Fly.io/Vercel configurations

---
*Phase: 08-accounts-environment*
*Completed: 2026-04-12*

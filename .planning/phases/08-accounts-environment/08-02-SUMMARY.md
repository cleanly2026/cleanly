---
phase: 08-accounts-environment
plan: 02
subsystem: api
tags: [zod, env-validation, feature-flags, whatsapp, sentry]

# Dependency graph
requires:
  - phase: 08-accounts-environment/01
    provides: Initial env.ts with Zod validation schema
provides:
  - WHATSAPP_ENABLED boolean feature flag in env singleton
  - BYPASS_SENTRY boolean feature flag in env singleton
  - All 16 API source files use env singleton (zero process.env reads outside env.ts)
affects: [09-infrastructure-deployment, 08-accounts-environment/03, 08-accounts-environment/04]

# Tech tracking
tech-stack:
  added: []
  patterns: [env singleton pattern enforced across entire API, feature flag gating via Zod transforms]

key-files:
  created: []
  modified:
    - apps/api/src/lib/env.ts
    - apps/api/src/lib/prisma.ts
    - apps/api/src/lib/r2.ts
    - apps/api/src/lib/redis.ts
    - apps/api/src/lib/sentry.ts
    - apps/api/src/lib/socket.ts
    - apps/api/src/plugins/auth.ts
    - apps/api/src/plugins/cors.ts
    - apps/api/src/routes/auth/admin.ts
    - apps/api/src/routes/company/stripe-connect.ts
    - apps/api/src/routes/payments/webhook.ts
    - apps/api/src/services/email.service.ts
    - apps/api/src/services/otp.service.ts
    - apps/api/src/services/sms.service.ts
    - apps/api/src/services/push.service.ts
    - apps/api/src/services/stripe.service.ts
    - apps/api/src/services/whatsapp.service.ts

key-decisions:
  - "Chained fullSchema superRefine for WHATSAPP_ENABLED gate (applies all envs, not just prod/staging)"
  - "Removed redundant null checks in r2.ts since Zod schema guarantees R2 credentials are present"
  - "Kept ! assertion on STRIPE_WEBHOOK_SECRET in webhook.ts (optional in schema, required at runtime in prod)"

patterns-established:
  - "Feature flag pattern: string default 'false' with .transform(v => v === 'true') for boolean env vars"
  - "Env singleton enforcement: all API source files import { env } from lib/env.js, never read process.env directly"

requirements-completed: [ENV-02, ENV-04]

# Metrics
duration: 4min
completed: 2026-04-12
---

# Phase 08 Plan 02: Env Feature Flags + Singleton Migration Summary

**Extended env.ts with WHATSAPP_ENABLED and BYPASS_SENTRY feature flags, migrated all 16 API files from process.env to env singleton**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T06:02:06Z
- **Completed:** 2026-04-12T06:06:28Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Added WHATSAPP_ENABLED boolean env var with DIALOG360_API_KEY dependency gate (all environments)
- Added BYPASS_SENTRY boolean env var that skips SENTRY_DSN requirement in staging (ignored in production)
- Migrated all 16 API source files from direct process.env reads to env singleton imports
- Zero process.env reads remain in source files outside env.ts (only test files use process.env for setup)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend env.ts with WHATSAPP_ENABLED and BYPASS_SENTRY** - `2bf16d9` (feat)
2. **Task 2: Migrate 16 API files from process.env to env singleton** - `4c44979` (refactor)

## Files Created/Modified
- `apps/api/src/lib/env.ts` - Extended with WHATSAPP_ENABLED + BYPASS_SENTRY feature flags, fullSchema chain
- `apps/api/src/lib/prisma.ts` - Migrated DATABASE_URL to env singleton
- `apps/api/src/lib/r2.ts` - Migrated 5 R2 env vars, removed redundant null checks
- `apps/api/src/lib/redis.ts` - Migrated UPSTASH_REDIS_URL to env singleton
- `apps/api/src/lib/sentry.ts` - Added BYPASS_SENTRY gate, migrated to env singleton
- `apps/api/src/lib/socket.ts` - Migrated 4 URL + Redis env vars to env singleton
- `apps/api/src/plugins/auth.ts` - Migrated JWT_SECRET to env singleton
- `apps/api/src/plugins/cors.ts` - Migrated 3 web URL env vars to env singleton
- `apps/api/src/routes/auth/admin.ts` - Migrated ADMIN_EXCHANGE_SECRET to env singleton
- `apps/api/src/routes/company/stripe-connect.ts` - Migrated COMPANY_WEB_URL to env singleton
- `apps/api/src/routes/payments/webhook.ts` - Migrated STRIPE_WEBHOOK_SECRET to env singleton
- `apps/api/src/services/email.service.ts` - Migrated RESEND_API_KEY to env singleton
- `apps/api/src/services/otp.service.ts` - Migrated 3 Twilio env vars to env singleton
- `apps/api/src/services/sms.service.ts` - Migrated 3 Twilio env vars to env singleton
- `apps/api/src/services/push.service.ts` - Migrated EXPO_ACCESS_TOKEN to env singleton
- `apps/api/src/services/stripe.service.ts` - Migrated STRIPE_SECRET_KEY, removed redundant null check
- `apps/api/src/services/whatsapp.service.ts` - Added WHATSAPP_ENABLED gate, migrated to env singleton

## Decisions Made
- Chained a second `.superRefine()` (fullSchema) for WHATSAPP_ENABLED because it applies in all environments, not just prod/staging
- Removed the explicit null check in stripe.service.ts `getStripe()` since Zod schema guarantees STRIPE_SECRET_KEY is present
- Removed the manual R2 credential null checks in r2.ts since Zod schema validates all three R2 credentials at startup
- Kept `!` on `env.STRIPE_WEBHOOK_SECRET!` in webhook.ts because it's optional in schema but required at webhook execution time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- env singleton is now the single source of truth for all env vars across the API
- WHATSAPP_ENABLED and BYPASS_SENTRY are ready for use in deployment configuration
- Phase 09 (infrastructure deployment) can rely on env.ts for all environment variable management

## Self-Check: PASSED

- All 17 files FOUND
- Commits 2bf16d9 and 4c44979 FOUND in git log
- Zero process.env reads in source files outside env.ts (excluding test files)

---
*Phase: 08-accounts-environment*
*Completed: 2026-04-12*

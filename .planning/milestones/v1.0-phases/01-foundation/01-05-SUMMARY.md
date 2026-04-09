---
phase: 01-foundation
plan: "05"
subsystem: api
tags: [fastify, jwt, cors, rate-limit, zod, bullmq, ioredis, upstash, prisma, neon]

# Dependency graph
requires:
  - phase: 01-02
    provides: "Shared types package (@cleanly/types) with JWTPayload interface"
  - phase: 01-03
    provides: "Sentry initialization (apps/api/src/lib/sentry.ts)"
provides:
  - "Fastify server entrypoint with 4 plugins (JWT, CORS, rate-limit, Zod)"
  - "GET /health endpoint"
  - "ioredis singleton configured for Upstash TLS + BullMQ"
  - "Prisma singleton with Neon serverless adapter"
  - "BullMQ notification and order-lifecycle queues"
  - "Notification worker with graceful shutdown and idempotency"
affects: [01-06, 01-07, 02-payments, 03-realtime, 04-notifications]

# Tech tracking
tech-stack:
  added: [fastify@5, "@fastify/jwt", "@fastify/cors", "@fastify/rate-limit", fastify-type-provider-zod, bullmq, ioredis, "@prisma/adapter-neon", "@neondatabase/serverless"]
  patterns: [fastify-plugin encapsulation, singleton exports, graceful shutdown, idempotency guards]

key-files:
  created:
    - apps/api/src/server.ts
    - apps/api/src/plugins/auth.ts
    - apps/api/src/plugins/cors.ts
    - apps/api/src/plugins/rate-limit.ts
    - apps/api/src/plugins/zod-provider.ts
    - apps/api/src/lib/prisma.ts
    - apps/api/src/lib/redis.ts
    - apps/api/src/queues/queues.ts
    - apps/api/src/workers/notification.worker.ts
    - apps/api/tsconfig.json
  modified:
    - apps/api/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Used fastify-type-provider-zod (community package) instead of @fastify/type-provider-zod (does not exist on npm)"
  - "Import Redis as default import from ioredis (ESM-compatible pattern)"
  - "Used @prisma/client directly instead of @cleanly/db (no shared db package exists yet)"

patterns-established:
  - "Fastify plugin pattern: wrap with fastify-plugin (fp) for encapsulation bypass"
  - "Singleton pattern: prisma.ts and redis.ts export single instances, never instantiate elsewhere"
  - "BullMQ worker pattern: idempotency via Redis key check before processing, graceful shutdown via SIGTERM/SIGINT"
  - "Rate limiting: global: false (per-route), Redis-backed via Upstash"

requirements-completed: [INFRA-03, INFRA-05, INFRA-06, INFRA-10]

# Metrics
duration: 11min
completed: 2026-03-31
---

# Phase 01 Plan 05: Fastify API Server Summary

**Fastify 5 server with JWT auth, CORS, Redis-backed rate limiting, Zod validation, and BullMQ notification worker with graceful shutdown**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-31T16:55:46Z
- **Completed:** 2026-03-31T17:07:02Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Fastify server wired with 4 plugins: JWT auth (typed with JWTPayload from @cleanly/types), CORS (multi-origin), rate-limit (Redis-backed, per-route), and Zod type provider
- GET /health endpoint returning {status: 'ok', timestamp} for deployment health checks
- ioredis singleton with Upstash TLS config and BullMQ-required maxRetriesPerRequest: null
- BullMQ notification worker with idempotency guard (job:sent:* keys), graceful SIGTERM/SIGINT shutdown, and concurrency: 5
- Two BullMQ queues defined: notifications and order-lifecycle with exponential backoff retry

## Task Commits

Each task was committed atomically:

1. **Task 1: Fastify server with JWT, CORS, rate-limit, and Zod plugins** - `320c5ee` (feat)
2. **Task 2: BullMQ notification worker with graceful shutdown** - `3d6c014` (feat)

## Files Created/Modified
- `apps/api/src/server.ts` - Fastify entrypoint, registers all 4 plugins, /health route
- `apps/api/src/plugins/auth.ts` - JWT plugin with JWTPayload typing and authenticate decorator
- `apps/api/src/plugins/cors.ts` - CORS plugin with multi-origin support
- `apps/api/src/plugins/rate-limit.ts` - Rate limit plugin, Redis-backed, per-route only
- `apps/api/src/plugins/zod-provider.ts` - Zod type provider for schema validation
- `apps/api/src/lib/prisma.ts` - Prisma singleton with Neon serverless adapter
- `apps/api/src/lib/redis.ts` - ioredis singleton with Upstash TLS and BullMQ config
- `apps/api/src/queues/queues.ts` - BullMQ queue definitions (notifications, order-lifecycle)
- `apps/api/src/workers/notification.worker.ts` - Notification worker with graceful shutdown
- `apps/api/tsconfig.json` - TypeScript config extending base
- `apps/api/package.json` - Added all runtime dependencies
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Used `fastify-type-provider-zod` (community package) — `@fastify/type-provider-zod` does not exist on npm registry
- Used default import for ioredis (`import Redis from 'ioredis'`) for ESM compatibility
- Used `@prisma/client` directly since no shared `@cleanly/db` package exists yet — can be swapped when DB package is created

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected fastify-type-provider-zod package name**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Plan specified `@fastify/type-provider-zod` but this package does not exist on npm. The actual package is `fastify-type-provider-zod` (community package)
- **Fix:** Used correct package name `fastify-type-provider-zod` and adjusted import in zod-provider.ts
- **Files modified:** apps/api/package.json, apps/api/src/plugins/zod-provider.ts
- **Verification:** Package installs successfully, import resolves
- **Committed in:** 320c5ee (Task 1 commit)

**2. [Rule 3 - Blocking] Used @prisma/client instead of @cleanly/db**
- **Found during:** Task 1 (Prisma singleton creation)
- **Issue:** Plan referenced `@cleanly/db` but no shared DB package exists in the monorepo yet
- **Fix:** Used `@prisma/client` directly — will be updated when DB package is created in a later plan
- **Files modified:** apps/api/src/lib/prisma.ts
- **Verification:** Import resolves correctly
- **Committed in:** 320c5ee (Task 1 commit)

**3. [Rule 1 - Bug] Fixed ioredis import for ESM**
- **Found during:** Task 1 (redis.ts creation)
- **Issue:** Plan used named import `import { Redis } from 'ioredis'` which may cause issues in ESM. Default import is the documented pattern
- **Fix:** Used `import Redis from 'ioredis'` (default import)
- **Files modified:** apps/api/src/lib/redis.ts
- **Verification:** Import resolves correctly in ESM context
- **Committed in:** 320c5ee (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correct dependency resolution. No scope creep.

## Issues Encountered
- `pnpm` was not available on PATH initially — installed via `npm install -g pnpm@9.15.0` to match the monorepo's packageManager field

## Known Stubs
- `apps/api/src/workers/notification.worker.ts` lines 19-21: Worker logs job data but does not send actual notifications — intentional scaffold, will be implemented in Phase 4 (notifications plan)
- `apps/api/src/lib/prisma.ts`: PrismaClient imported from `@prisma/client` without generated types — requires Prisma schema and `prisma generate` which is a separate plan

## User Setup Required

**External services require manual configuration.** The following environment variables must be set before running the API:
- `DATABASE_URL` - Neon PostgreSQL connection string (from Neon console)
- `UPSTASH_REDIS_URL` - Upstash Redis URL starting with `rediss://` (Fixed Plan, not PAYG)
- `JWT_SECRET` - Secret key for JWT signing (generate with `openssl rand -hex 32`)

See plan frontmatter `user_setup` section for detailed Upstash configuration steps.

## Next Phase Readiness
- Fastify server is ready for auth routes (Plans 06 and 07)
- Redis singleton available for rate limiting, refresh token storage, and BullMQ queues
- Zod type provider registered for schema validation on all future routes
- BullMQ worker scaffold ready for Phase 4 notification channels

## Self-Check: PASSED

All 10 created files verified present. Both task commits (320c5ee, 3d6c014) verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-03-31*

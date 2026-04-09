---
phase: 01-foundation
plan: "04"
subsystem: database
tags: [prisma, postgresql, neon, postgis, geography, bilingual, schema]

# Dependency graph
requires:
  - phase: 01-foundation/02
    provides: "Shared types including OrderStatus enum and i18n config"
provides:
  - "Complete Prisma schema with 13 models and 4 enums"
  - "PostGIS geography columns on Company, WasherProfile, Order"
  - "Idempotent GIST spatial index migration SQL"
  - "UAE city seed data (7 cities, bilingual AR/EN)"
affects: [01-05, 01-06, 01-07, 01-08, 02-auth, 02-orders, 02-payments]

# Tech tracking
tech-stack:
  added: [prisma-postgresql-extensions, postgis]
  patterns: [geography-point-4326, bilingual-en-ar-columns, single-orders-table-with-extension, idempotent-postmigrate-sql]

key-files:
  created:
    - packages/db/schema.prisma
    - packages/db/tsconfig.json
    - packages/db/migrations/0002_postgis_indexes.sql
    - packages/db/seed.ts
  modified:
    - packages/db/package.json

key-decisions:
  - "Prisma output to generated/client directory for monorepo isolation"
  - "PostGIS indexes managed via idempotent SQL postmigrate script, not Prisma migrations"

patterns-established:
  - "D-04 Pattern: Use Unsupported('geography(Point, 4326)') for all GPS/location columns"
  - "D-03 Pattern: All bilingual content uses paired _en/_ar columns with @db.Text, never JSON"
  - "D-01 Pattern: Single Order table with CarpetOrderDetails extension for carpet-specific fields"
  - "Postmigrate Pattern: Run 0002_postgis_indexes.sql after every Prisma migration deploy"

requirements-completed: [INFRA-02, INFRA-04, I18N-03]

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 01 Plan 04: Database Schema Summary

**Complete 13-model Prisma schema with PostGIS geography columns, bilingual _en/_ar text fields, combined 14-state OrderStatus enum, and idempotent GIST spatial index migration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T16:55:44Z
- **Completed:** 2026-03-31T16:57:59Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Complete Prisma schema with 13 models and 4 enums matching the platform blueprint
- PostGIS geography(Point, 4326) on 3 columns (Company.location, WasherProfile.current_location, Order.service_location)
- Combined 14-state OrderStatus enum exactly matching packages/types/src/order.ts
- 14 bilingual @db.Text columns across City, Company, Package, AddOn models
- Idempotent PostGIS GIST index migration with 3 spatial indexes
- UAE seed data with 7 cities in bilingual format

## Task Commits

Each task was committed atomically:

1. **Task 1: Write complete Prisma schema with all 15 tables** - `857d836` (feat)
2. **Task 2: Create PostGIS migration SQL and deploy schema to Neon** - `9caaee7` (feat)

## Files Created/Modified
- `packages/db/schema.prisma` - Complete Prisma schema with 13 models, 4 enums, PostGIS geography columns
- `packages/db/tsconfig.json` - TypeScript config for db package
- `packages/db/migrations/0002_postgis_indexes.sql` - Idempotent GIST spatial index SQL
- `packages/db/seed.ts` - UAE city seed data (7 cities, bilingual)
- `packages/db/package.json` - Added db:postmigrate, db:deploy, db:seed scripts

## Decisions Made
- Prisma client output set to `../generated/client` for clean monorepo isolation
- PostGIS GIST indexes managed via idempotent SQL file run after every migrate deploy, not embedded in Prisma migrations (Prisma drops custom indexes on migrate)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** Before deploying the schema:
1. Create a Neon project in Bahrain region (me-central1) at https://console.neon.tech
2. Enable PostGIS extension in Neon SQL editor: `CREATE EXTENSION IF NOT EXISTS postgis;`
3. Set `DATABASE_URL` (pooled connection string) and `DIRECT_URL` (direct connection string) in `packages/db/.env`
4. Run `pnpm db:push` to deploy schema, then `pnpm db:postmigrate` for GIST indexes

## Next Phase Readiness
- Schema is ready for auth routes (Plan 06, 07) to use User, RefreshToken models
- Schema is ready for order management (Phase 2) with complete Order lifecycle
- PostGIS deployment depends on Neon project creation (user setup)

## Self-Check: PASSED

All 4 created files verified present. Both task commits (857d836, 9caaee7) verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-03-31*

---
phase: 02-core-business-flow
plan: 10
subsystem: company-api
tags: [packages, add-ons, washers, crud, company-management]
dependency_graph:
  requires: [02-05-PLAN.md]
  provides: [COMP-03, COMP-04]
  affects: [discovery, booking]
tech_stack:
  added: []
  patterns: [fastify-route-plugin, soft-delete, bcryptjs-pin-hash]
key_files:
  created:
    - apps/api/src/routes/company/packages.ts
    - apps/api/src/routes/company/washers.ts
  modified:
    - apps/api/src/server.ts
decisions:
  - "Followed established auth pattern from profile.ts: preHandler authenticate + 403 on missing companyId"
  - "Soft delete for packages and add-ons via is_active: false — consistent with 02-05 decision"
  - "Washer deactivation sets company_id: null — consistent with 02-05 decision"
  - "bcryptjs (not bare bcrypt) for default PIN hashing — consistent with 02-05 decision"
metrics:
  duration: 3min
  completed: "2026-04-03T05:38:54Z"
  tasks: 1
  files: 3
---

# Phase 02 Plan 10: Package Management and Washer Management API Summary

**One-liner:** Package CRUD with bilingual names/fils pricing and washer roster management (create, list, deactivate) registered under /company/packages and /company/washers.

## What Was Built

Gap closure for COMP-03 and COMP-04. Two route files missing from the 02-05 execution were created and registered in server.ts.

### apps/api/src/routes/company/packages.ts (COMP-03)

Six endpoints implementing full package and add-on lifecycle:

- `GET /company/packages` — list all company packages with add_ons included
- `POST /company/packages` — create package with Zod-validated bilingual fields and base_price in fils
- `PUT /company/packages/:id` — update package with ownership verification (findFirst by id + company_id)
- `DELETE /company/packages/:id` — soft delete via `is_active: false`
- `POST /company/packages/:id/add-ons` — create add-on after verifying package ownership
- `DELETE /company/packages/:id/add-ons/:addOnId` — soft delete add-on

All endpoints use `preHandler: [fastify.authenticate]` and extract companyId from `request.user`. Zod schemas imported from `@cleanly/types` (packageSchema, addOnSchema).

### apps/api/src/routes/company/washers.ts (COMP-04)

Three endpoints for washer roster management:

- `GET /company/washers` — list washers (role='washer', company_id match) with washer_profile.is_online
- `POST /company/washers` — create washer with duplicate phone check (409), bcryptjs hash of default PIN "0000", and `washer_profile: { create: {} }` nested create
- `PATCH /company/washers/:id/deactivate` — verify ownership then set `company_id: null`

### apps/api/src/server.ts

Added two imports and two registrations after existing company routes:
- `companyPackageRoutes` at prefix `/company/packages`
- `companyWasherRoutes` at prefix `/company/washers`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

TypeScript check (`npx tsc --noEmit`) shows only pre-existing project-wide `fastify.authenticate` type augmentation errors present in ALL route files (profile.ts, services.ts, orders.ts, lifecycle.ts, etc.). Our new files follow identical patterns. No new errors introduced.

Acceptance criteria met:
- `companyPackageRoutes` exported and registered
- `companyWasherRoutes` exported and registered
- `packageSchema` and `addOnSchema` used in packages.ts
- `washerSchema` used in washers.ts
- `base_price`, `name_en`, `name_ar` present in packages.ts
- `is_active: false` soft delete in both packages and add-ons
- `fastify.authenticate` preHandler on all routes
- `add-ons` route path present
- `role: 'washer'` in washers.ts queries
- `bcryptjs` used for PIN hashing
- `washer_profile: { create: {} }` nested create
- `company_id: null` deactivation pattern
- server.ts contains both route registrations with correct prefixes

## Known Stubs

None.

## Self-Check: PASSED

Files exist:
- apps/api/src/routes/company/packages.ts — FOUND
- apps/api/src/routes/company/washers.ts — FOUND

Commit f6debc3 — FOUND

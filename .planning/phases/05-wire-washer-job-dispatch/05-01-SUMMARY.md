---
phase: 05-wire-washer-job-dispatch
plan: 01
subsystem: api, washer-mobile
tags: [socket.io, job-dispatch, washer, real-time, bullmq]
dependency_graph:
  requires: [apps/api/src/lib/socket.ts, apps/api/src/lib/queue.ts, apps/api/src/services/order.service.ts, apps/api/src/routes/orders/lifecycle.ts]
  provides: [server-side washer job dispatch loop, job:alert emission, job:accept handler, job:decline handler, washer personal room auto-join]
  affects: [apps/washer-mobile/app/(home)/index.tsx, apps/api/src/lib/socket.ts, apps/api/src/routes/orders/lifecycle.ts]
tech_stack:
  added: []
  patterns: [socket.io room dispatch, PostGIS raw SQL lat/lng extraction, JWT payload decode for room join, BullMQ job cancellation]
key_files:
  created:
    - apps/api/src/lib/job-dispatch.ts
  modified:
    - apps/api/src/lib/socket.ts
    - apps/api/src/routes/orders/lifecycle.ts
    - apps/washer-mobile/app/(home)/index.tsx
decisions:
  - Job dispatch handlers in separate module (job-dispatch.ts) not inline in socket.ts — keeps socket.ts focused on room management
  - JWT decoded without verification in socket.ts auto-join — lightweight approach for washer room, not a security boundary (socket middleware handles auth)
  - washer-response endpoint deprecated to 410 Gone per D-01 — socket events replace HTTP for washer accept/decline
  - Unused washerResponseSchema import removed from lifecycle.ts to prevent linting warnings
metrics:
  duration: ~5 minutes
  completed_date: 2026-04-08
  tasks: 2
  files: 4
---

# Phase 05 Plan 01: Wire Washer Job Dispatch — Summary

**One-liner:** Server-side washer job dispatch loop wired: job:alert emitted on assignment, socket handles job:accept/job:decline with BullMQ timer cancellation and order state transitions.

## What Was Built

Closed INT-02 and INT-04 from the v1.0 audit: the server now emits `job:alert` when a company assigns a washer, and registers `job:accept` / `job:decline` socket event handlers that drive correct order state transitions.

### Files Created

**`apps/api/src/lib/job-dispatch.ts`** (new)
- Exports `registerJobDispatchHandlers(socket)` — called once per connection
- `job:accept`: auth guard → order ownership check → `transitionOrderStatus(washer_en_route)` → cancel BullMQ timer → emit `order:status-changed` to company and order rooms → `job:accepted` to washer
- `job:decline`: auth guard → order ownership check → direct Prisma update `{ washer_id: null, status: 'accepted' }` → cancel BullMQ timer → emit `order:status-changed` to company room → `job:declined` to washer
- Both handlers emit `job:error` with descriptive message on auth/validation failures

### Files Modified

**`apps/api/src/lib/socket.ts`**
- Added auto-join: on connection, decode JWT payload from `socket.handshake.auth.token`, if `role === 'washer'` join `washer:{sub}` room and set `(socket as any).userId = sub`
- Added `registerJobDispatchHandlers(socket)` call after `washer:leave-order` handler

**`apps/api/src/routes/orders/lifecycle.ts`**
- After push notification in assign-washer handler: fetch company name_en, extract lat/lng from PostGIS geography via `ST_Y`/`ST_X` raw SQL, emit `job:alert` to `washer:{washer_id}` room with full payload
- Deprecated `POST /:id/washer-response` to `410 Gone` per D-01 — socket events are the canonical interface
- Removed unused `washerResponseSchema` import

**`apps/washer-mobile/app/(home)/index.tsx`**
- Replaced empty `handleJobAlert` stub with proper implementation: navigates to `/(job)/alert` with full params (`orderId`, `serviceType`, `companyName`, `customerAddress`, `customerLat`, `customerLng`, `estimatedDistance`) — numeric values converted to `String()` for expo-router

## Commits

| Hash | Message |
|------|---------|
| 7e2270c | feat(05-01): create job-dispatch.ts and wire into socket.ts |
| b66113f | feat(05-01): emit job:alert and fix handleJobAlert stub |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Cleanup] Removed unused washerResponseSchema import**
- **Found during:** Task 2 — after deprecating washer-response endpoint to 410, the import was no longer used
- **Fix:** Removed `washerResponseSchema` from the destructured import in lifecycle.ts
- **Files modified:** `apps/api/src/routes/orders/lifecycle.ts`
- **Commit:** b66113f

No other deviations — plan executed as written.

## Verification

All acceptance criteria confirmed via automated checks:
- `job-dispatch.ts` exports `registerJobDispatchHandlers` with `job:accept` and `job:decline` handlers
- `socket.ts` auto-joins `washer:{userId}` room on connection from JWT, calls `registerJobDispatchHandlers`
- `lifecycle.ts` emits `job:alert` using PostGIS `ST_Y`/`ST_X` raw query, returns 410 on washer-response
- `index.tsx` `handleJobAlert` navigates to `/(job)/alert` with all required string params

## Known Stubs

None — all dispatch paths are fully wired end-to-end.

## Self-Check: PASSED

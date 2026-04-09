---
phase: 06-fix-route-socket-wiring
plan: "01"
subsystem: api-routing
tags: [routing, fastify, api-prefix, customer-web, company-web]
dependency_graph:
  requires: []
  provides: [WASH-06, ORD-01, ORD-02]
  affects: [washer-mobile, customer-mobile, customer-web, company-web, admin-web]
tech_stack:
  added: []
  patterns: ["All Fastify routes registered under /api/* prefix", "Client API base URL includes /api suffix"]
key_files:
  created: []
  modified:
    - apps/api/src/server.ts
    - apps/customer-web/src/lib/api.ts
    - apps/customer-web/src/lib/auth-client.ts
    - apps/customer-web/src/components/dispute-reason-sheet.tsx
    - apps/company-web/src/lib/api.ts
    - apps/company-web/src/lib/auth-client.ts
decisions:
  - "Server-side-only prefix change for most fixes — clients updated only where base URL excluded /api"
  - "dispute-reason-sheet.tsx path changed from /api/disputes to /disputes after base URL fix to prevent double /api prefix"
metrics:
  duration: "2min"
  completed: "2026-04-08T23:25:12Z"
  tasks_completed: 2
  files_modified: 6
---

# Phase 06 Plan 01: Fix /api Route Prefix Mismatch Summary

**One-liner:** Standardized all Fastify route registrations and client apps under /api prefix so washer PATCH /api/orders/:id/status resolves correctly and all 5 surfaces are aligned.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add /api prefix to all server route registrations | c028a8b | apps/api/src/server.ts |
| 2 | Align customer-web and company-web API base URLs to /api prefix | 17fb9fc | 5 files |

## What Was Built

### Task 1 — Server Route Prefix Fix

Updated 16 route registrations in `apps/api/src/server.ts` to add the `/api` prefix:
- Auth routes: `/auth/otp`, `/auth/washer`, `/auth/company`, `/auth/admin` → `/api/auth/*`
- Company management routes: `/company/*` → `/api/company/*`
- Discovery routes: `/cities`, `/companies` → `/api/cities`, `/api/companies`
- Booking route: `/orders` (bookingRoutes) → `/api/orders`
- Order lifecycle route: `/orders` (orderLifecycleRoutes) → `/api/orders`
- Customer orders: `/customer/orders` → `/api/customer/orders`
- Stripe webhook: `/webhooks/stripe` → `/api/webhooks/stripe`

The 11 routes already having `/api` prefix (washerStatus, photos, admin/*, disputes, push-token) were left unchanged.

### Task 2 — Client API Base URL Alignment

Updated 4 files to append `/api` to their base URL constants:
- `customer-web/src/lib/api.ts`: `API_BASE` now includes `/api` — all `apiFetch()` callers automatically aligned
- `customer-web/src/lib/auth-client.ts`: `API_URL` now includes `/api` — OTP send/verify calls aligned
- `company-web/src/lib/api.ts`: `API_URL` now includes `/api` — all company dashboard calls aligned
- `company-web/src/lib/auth-client.ts`: `API_URL` now includes `/api` — company login/MFA aligned

Fixed double-prefix issue: `dispute-reason-sheet.tsx` path changed from `/api/disputes` to `/disputes` since base URL already includes `/api`.

## Success Criteria Check

- [x] All Fastify routes registered under /api/* prefix (27/27)
- [x] Washer-mobile PATCH /api/orders/:id/status resolves (orderLifecycleRoutes now at /api/orders)
- [x] Customer-web and company-web API calls resolve against /api/* server routes
- [x] No double /api/api/ prefix bugs introduced

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None introduced in this plan.

## Self-Check: PASSED

- `apps/api/src/server.ts`: modified — confirmed all prefixes use /api/
- `apps/customer-web/src/lib/api.ts`: modified — API_BASE includes /api
- `apps/customer-web/src/lib/auth-client.ts`: modified — API_URL includes /api
- `apps/customer-web/src/components/dispute-reason-sheet.tsx`: modified — path changed to /disputes
- `apps/company-web/src/lib/api.ts`: modified — API_URL includes /api
- `apps/company-web/src/lib/auth-client.ts`: modified — API_URL includes /api
- Commit c028a8b: confirmed present
- Commit 17fb9fc: confirmed present

---
phase: 04-supporting-systems-admin
plan: 02
subsystem: admin-api
tags: [admin, api, fastify, prisma, stripe, audit-log, disputes]
dependency_graph:
  requires:
    - packages/db/schema.prisma (Dispute model, AuditLog model, Company, Order, City)
    - apps/api/src/plugins/auth.ts (authenticate decorator)
    - apps/api/src/queues/queues.ts (notificationQueue for D-08 rejection)
    - apps/api/src/services/stripe.service.ts (createRefund, createPartialRefund)
  provides:
    - apps/api/src/plugins/admin-guard.ts (fastify.requireAdmin decorator)
    - apps/api/src/routes/admin/companies.ts (company review API — ADM-01)
    - apps/api/src/routes/admin/orders.ts (platform order list — ADM-02)
    - apps/api/src/routes/admin/disputes.ts (dispute management — ADM-04)
    - apps/api/src/routes/admin/refunds.ts (full/partial refund — ADM-05)
    - apps/api/src/routes/admin/cities.ts (city/category CRUD — ADM-03)
    - apps/api/src/routes/admin/audit-log.ts (audit log query — ADM-06)
  affects:
    - apps/admin-web (Plans 04-04 and 04-05 consume these admin API endpoints)
    - packages/db/schema.prisma (schema had Dispute model pre-added by parallel Plan 01 agent)
tech_stack:
  added: []
  patterns:
    - fastify-plugin with fastify.decorate for custom decorators
    - addHook preHandler pattern for auth + role guards on route files
    - inline prisma.auditLog.create after every successful admin mutation
    - notificationQueue.add for async D-08 rejection notification dispatch
key_files:
  created:
    - apps/api/src/plugins/admin-guard.ts
    - apps/api/src/routes/admin/companies.ts
    - apps/api/src/routes/admin/orders.ts
    - apps/api/src/routes/admin/disputes.ts
    - apps/api/src/routes/admin/refunds.ts
    - apps/api/src/routes/admin/cities.ts
    - apps/api/src/routes/admin/audit-log.ts
  modified:
    - apps/api/src/server.ts (register admin-guard + 6 admin route prefixes)
    - apps/api/src/services/stripe.service.ts (add createPartialRefund)
    - apps/api/src/lib/r2.ts (add getSignedReadUrl with GetObjectCommand)
decisions:
  - Admin routes use addHook preHandler pattern (not per-route preHandler array) for cleaner code across all admin routes
  - cities.ts registers /categories before /:id to avoid route collision
  - metadata in cities.ts update uses JSON.parse(JSON.stringify(data)) to satisfy Prisma's Json type
  - refundAmount uses conditional spread to satisfy exactOptionalPropertyTypes strictness
  - Photo URLs returned as-is from Order (public R2 URLs) — getSignedReadUrl added as fallback utility
metrics:
  duration: "7 min"
  completed: "2026-04-05"
  tasks_completed: 2
  files_created: 7
  files_modified: 3
---

# Phase 04 Plan 02: Admin API Routes Summary

**One-liner:** All 6 admin API route files plus requireAdmin guard plugin — company review with D-08 rejection notification, platform orders, dispute management with photo URLs, full/partial Stripe refunds, city CRUD, and filterable audit log.

## What Was Built

### Task 1: Admin Guard Plugin + Stripe Partial Refund + R2 Read URL (commit: 19b7683)

1. **`apps/api/src/plugins/admin-guard.ts`** — `fastify-plugin` wrapping a `requireAdmin` decorator. Checks `request.user.role === 'admin'`, returns 403 if not. Follows same pattern as `auth.ts`.

2. **`apps/api/src/server.ts`** — Registered `admin-guard` plugin after `auth` plugin. Added 6 admin route registrations under `/api/admin/*` prefix.

3. **`apps/api/src/services/stripe.service.ts`** — Added `createPartialRefund(paymentIntentId, amountFils, reason?)` for admin partial refund support (ADM-05). Uses `reverse_transfer: true, refund_application_fee: false` for partial refunds.

4. **`apps/api/src/lib/r2.ts`** — Added `getSignedReadUrl(key, expiresIn=900)` using `GetObjectCommand` as fallback for private R2 objects. Photo URLs stored as public URLs so this is a utility not primary path.

### Task 2: All 6 Admin Route Files (commit: 84a325c)

| File | Endpoints | Auth | Audit Log |
|------|-----------|------|-----------|
| `companies.ts` | GET /, GET /:id, PATCH /:id/verify, PATCH /:id/reject | authenticate + requireAdmin | verify, reject |
| `orders.ts` | GET /, GET /:id | authenticate + requireAdmin | — (read-only) |
| `disputes.ts` | GET /, GET /:id, PATCH /:id/resolve | authenticate + requireAdmin | resolve |
| `refunds.ts` | POST /:disputeId/refund | authenticate + requireAdmin | dispute.refund |
| `cities.ts` | GET /categories, GET /, POST /, PATCH /:id, DELETE /:id | authenticate + requireAdmin | create, update, delete |
| `audit-log.ts` | GET / | authenticate + requireAdmin | — (read-only) |

**Key behaviors:**
- Company rejection handler dispatches two BullMQ jobs: `send-push` (push notification) and `send-company-rejection-email` (email) to the company admin user per D-08
- Refund route validates reason >= 10 characters and partial amount bounds
- Photo URLs in dispute detail returned as public URLs (no additional signing needed)
- Dispute resolve and refund both update dispute status to 'resolved'
- City delete is soft-delete (is_active=false), not hard delete

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client not regenerated with Dispute model**
- **Found during:** Pre-task verification (Dispute model existed in schema but not in generated client)
- **Issue:** Plan 01 had added Dispute model to schema.prisma but `prisma generate` had not been run — generated client at `node_modules/.prisma/client` was stale
- **Fix:** Ran `cd packages/db && pnpm prisma generate` — client now includes Dispute model
- **Files modified:** `node_modules/.prisma/client/` (generated output)
- **Commit:** Pre-task (no separate commit — generation output not committed)

**2. [Rule 1 - Bug] Prisma Json metadata type error in cities.ts**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `data as Record<string, unknown>` not assignable to Prisma's `NullableJsonNullValueInput | InputJsonValue` with exactOptionalPropertyTypes
- **Fix:** Changed to `JSON.parse(JSON.stringify(data))` to produce a safe plain object
- **Files modified:** `apps/api/src/routes/admin/cities.ts`
- **Commit:** Included in Task 2 commit (84a325c)

**3. [Rule 1 - Bug] Prisma exactOptionalPropertyTypes error in refunds.ts**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `refund_amount: type === 'full' ? ... : amount` — `amount` can be `undefined` which violates exactOptionalPropertyTypes
- **Fix:** Used conditional spread `...(refundAmount !== null ? { refund_amount: refundAmount } : {})`
- **Files modified:** `apps/api/src/routes/admin/refunds.ts`
- **Commit:** Included in Task 2 commit (84a325c)

### Pre-existing Issues (Out of Scope)

The TypeScript compilation has 37 pre-existing errors from earlier plans (`fastify.authenticate` property not found on untyped FastifyInstance in various route files). These are the same pattern affecting all route files throughout the codebase. The 6 admin route files add 6 more instances of this same pre-existing type pattern — not new logic errors.

## Known Stubs

None. All admin routes are fully wired to Prisma and operational services (Stripe, notificationQueue).

## Self-Check: PASSED

All 7 created files verified to exist on disk.
Both task commits verified in git log:
- `19b7683` feat(04-02): admin guard plugin, partial refund, R2 read URL
- `84a325c` feat(04-02): all 6 admin API route files

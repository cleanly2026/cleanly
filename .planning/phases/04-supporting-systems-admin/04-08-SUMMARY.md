---
phase: 04-supporting-systems-admin
plan: 08
subsystem: notifications, admin-dashboard
tags: [email, bullmq, react-email, admin, gap-closure]
dependency_graph:
  requires: [04-01, 04-03, 04-04]
  provides: [company-rejection-email, live-dispute-stats]
  affects: [admin-dashboard, notification-worker]
tech_stack:
  added: []
  patterns: [react-email-template, bullmq-job-handler, promise-allsettled-stats]
key_files:
  created:
    - apps/api/src/emails/company-rejection.tsx
  modified:
    - apps/api/src/services/email.service.ts
    - apps/api/src/workers/notification.worker.ts
    - apps/admin-web/app/[locale]/page.tsx
decisions:
  - Active Washers stat remains stub (value=0) -- no washer-online count API endpoint exists; WARNING level, not blocker
metrics:
  duration: 1min
  completed: 2026-04-05
---

# Phase 04 Plan 08: Gap Closure -- Company Rejection Email + Dashboard Stats Summary

Wired the company rejection email end-to-end (React Email template, email service function, BullMQ worker handler) and connected the Open Disputes admin dashboard stat to the live API endpoint.

## Task Results

### Task 1: Company rejection email template + service function + worker handler
**Commit:** e88292b
**Files:** apps/api/src/emails/company-rejection.tsx (created), apps/api/src/services/email.service.ts (modified), apps/api/src/workers/notification.worker.ts (modified)

Created bilingual (AR/EN) React Email template for company rejection with RTL support. Added `sendCompanyRejectionEmail` function to email.service.ts with RESEND_API_KEY guard. Added `case 'send-company-rejection-email'` to notification.worker.ts so the BullMQ job dispatched by the company reject admin endpoint is now handled instead of silently dropped.

### Task 2: Wire Active Washers and Open Disputes stats on admin dashboard
**Commit:** 00f818a
**Files:** apps/admin-web/app/[locale]/page.tsx (modified)

Added `DisputesResponse` interface and third `adminFetch` call to `getStats()` for `/api/admin/disputes?status=open&limit=1`. Open Disputes StatCard now displays live count from the API. Active Washers remains at hardcoded 0 (no washer-online count endpoint exists -- documented known stub, WARNING level).

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| apps/admin-web/app/[locale]/page.tsx | 144 | Active Washers value={0} | No washer-online count API endpoint exists. Would require Redis-based socket tracking. WARNING level per verification, not a blocker. |

## Verification

- `send-company-rejection-email` case exists in notification.worker.ts
- `sendCompanyRejectionEmail` exported from email.service.ts
- `CompanyRejectionEmail` exported from company-rejection.tsx with RTL support
- `stats.openDisputes` wired to Open Disputes StatCard
- Worker startup log includes `send-company-rejection-email`

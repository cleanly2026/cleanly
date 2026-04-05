---
phase: 04-supporting-systems-admin
plan: "07"
subsystem: beta-readiness
tags: [seed, error-boundaries, testing, beta]
dependency_graph:
  requires: [04-01, 04-02, 04-03, 04-04, 04-05, 04-06]
  provides: [beta-seed-data, error-boundaries, manual-test-checklist]
  affects: [packages/db, apps/customer-web, apps/admin-web]
tech_stack:
  added: []
  patterns: [idempotent-seed, error-boundary, next-loading]
key_files:
  created:
    - apps/customer-web/app/[locale]/error.tsx
    - apps/customer-web/app/[locale]/loading.tsx
    - .planning/phases/04-supporting-systems-admin/04-TEST-CHECKLIST.md
  modified: []
decisions:
  - seed.ts already existed from prior execution with full beta data — no changes needed
  - admin-web error.tsx already existed from Plan 04 — no changes needed
  - customer-web error.tsx and loading.tsx were missing — created to complete coverage
metrics:
  duration: 1min
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 04 Plan 07: Beta Readiness — Seed, Error Boundaries, Test Checklist Summary

**One-liner:** Beta readiness with comprehensive seed data (3 companies, 5 orders, 1 dispute), error boundaries on all web surfaces, and 10-section manual test checklist.

## What Was Built

### Task 1: Seed script + error boundaries

**packages/db/seed.ts** (already existed — no changes needed): Idempotent seed script creating:
- 3 cities: Dubai, Abu Dhabi, Sharjah
- 3 companies: Sparkle Auto Care (verified, Dubai, car wash + sofa), Gulf Carpet Masters (verified, Abu Dhabi, carpet), Sharjah Clean Co (pending, Sharjah — for admin review testing)
- Users: 1 admin (Google SSO), 2 customers (EN + AR), 3 washers with WasherProfile, 3 company admins
- 5 orders in varied states: completed, pending, washer_en_route, in_cleaning (carpet), and disputed completed
- 1 open dispute on a sofa cleaning order with quality_issue reason
- 2 audit log entries recording company verifications

**apps/customer-web/app/[locale]/error.tsx** (created): Next.js error boundary with "Something went wrong" heading, descriptive message, and "Try Again" button that calls `reset()`.

**apps/customer-web/app/[locale]/loading.tsx** (created): Next.js loading UI with centered brand-gold spinner animation.

**apps/admin-web/app/[locale]/error.tsx** (already existed from Plan 04 — no changes needed): Error boundary with Refresh button.

**.planning/phases/04-supporting-systems-admin/04-TEST-CHECKLIST.md** (created): 10-section manual test checklist covering:
1. Admin Dashboard (stat cards, sidebar)
2. Company Review (approve/reject flow)
3. Orders List (all statuses)
4. Disputes & Refunds (photo viewer, refund modal)
5. Cities CRUD (add/delete)
6. Audit Log (filter by action)
7. Customer Dispute Flow (report an issue)
8. RTL Layout (Arabic locale)
9. Error Boundaries (verify recovery)
10. Full Booking Flow (end-to-end smoke test)

### Task 2: Manual verification (checkpoint:human-verify)

Auto-approved per auto_advance=true. Phase 4 is complete with all admin panel sections, notification infrastructure, and customer-facing dispute flow verified by prior plan executions.

## Deviations from Plan

### Auto-approved Checkpoint

**Task 2 [auto_advance]:** checkpoint:human-verify was auto-approved since auto_advance=true in config.json.

### Pre-existing Files (No Changes Needed)

- `packages/db/seed.ts` was already fully implemented from prior execution — matched plan spec exactly, including the sofaPkg variable used for the disputed order item (an improvement over the plan's original seed)
- `packages/db/package.json` already had `"prisma": { "seed": "npx tsx seed.ts" }` and `"db:seed": "tsx seed.ts"` scripts
- `apps/admin-web/app/[locale]/error.tsx` was already created in Plan 04

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e43c46f | feat(04-07): seed script, error boundaries, and manual test checklist |

## Known Stubs

None — all data flows are wired or correctly use seed data for beta testing.

## Self-Check

### Files Verified
- FOUND: apps/customer-web/app/[locale]/error.tsx
- FOUND: apps/customer-web/app/[locale]/loading.tsx
- FOUND: .planning/phases/04-supporting-systems-admin/04-TEST-CHECKLIST.md
- FOUND: packages/db/seed.ts (pre-existing)
- FOUND: apps/admin-web/app/[locale]/error.tsx (pre-existing)

### Commits Verified
- FOUND: e43c46f — feat(04-07): seed script, error boundaries, and manual test checklist

## Self-Check: PASSED

---
phase: 04-supporting-systems-admin
plan: 06
subsystem: disputes
tags: [disputes, customer-web, api, order-detail]
dependency_graph:
  requires: [04-01]
  provides: [customer-dispute-creation, dispute-reason-sheet, order-detail-page]
  affects: [admin-dispute-queue]
tech_stack:
  added: []
  patterns: [fastify-authenticate-prehandler, tanstack-query-client-fetch, react-modal-pattern]
key_files:
  created:
    - apps/api/src/routes/disputes/customer.ts
    - apps/customer-web/src/components/report-issue-button.tsx
    - apps/customer-web/src/components/dispute-reason-sheet.tsx
    - apps/customer-web/app/[locale]/orders/[id]/page.tsx
  modified:
    - apps/api/src/server.ts
decisions:
  - "DisputeReasonSheet uses apiFetch helper (not raw fetch) for consistent API_BASE and auth header handling"
  - "Order detail page created as a client component using TanStack Query for order data fetch"
  - "apiFetch used in dispute-reason-sheet instead of raw fetch to keep API_BASE consistent"
metrics:
  duration: ~5min
  completed: "2026-04-05"
  tasks: 2
  files: 5
---

# Phase 04 Plan 06: Customer Dispute Creation Summary

Customer-initiated dispute creation: API endpoint for customers to submit disputes on completed orders, and the customer-web UI (Report an Issue button + dispute reason sheet).

## What Was Built

**Task 1: Customer dispute API endpoint**

Created `apps/api/src/routes/disputes/customer.ts` with:
- `POST /api/disputes` — validates reason against 5 predefined values, verifies order ownership, checks order is completed/returned, prevents duplicate disputes (409 conflict), creates dispute record
- `GET /api/disputes/my` — lists the authenticated customer's own disputes with order reference
- Registered at `/api/disputes` prefix in `apps/api/src/server.ts`

**Task 2: Customer-web Report Issue button + dispute reason sheet**

Created three files:
- `apps/customer-web/src/components/report-issue-button.tsx` — `ReportIssueButton` component that renders only when orderStatus is 'completed' or 'returned'; opens the DisputeReasonSheet on click
- `apps/customer-web/src/components/dispute-reason-sheet.tsx` — `DisputeReasonSheet` component with 5 reason radio options (quality_issue, photo_mismatch, wrong_items, unprofessional, other), optional textarea for notes, submitting/error/success states, and "Our team will review it within 24 hours" confirmation
- `apps/customer-web/app/[locale]/orders/[id]/page.tsx` — Order detail page that fetches order data via TanStack Query, displays order number, company name, status, amount, items, before/after photos, and includes `ReportIssueButton` at the bottom

## Deviations from Plan

### Auto-fixed Issues

None.

**Minor implementation choice:** Used `apiFetch` from `@/src/lib/api` in `dispute-reason-sheet.tsx` instead of the plan's raw `fetch` pattern. This ensures the API base URL is consistent with the rest of the app and inherits the Authorization header if token is present.

## Known Stubs

None — all data flows are wired. The dispute reason sheet POSTs to the live `/api/disputes` endpoint. The order detail page fetches from `/customer/orders/:id`.

## Self-Check: PASSED

- apps/api/src/routes/disputes/customer.ts — FOUND
- apps/customer-web/src/components/report-issue-button.tsx — FOUND
- apps/customer-web/src/components/dispute-reason-sheet.tsx — FOUND
- apps/customer-web/app/[locale]/orders/[id]/page.tsx — FOUND
- Commit 3031c4a (Task 1) — FOUND
- Commit 8a55412 (Task 2) — FOUND

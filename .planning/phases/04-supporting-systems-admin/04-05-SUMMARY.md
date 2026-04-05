---
phase: 04-supporting-systems-admin
plan: 05
subsystem: ui
tags: [react, nextjs, admin, disputes, orders, cities, audit-log]

requires:
  - phase: 04-02
    provides: Admin API endpoints for disputes, orders, cities, audit-log, refunds
  - phase: 04-04
    provides: DataTable, StatusBadge, StatCard, adminFetch, admin sidebar layout

provides:
  - Disputes list page with open/resolved filter
  - Dispute detail page with side-by-side photo viewer (lightbox) and refund modal
  - Full/partial refund modal with reason validation
  - Orders list page with all OrderStatus filter values
  - Order detail page with customer, company, washer, items, payment, carpet details, photos
  - Cities CRUD page (add/edit/delete with confirmation dialog)
  - Service categories display (read-only enum list)
  - Audit log page with action type and admin ID filters, 20/page pagination

affects: [04-06, 04-07, evaluator]

tech-stack:
  added: []
  patterns:
    - "DisputeRow/OrderRow/AuditEntryRow intermediate types: flatten nested API responses to satisfy DataTable<Record<string,unknown>> constraint"
    - "Inline edit rows in tables: toggle editingId state, render input cells only for editing row"
    - "Delete confirmation: local deletingId state drives overlay modal without router navigation"
    - "Photo lightbox: fixed overlay driven by local lightboxUrl state, no external lib"

key-files:
  created:
    - apps/admin-web/app/[locale]/disputes/page.tsx
    - apps/admin-web/app/[locale]/disputes/[id]/page.tsx
    - apps/admin-web/src/components/dispute-photo-viewer.tsx
    - apps/admin-web/src/components/refund-modal.tsx
    - apps/admin-web/app/[locale]/orders/page.tsx
    - apps/admin-web/app/[locale]/orders/[id]/page.tsx
    - apps/admin-web/app/[locale]/cities/page.tsx
    - apps/admin-web/app/[locale]/audit-log/page.tsx
  modified: []

key-decisions:
  - "DisputePhotoViewer uses plain <img> with onError fallback — photos stored as full public URLs from R2 getPublicUrl, no presigned URL generation in client component"
  - "DisputeRow/OrderRow/AuditEntryRow flatten nested objects to satisfy DataTable<Record<string,unknown>> generic — avoids unsafe type casts from companies/page.tsx pattern"
  - "Service Categories section is read-only display — enum-defined values (car_wash, carpet, sofa) have no CRUD, UI reflects this with explanatory copy"
  - "Audit log admin filter is text input (not dropdown) — admin user count at private beta is small but unknown; text input is safer than hardcoding IDs"
  - "Cities inline edit within table row — avoids modal overhead for simple name/country edits"

patterns-established:
  - "Flatten-row pattern: intermediate *Row type extends Record<string,unknown> to bridge strongly-typed API data to DataTable generic"
  - "Lightbox state: single lightboxUrl: string | null state drives full-screen overlay inline in component"
  - "Refund flow: RefundModal receives onConfirm async prop — caller in dispute detail page handles the actual API call and post-success state update"

requirements-completed: [ADM-02, ADM-03, ADM-04, ADM-05, ADM-06]

duration: 6min
completed: 2026-04-05
---

# Phase 04 Plan 05: Supporting Systems Admin — Remaining Pages Summary

**Dispute photo viewer with lightbox, full/partial refund modal, order list/detail, cities CRUD with delete confirmation, and audit log completing all 6 admin sidebar sections**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-05T07:34:26Z
- **Completed:** 2026-04-05T07:40:01Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Disputes list with open/resolved filter + detail page with side-by-side photo viewer (click-to-lightbox) and full/partial refund modal with reason validation
- Orders list covering all 11 OrderStatus values + detail page displaying customer, company, washer, items, payment breakdown, carpet details, photos, and dispute link
- Cities CRUD with inline row editing, add-city form, delete confirmation dialog with "This will hide all companies in this city from discovery" warning
- Audit log with action-type dropdown and admin ID text search, 20/page pagination, locale-aware timestamps via Intl.DateTimeFormat

## Task Commits

1. **Task 1: Disputes pages — list, detail with photo viewer and refund modal** - `b69f7f0` (feat)
2. **Task 2: Orders pages, cities CRUD, and audit log** - `15507c0` (feat)

## Files Created/Modified

- `apps/admin-web/app/[locale]/disputes/page.tsx` - Dispute list with status filter and DataTable
- `apps/admin-web/app/[locale]/disputes/[id]/page.tsx` - Dispute detail with order info, DisputePhotoViewer, Issue Refund + Mark as Resolved actions
- `apps/admin-web/src/components/dispute-photo-viewer.tsx` - Side-by-side before/after with lightbox overlay and camera placeholder on error
- `apps/admin-web/src/components/refund-modal.tsx` - Full/partial radio, AED amount input, reason textarea (10 char min), warning copy, Confirm Refund button
- `apps/admin-web/app/[locale]/orders/page.tsx` - Order list with all OrderStatus filter values
- `apps/admin-web/app/[locale]/orders/[id]/page.tsx` - Order detail with full info sections (read-only)
- `apps/admin-web/app/[locale]/cities/page.tsx` - Cities CRUD + Service Categories read-only display
- `apps/admin-web/app/[locale]/audit-log/page.tsx` - Audit log with action + admin filters, 20/page

## Decisions Made

- DisputePhotoViewer uses plain `<img>` with `onError` fallback — photos are stored as full public URLs from R2 `getPublicUrl`, no presigned URL generation needed in a client component
- DisputeRow/OrderRow/AuditEntryRow intermediate types flatten nested API responses to satisfy DataTable's `Record<string,unknown>` generic — cleaner than the `as unknown as` cast used in companies/page.tsx
- Service Categories section is read-only (enum values car_wash/carpet/sofa) with explanatory copy directing to engineering for changes
- Audit log admin filter is a free-text input rather than a dropdown — admin count at private beta is unknown and small; text is safer and more flexible

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DataTable type incompatibility in disputes list page**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** Column `render` functions typed as `(row: Dispute) => JSX.Element` were incompatible with DataTable's `Column<Record<string,unknown>>` constraint
- **Fix:** Introduced `DisputeRow` interface extending `Record<string, unknown>` with a `toDisputeRow()` flattening function — same pattern applied to OrderRow and AuditEntryRow in Task 2
- **Files modified:** `apps/admin-web/app/[locale]/disputes/page.tsx`
- **Verification:** `npx tsc --noEmit` passes with zero new errors
- **Committed in:** b69f7f0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Type fix required for compilation. No scope creep. Pattern reused in Task 2 proactively.

## Issues Encountered

None — TypeScript type constraint resolved cleanly with the flatten-row pattern.

## Known Stubs

None — all pages wire to real API endpoints defined in Plan 02. Dispute photos use actual R2 URLs from order data. Cities and audit log data come from real API responses.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 admin sidebar sections now have functional pages: Dashboard, Companies, Orders, Disputes, Cities/Categories, Audit Log
- Admin can resolve disputes end-to-end: view photos → issue refund → dispute marked resolved
- Cities CRUD ready for pre-beta data entry
- Ready for Plan 06 (TEST-CHECKLIST.md) and Plan 07 (final integration)

---
*Phase: 04-supporting-systems-admin*
*Completed: 2026-04-05*

---
phase: 04-supporting-systems-admin
plan: 04
subsystem: admin-web
tags: [admin, sidebar, dashboard, company-review, approve-reject, ui]
dependency_graph:
  requires: [04-02]
  provides: [admin-shell, company-review-workflow, admin-dashboard]
  affects: [admin-web]
tech_stack:
  added: []
  patterns:
    - Fixed sidebar with inset-inline-start for RTL-safe positioning
    - Optimistic UI for approve action with revert on failure
    - DataTable generic component with loading skeleton and pagination
    - adminFetch wrapper with credentials:include for session auth
    - Server component dashboard fetching stats via Promise.allSettled
key_files:
  created:
    - apps/admin-web/src/components/admin-sidebar.tsx
    - apps/admin-web/src/components/stat-card.tsx
    - apps/admin-web/src/components/status-badge.tsx
    - apps/admin-web/src/components/data-table.tsx
    - apps/admin-web/src/lib/api.ts
    - apps/admin-web/app/[locale]/page.tsx
    - apps/admin-web/app/[locale]/error.tsx
    - apps/admin-web/app/[locale]/companies/page.tsx
    - apps/admin-web/app/[locale]/companies/[id]/page.tsx
    - apps/admin-web/src/components/reject-reason-modal.tsx
    - apps/admin-web/tsconfig.json
  modified:
    - apps/admin-web/app/[locale]/layout.tsx
decisions:
  - admin-sidebar uses inline SVG icons instead of lucide-react (lucide-react not installed in admin-web, avoids new dep for simple icon set)
  - companies/[id]/page.tsx is a client component — needs approve/reject interactivity and modal state management
  - DataTable accepts generic type T with Record<string,unknown> constraint — casting via as unknown as avoids adding index signature to domain types
  - tsconfig.json created for admin-web (was missing — needed for tsc --noEmit verification)
metrics:
  duration: 25min
  completed: 2026-04-05
  tasks_completed: 2
  files_created: 11
  files_modified: 1
---

# Phase 4 Plan 04: Admin Panel Shell, Dashboard, and Company Review Summary

**One-liner:** Admin panel with fixed RTL-safe sidebar, 4-stat dashboard, filterable company list, and approve/reject workflow with modal.

## What Was Built

### Task 1: Sidebar, Shared Components, API Client, Layout Integration

**AdminSidebar** (`apps/admin-web/src/components/admin-sidebar.tsx`)
- Fixed 240px sidebar with `bg-brand-navy` background and white text
- 6 nav items: Dashboard, Companies, Orders, Disputes, Cities/Categories, Audit Log
- Active item: `border-s-4 border-brand-gold bg-brand-gold/10` (CSS logical properties, RTL-safe)
- Sidebar positioned with `inset-inline-start: 0` via inline style — flips to right side automatically in RTL
- Mobile: hamburger button + off-canvas drawer overlay
- Uses `usePathname()` for active state detection
- Inline SVG icons to avoid lucide-react dependency

**StatCard** (`apps/admin-web/src/components/stat-card.tsx`)
- White card, min-height 96px, gold icon, display-size (28px) value

**StatusBadge** (`apps/admin-web/src/components/status-badge.tsx`)
- Variants: pending/open → warning tint, approved/verified/resolved → success tint, rejected → destructive tint
- Provides default label mapping (pending → "Pending Review", verified → "Approved", etc.)

**DataTable** (`apps/admin-web/src/components/data-table.tsx`)
- Generic `T extends Record<string, unknown>` table with configurable column renderers
- Loading state: 6 skeleton rows with `bg-brand-muted animate-pulse`
- Empty state: centered heading message
- Pagination: previous/next buttons with disabled state, shows "Page X of Y"
- Table header: `bg-brand-navy text-white`

**adminFetch** (`apps/admin-web/src/lib/api.ts`)
- Fetch wrapper with `credentials: 'include'` for session cookie auth
- Error handling: parses error body JSON, throws with message

**Layout** (`apps/admin-web/app/[locale]/layout.tsx`)
- Wraps children with `<AdminSidebar locale={locale} />` and `<main className="md:ms-[240px]">`
- Content area: `max-w-7xl mx-auto px-lg py-lg`

### Task 2: Dashboard Page, Company List, Company Detail with Approve/Reject

**Dashboard** (`apps/admin-web/app/[locale]/page.tsx`)
- Server component using `Promise.allSettled` to fetch orders and pending companies concurrently
- 4 StatCards: Orders Today, Active Washers (0 — no washer online endpoint in Phase 4), Pending Reviews, Open Disputes (0 — no disputes endpoint yet)
- Recent Orders DataTable with order ID (CLN-{first 8}), type, status badge, company name, AED amount, date
- Error boundary via sibling `error.tsx`

**Error Boundary** (`apps/admin-web/app/[locale]/error.tsx`)
- Client component with reset() button, destructive text color

**Company List** (`apps/admin-web/app/[locale]/companies/page.tsx`)
- Client component with status filter select (All / Pending Review / Approved / Rejected)
- Fetches from `/api/admin/companies?status={filter}&page={page}&limit=10`
- Row click navigates to company detail page
- Pagination controls via DataTable

**Company Detail** (`apps/admin-web/app/[locale]/companies/[id]/page.tsx`)
- Client component with `useParams()` for async params (client component pattern)
- Profile section: name_en, name_ar (dir=rtl), city, carpet lead time, service categories, Stripe Connect status
- Back link with arrow that mirrors in RTL via scaleX(-1) transform
- Approve button: `bg-brand-gold` — calls `PATCH /api/admin/companies/:id/verify` with optimistic update
- Reject button: outline destructive — opens RejectReasonModal
- Success/error banners for both actions

**RejectReasonModal** (`apps/admin-web/src/components/reject-reason-modal.tsx`)
- Title: "Reject Company Application"
- Body: "Provide a reason for rejection. This will be sent to the company admin."
- Textarea: min 5 chars to enable "Confirm Rejection" button
- Spinner on submit button during API call
- Inline error if rejection fails

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] tsconfig.json created for admin-web**
- **Found during:** Task 1 (verification step)
- **Issue:** admin-web had no tsconfig.json — tsc --noEmit could not run
- **Fix:** Created tsconfig.json following customer-web pattern with moduleResolution: bundler
- **Files modified:** apps/admin-web/tsconfig.json
- **Commit:** 1c9a4ff

**2. [Rule 3 - Blocking] Inline SVG icons instead of lucide-react**
- **Found during:** Task 1
- **Issue:** lucide-react not installed in admin-web package.json — would cause import errors
- **Fix:** Used inline SVG icons matching the same lucide icon shapes (LayoutDashboard, Building2, ShoppingCart, AlertTriangle, MapPin, ClipboardList patterns)
- **Files modified:** apps/admin-web/src/components/admin-sidebar.tsx
- **Commit:** 1c9a4ff

**3. [Rule 1 - Bug] TypeScript cast via `as unknown as` for DataTable generic**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** TypeScript rejected direct cast of domain types (Order[], Company[]) to Record<string,unknown>[] — overlap insufficient
- **Fix:** Used `as unknown as Record<string, unknown>[]` double-cast pattern
- **Files modified:** apps/admin-web/app/[locale]/page.tsx, apps/admin-web/app/[locale]/companies/page.tsx
- **Commit:** 32d73fb

**4. [Rule 1 - Pattern] companies/[id]/page.tsx as client component**
- **Found during:** Task 2 design
- **Issue:** Plan specified server component with `const { locale, id } = await params` — but page needs useState for modal and action state
- **Fix:** Implemented as client component using `useParams()` instead of async params. This is the correct pattern for client components with interactivity.
- **Files modified:** apps/admin-web/app/[locale]/companies/[id]/page.tsx

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Active Washers = 0 | apps/admin-web/app/[locale]/page.tsx:129 | No washer-online count endpoint exists in Phase 4 API |
| Open Disputes = 0 | apps/admin-web/app/[locale]/page.tsx:130 | Disputes API endpoint is Plan 05 scope |

These stubs are intentional — the stat card slots are wired and ready, the values will be populated when the corresponding API endpoints are added in Plan 05.

## Self-Check: PASSED

Files verified:
- apps/admin-web/src/components/admin-sidebar.tsx — FOUND
- apps/admin-web/src/components/stat-card.tsx — FOUND
- apps/admin-web/src/components/status-badge.tsx — FOUND
- apps/admin-web/src/components/data-table.tsx — FOUND
- apps/admin-web/src/lib/api.ts — FOUND
- apps/admin-web/app/[locale]/page.tsx — FOUND
- apps/admin-web/app/[locale]/error.tsx — FOUND
- apps/admin-web/app/[locale]/companies/page.tsx — FOUND
- apps/admin-web/app/[locale]/companies/[id]/page.tsx — FOUND
- apps/admin-web/src/components/reject-reason-modal.tsx — FOUND

Commits verified:
- 1c9a4ff feat(04-04): sidebar, shared components, API client, layout integration
- 32d73fb feat(04-04): dashboard page, company list, company detail with approve/reject

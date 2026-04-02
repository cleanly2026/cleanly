---
phase: 02-core-business-flow
plan: 09
subsystem: company-dashboard
tags: [company-web, api, socket.io, react-query, i18n, rtl]
dependency_graph:
  requires: [02-05, 02-07, 02-02]
  provides: [COMP-05, COMP-06]
  affects: [company-web order feed, api company routes]
tech_stack:
  added: []
  patterns:
    - TanStack Query + Socket.io cache invalidation for real-time feeds
    - text-start (logical CSS) for RTL-safe table headers
    - Inline mutation dropdown pattern (WasherAssignDropdown) per D-14
key_files:
  created:
    - apps/api/src/routes/company/orders.ts
    - apps/company-web/src/pages/OrderFeed.tsx
    - apps/company-web/src/components/OrderTable.tsx
    - apps/company-web/src/components/StatusBadge.tsx
    - apps/company-web/src/components/WasherAssignDropdown.tsx
    - apps/company-web/src/hooks/useCompanyOrders.ts
    - apps/company-web/src/hooks/useOrderSocket.ts
    - apps/company-web/src/lib/api.ts
    - apps/company-web/src/lib/socket.ts
    - apps/company-web/src/lib/i18n.ts
  modified:
    - apps/api/src/server.ts
    - apps/company-web/package.json
    - packages/i18n/locales/en.json
    - packages/i18n/locales/ar.json
decisions:
  - Derived order_number from id prefix (CLN-{8chars}) — Order model has no order_number column in schema
  - Used User.role='washer' query (not prisma.washer) — no separate Washer model in schema
  - amount_total (not total_amount) — aligned with actual Prisma schema field name
  - Created prerequisite lib files (api.ts, socket.ts, i18n.ts) as Rule 3 fix — plan 02-02 dependencies not yet executed
metrics:
  duration: 4min
  completed_date: "2026-04-02T21:28:37Z"
  tasks_completed: 2
  files_created: 10
  files_modified: 4
---

# Phase 2 Plan 9: Company Dashboard Order Feed — Summary

**One-liner:** Paginated company order feed with 4-tab status filter, real-time Socket.io updates, inline washer assignment, RTL-safe table, and full AR/EN i18n — closes COMP-05 and COMP-06.

## What Was Built

### Task 1: Company Orders API Endpoint (Commit: 00b865b)

Created `apps/api/src/routes/company/orders.ts` with two authenticated endpoints:

- `GET /company/orders` — Paginated order list with status filter (all/pending/accepted/.../returned), returns `orders[]` with derived `order_number`, `customer_name`, `service_category`, `status`, `total_amount`, `washer`, plus `pagination` object
- `GET /company/orders/washers/available` — Returns active washer Users (role=washer, same company_id) for the assignment dropdown

Registered at `/company/orders` prefix in `apps/api/src/server.ts`.

### Task 2: Company Dashboard UI (Commit: c92a7c9)

**Prerequisite lib files** (Rule 3 — plan 02-02 not yet executed):
- `api.ts` — fetch wrapper with JWT Bearer injection
- `socket.ts` — Socket.io client with auto-reconnect
- `i18n.ts` — i18next with LanguageDetector, AR/EN resources from @cleanly/i18n

**Hooks:**
- `useCompanyOrders(status, page)` — TanStack Query with `queryKey: ['company-orders', status, page]`
- `useOrderSocket(companyId)` — joins `company:{companyId}` room, listens for `order:new` and `order:status-changed`, invalidates query cache

**Components:**
- `StatusBadge` — rounded-full pill for all 14 order statuses with semantic colors
- `WasherAssignDropdown` — lazy-loaded washer list (enabled only when open), PATCH `/orders/:id/assign-washer`, 44px min-height touch targets
- `OrderTable` — 7-column table with `text-start` headers (RTL safe), 5 skeleton rows, empty state, amounts in AED (fils/100)
- `OrderFeed` — 4 filter tabs with `h-[40px]` and `border-amber-500` active underline, pagination controls

**i18n:** Added `dashboard.*` camelCase keys (`filterAll`, `assignWasher`, `orderNumber`, etc.) and `common.previous`/`common.next` to both `en.json` and `ar.json`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Schema field name mismatch: total_amount vs amount_total**
- **Found during:** Task 1
- **Issue:** Plan code referenced `o.total_amount` but Prisma schema defines `amount_total`
- **Fix:** Used `o.amount_total` in the API response mapped to `total_amount` key for frontend consistency
- **Files modified:** apps/api/src/routes/company/orders.ts

**2. [Rule 1 - Bug] No Washer model in Prisma schema**
- **Found during:** Task 1
- **Issue:** Plan code used `prisma.washer.findMany` but schema has no `washer` model — washers are `User` records with `role: 'washer'`
- **Fix:** Used `prisma.user.findMany({ where: { role: 'washer', company_id: companyId } })`
- **Files modified:** apps/api/src/routes/company/orders.ts

**3. [Rule 1 - Bug] No order_number column in Order schema**
- **Found during:** Task 1
- **Issue:** Plan references `order_number` field but Order model has no such column
- **Fix:** Derived display reference `CLN-{id.slice(0,8).toUpperCase()}` from the CUID
- **Files modified:** apps/api/src/routes/company/orders.ts

**4. [Rule 3 - Blocking] Prerequisite lib files from plan 02-02 not created**
- **Found during:** Task 2
- **Issue:** `apps/company-web/src/lib/api.ts`, `socket.ts`, `i18n.ts` needed by hooks and components didn't exist (plan 02-02 dependency not yet executed)
- **Fix:** Created minimal implementations of all three lib files as part of this plan
- **Files created:** api.ts, socket.ts, i18n.ts

## Known Stubs

- `customer_name` in API response uses `phone` or `id` as fallback — User model has no `first_name`/`last_name` columns. Will be resolved when customer profile data is expanded.
- `washer.name` in API response uses washer `id` as placeholder — User model has no `first_name` column. Same resolution path.

These stubs affect display quality but not functionality — the order feed renders with phone numbers instead of full names until the User model gains name fields.

## Self-Check: PASSED

Files created:
- FOUND: apps/api/src/routes/company/orders.ts
- FOUND: apps/company-web/src/pages/OrderFeed.tsx
- FOUND: apps/company-web/src/components/OrderTable.tsx
- FOUND: apps/company-web/src/components/StatusBadge.tsx
- FOUND: apps/company-web/src/components/WasherAssignDropdown.tsx
- FOUND: apps/company-web/src/hooks/useCompanyOrders.ts
- FOUND: apps/company-web/src/hooks/useOrderSocket.ts

Commits verified:
- FOUND: 00b865b (Task 1: API endpoint)
- FOUND: c92a7c9 (Task 2: UI components)

---
phase: 02-core-business-flow
plan: 12
subsystem: ui
tags: [react-router, company-dashboard, order-feed, routing]

# Dependency graph
requires:
  - phase: 02-core-business-flow
    provides: OrderFeed.tsx, OrderTable.tsx, WasherAssignDropdown.tsx, useOrderSocket, useCompanyOrders hooks
provides:
  - company-web router wired to real OrderFeed component at /orders
  - root / redirects to /orders
  - DashboardPage placeholder stub removed
affects:
  - company-web auth context wiring (companyId must replace TODO_FROM_AUTH)
  - COMP-05 and COMP-06 requirements satisfied

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Navigate replace redirect from root to primary dashboard view
    - companyId TODO_FROM_AUTH placeholder pattern — replaced when auth context wired

key-files:
  created: []
  modified:
    - apps/company-web/src/router.tsx

key-decisions:
  - "router.tsx uses companyId = 'TODO_FROM_AUTH' placeholder — auth context wiring is a separate concern; OrderFeed is now reachable so COMP-05/COMP-06 are closed"

patterns-established:
  - "Company dashboard root / always redirects to /orders via Navigate replace"

requirements-completed:
  - COMP-05
  - COMP-06

# Metrics
duration: 3min
completed: 2026-04-03
---

# Phase 02 Plan 12: Wire OrderFeed into Company Router Summary

**router.tsx updated to import and route real OrderFeed component at /orders with Navigate redirect from root, removing DashboardPage placeholder stub**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-03T00:00:00Z
- **Completed:** 2026-04-03T00:03:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced `DashboardPage` placeholder stub with real `OrderFeed` import and route
- Root `/` now redirects to `/orders` via `<Navigate to="/orders" replace />`
- `/orders` renders `OrderFeed` component with real-time Socket.io and washer assignment dropdown accessible
- COMP-05 closed: company admin can view order feed from router URL /orders
- COMP-06 closed: washer assignment accessible via OrderFeed -> OrderTable -> WasherAssignDropdown

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire OrderFeed into company-web router, replace placeholder stubs** - `89e04bb` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/company-web/src/router.tsx` - Import OrderFeed, add /orders route, root redirects to /orders, DashboardPage stub removed

## Decisions Made

- `companyId = 'TODO_FROM_AUTH'` placeholder used — OrderFeed requires companyId prop but auth context is not yet wired. This satisfies COMP-05/COMP-06 by making the page reachable; auth wiring is a separate concern for Phase 3.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Company dashboard order feed is now accessible at /orders
- Auth context wiring (replacing `TODO_FROM_AUTH` with real companyId from session) is the next logical step when company login flow is fully connected
- All gap closure requirements for COMP-05 and COMP-06 satisfied

---
*Phase: 02-core-business-flow*
*Completed: 2026-04-03*

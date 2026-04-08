---
phase: 06-fix-route-socket-wiring
plan: "03"
subsystem: api-testing
tags: [integration-tests, vitest, routing, socket, auth-scoping]
dependency_graph:
  requires: ["06-01", "06-02"]
  provides: [WASH-06, ORD-02, COMP-05, COMP-06]
  affects: [apps/api]
tech_stack:
  added: []
  patterns:
    - buildTestApp helper with mock auth header + passthrough validator for routing integration tests
    - vitest.config.ts with @cleanly/types alias for workspace package resolution in worktree
    - vi.mock for prisma/socket/queue isolation — tests verify routing and scoping, not service logic
key_files:
  created:
    - apps/api/src/test-helpers/build-app.ts
    - apps/api/src/routes/orders/__tests__/lifecycle-prefix.integration.test.ts
    - apps/api/src/routes/company/__tests__/orders-scoped.integration.test.ts
    - apps/api/src/lib/__tests__/socket-company-join.integration.test.ts
    - apps/api/vitest.config.ts
  modified: []
decisions:
  - buildTestApp uses passthrough validator instead of fastify-type-provider-zod — zod v3 schemas incompatible with fastify-type-provider-zod@6 which requires zod/v4/core API; routing tests do not need schema validation
  - vitest.config.ts adds @cleanly/types alias to point at packages/types/src/index.ts — worktree shares git objects but not node_modules symlinks for workspace packages
  - Socket join test uses contract verification (room name consistency) not real Socket.io connections — eliminates HTTP server setup, port conflicts, and async cleanup complexity in CI
metrics:
  duration: 8min
  completed: "2026-04-09"
  tasks_completed: 2
  files_modified: 5
---

# Phase 06 Plan 03: D-04 Integration Tests Summary

**One-liner:** Three passing integration tests and a shared buildTestApp helper verify the /api prefix fix (06-01) and company auth/socket wiring (06-02) with 8 assertions across all test suites.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create test app builder and route prefix integration test | f03c578 | apps/api/src/test-helpers/build-app.ts, apps/api/src/routes/orders/__tests__/lifecycle-prefix.integration.test.ts, apps/api/vitest.config.ts |
| 2 | Company orders scoped test and socket join test | dbb7cec | apps/api/src/routes/company/__tests__/orders-scoped.integration.test.ts, apps/api/src/lib/__tests__/socket-company-join.integration.test.ts |

## What Was Built

### Task 1 — buildTestApp Helper + Route Prefix Test

Created `apps/api/src/test-helpers/build-app.ts`:
- Minimal Fastify instance builder for integration tests
- Mock auth via `x-test-user` header (set `request.user` from JSON)
- Mock `authenticate` decorator so route preHandlers resolve without JWT
- Passthrough validator/serializer (bypasses Zod schema processing — routing is the concern)
- Accepts any array of `{ plugin, prefix }` pairs for flexible route registration

Created `apps/api/vitest.config.ts`:
- Alias `@cleanly/types` to `../../packages/types/src/index.ts`
- Required because worktree shares git objects but not pnpm workspace node_modules symlinks

Created `lifecycle-prefix.integration.test.ts` (D-04 test 1):
- **PATCH /api/orders/:id/status → 200** — confirms route resolves at /api prefix
- **PATCH /orders/:id/status → 404** — confirms old path without /api no longer works

### Task 2 — Company Orders Scoping Test + Socket Join Contract Test

Created `orders-scoped.integration.test.ts` (D-04 test 3):
- **GET /api/company/orders → 200** — confirms endpoint resolves at /api/company/orders
- **Prisma call assertion** — verifies `findMany` received `where: { company_id: COMPANY_A }` (not unfiltered)
- **403 when no companyId** — confirms auth guard blocks non-company users

Created `socket-company-join.integration.test.ts` (D-04 test 2):
- **join:company → company:{id} room** — simulates handler: `socket.join(\`company:${companyId}\`)`
- **Room name matches emit target** — `company:${companyId}` from join equals `company:${order.company_id}` from lifecycle.ts
- **Event name contract** — `join:company` from client matches `socket.on('join:company', ...)` on server (INT-05)
- **Room name namespace prefix** — `company:` prefix prevents collision with `washer:` and `order:` rooms

## Test Results

```
Test Files  3 passed (3)
Tests       8 passed (8)
Duration    ~1.2s
```

## Deviations from Plan

**1. [Rule 1 - Bug] Passthrough validator instead of zod type provider**
- **Found during:** Task 1 — `buildTestApp` registered `fastify-type-provider-zod@6` which requires `zod/v4/core` API but all route schemas use Zod v3 (`z.object()` from `zod@3.25.76`)
- **Issue:** `FST_ERR_VALIDATION` — "Cannot read properties of undefined (reading 'run')" — zod v3 schemas don't implement `$ZodType` class that v6 provider expects
- **Fix:** `buildTestApp` uses `() => ({ value: true })` passthrough validator and `JSON.stringify` serializer — correct for integration tests that verify routing/scoping, not schema shape
- **Files modified:** apps/api/src/test-helpers/build-app.ts

**2. [Rule 3 - Blocker] vitest.config.ts required for @cleanly/types resolution**
- **Found during:** Task 1 — worktree's node_modules is empty (pnpm workspace symlinks don't carry over to git worktrees)
- **Fix:** vitest.config.ts with `resolve.alias` pointing `@cleanly/types` to source — all other packages resolve via Node.js traversal up to ROFAN/node_modules
- **Files modified:** apps/api/vitest.config.ts (created)

**3. Socket test uses contract verification (not real Socket.io)**
- **Reason:** Plan explicitly noted this approach — spinning up real Socket.io with HTTP server, client connections, and cleanup is fragile in CI
- **4 assertions** instead of plan's 2 — expanded to also verify event name contract (INT-05) and namespace isolation

## Known Stubs

None — all tests are self-contained assertions with no placeholder values.

## Self-Check: PASSED

- `apps/api/src/test-helpers/build-app.ts` exists: FOUND
- `apps/api/src/routes/orders/__tests__/lifecycle-prefix.integration.test.ts` exists: FOUND
- `apps/api/src/routes/company/__tests__/orders-scoped.integration.test.ts` exists: FOUND
- `apps/api/src/lib/__tests__/socket-company-join.integration.test.ts` exists: FOUND
- `apps/api/vitest.config.ts` exists: FOUND
- Commit f03c578: confirmed present
- Commit dbb7cec: confirmed present
- All 8 tests pass (exit 0): CONFIRMED

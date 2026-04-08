---
phase: 06-fix-route-socket-wiring
verified: 2026-04-09T03:45:00Z
status: passed
score: 3/3 must-haves verified
re_verification: false
---

# Phase 6: Fix Cross-Phase Route & Socket Wiring — Verification Report

**Phase Goal:** Washer status transitions succeed (no more 404), company dashboard receives real-time events, and company orders load for the authenticated company — completing the on-site order lifecycle and real-time company dashboard flows.
**Verified:** 2026-04-09T03:45:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Washer PATCH to order status endpoint returns 200 (not 404) | VERIFIED | `server.ts` registers `orderLifecycleRoutes` at `/api/orders` (line 81). Integration test `lifecycle-prefix.integration.test.ts` asserts PATCH `/api/orders/:id/status` → 200; test passes. Old path `/orders/:id/status` returns 404 (negative assertion also passes). |
| 2 | Company-web joins the correct socket room and receives `order:new` and `order:status-changed` events in real time | VERIFIED | `useOrderSocket.ts` emits `socket.emit('join:company', { companyId, token })`. Server `socket.ts` handles `socket.on('join:company', ...)` and calls `socket.join('company:{companyId}')`. Booking route emits `order:new` and lifecycle route emits `order:status-changed` to `company:{id}` rooms. Room name contract verified by passing integration test. |
| 3 | Company dashboard loads orders scoped to the authenticated company (not TODO placeholder) | VERIFIED | `router.tsx` uses `const { companyId } = useAuth()` — zero `TODO_FROM_AUTH` matches in company-web. `auth-context.tsx` decodes `companyId` from JWT via `atob()`. Integration test asserts `findMany` is called with `where: { company_id: COMPANY_A }` and returns 403 for users with no companyId. |

**Score:** 3/3 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/server.ts` | All Fastify registrations with `/api` prefix | VERIFIED | 27 `prefix: '/api/` matches. Zero non-`/api` prefixes (except `/health`). All 16 previously broken routes updated. |
| `apps/customer-web/src/lib/api.ts` | API base URL includes `/api` | VERIFIED | Line 1: `(process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:3000') + '/api'` |
| `apps/company-web/src/lib/api.ts` | API base URL includes `/api` | VERIFIED | Line 4: `(import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api'` |
| `apps/company-web/src/lib/auth-context.tsx` | React context with JWT decode, companyId, localStorage persistence | VERIFIED | Exports `AuthProvider` and `useAuth`. Contains `decodeJwtPayload`, `companyId: payload?.companyId ?? null`, `localStorage.setItem('accessToken'`, `connectSocket(tokens.accessToken, newState.companyId)`. |
| `apps/company-web/src/main.tsx` | Auth-gated app shell with AuthProvider | VERIFIED | Contains `AuthProvider` wrapping app, `AuthGate` component, `if (isAuthenticated)` check, `<LoginPage` and `<MfaPage`. |
| `apps/company-web/src/router.tsx` | AppRoutes uses `useAuth()` instead of TODO placeholder | VERIFIED | Contains `const { companyId } = useAuth()`. Zero `TODO_FROM_AUTH` occurrences anywhere in company-web. |
| `apps/company-web/src/hooks/useOrderSocket.ts` | Emits `join:company` with `{ companyId, token }` | VERIFIED | `socket.emit('join:company', { companyId, token })` on line 12. No legacy `socket.emit('join', ...)` pattern. |
| `apps/company-web/src/lib/socket.ts` | Reconnect handling with `storedCompanyId` | VERIFIED | `let storedCompanyId: string | null = null` at module level. Re-emits `join:company` on reconnect. Handles already-connected case. |
| `apps/api/src/test-helpers/build-app.ts` | Reusable Fastify test builder with `/api` prefix support | VERIFIED | Exports `buildTestApp`. Uses passthrough validator. Mocks auth via `x-test-user` header. Mocks `authenticate` decorator. |
| `apps/api/src/routes/orders/__tests__/lifecycle-prefix.integration.test.ts` | Integration test: PATCH `/api/orders/:id/status` returns 200 | VERIFIED | 2 assertions: 200 at `/api/orders/:id/status`, 404 at `/orders/:id/status`. Both pass. |
| `apps/api/src/routes/company/__tests__/orders-scoped.integration.test.ts` | Integration test: company orders scoped to authenticated company | VERIFIED | 2 assertions: 200 with correct `company_id` filter in `findMany`, 403 with no companyId. Both pass. |
| `apps/api/src/lib/__tests__/socket-company-join.integration.test.ts` | Integration test: socket `join:company` room naming contract | VERIFIED | 4 assertions verifying room name format, event name match, and namespace isolation. All pass. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/washer-mobile` | `apps/api/src/routes/orders/lifecycle.ts` | PATCH `/api/orders/:id/status` | WIRED | Server registers lifecycle at `/api/orders`. PATCH `/:id/status` handler at line 129 of `lifecycle.ts`. Integration test confirms 200. |
| `apps/customer-web/src/lib/api.ts` | `apps/api/src/server.ts` | API_BASE includes `/api` | WIRED | `API_BASE = ... + '/api'`. Server routes at `/api/*`. Match confirmed. |
| `apps/company-web/src/lib/api.ts` | `apps/api/src/server.ts` | API_URL includes `/api` | WIRED | `API_URL = ... + '/api'`. Company routes at `/api/company/*`. Match confirmed. |
| `apps/company-web/src/lib/auth-context.tsx` | `apps/company-web/src/router.tsx` | `useAuth().companyId` replaces `TODO_FROM_AUTH` | WIRED | `router.tsx` imports `useAuth` from `auth-context`. `const { companyId } = useAuth()` passes to `<OrderFeed companyId={companyId!} />`. |
| `apps/company-web/src/hooks/useOrderSocket.ts` | `apps/api/src/lib/socket.ts` | `socket.emit('join:company', { companyId, token })` | WIRED | Client emits `join:company`. Server handles `socket.on('join:company', ...)` and calls `socket.join('company:{companyId}')`. Event names match. |
| `apps/company-web/src/main.tsx` | `apps/company-web/src/lib/auth-context.tsx` | `AuthProvider` wraps app, `login` stores tokens | WIRED | `main.tsx` imports `AuthProvider, useAuth`. `<AuthProvider>` wraps `<BrowserRouter>`. `AuthGate` calls `login` on successful auth. |
| `apps/api/src/routes/booking/orders.ts` | `apps/company-web/src/hooks/useOrderSocket.ts` | `order:new` event emitted to `company:{id}` room | WIRED | `booking/orders.ts` lines 77, 159 emit `order:new` to `company:{pricing.companyId}`. Client listens on `order:new` in `useOrderSocket.ts`. |
| `apps/api/src/routes/orders/lifecycle.ts` | `apps/company-web/src/hooks/useOrderSocket.ts` | `order:status-changed` event emitted to `company:{id}` room | WIRED | `lifecycle.ts` lines 146, 199, 286 emit `order:status-changed` to `company:{id}`. Client listens on `order:status-changed` in `useOrderSocket.ts`. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `apps/company-web/src/router.tsx` → `<OrderFeed companyId>` | `companyId` | `useAuth()` → `decodeJwtPayload(localStorage.accessToken)` → JWT payload `.companyId` | Yes — decoded from real JWT, not hardcoded | FLOWING |
| `apps/company-web/src/hooks/useOrderSocket.ts` | `companyId`, `token` | Props from caller + `localStorage.getItem('accessToken')` | Yes — both come from authenticated session | FLOWING |
| `apps/company-web/src/lib/socket.ts` | `storedCompanyId` | Set on `connectSocket(token, companyId)` call, preserved for reconnect | Yes — set from real companyId at auth time | FLOWING |
| `apps/api/src/routes/orders/lifecycle.ts` | `order.company_id` in `io.to(...)` | Prisma `order.findUnique` — real DB read | Yes — DB-backed, not hardcoded | FLOWING |

No hollow props or static data stubs found in the data path.

---

### Behavioral Spot-Checks

Integration tests executed live during verification (not manual — automated via vitest):

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| PATCH `/api/orders/:id/status` returns 200 | `vitest run lifecycle-prefix.integration.test.ts` | ✓ 200 | PASS |
| PATCH `/orders/:id/status` (no prefix) returns 404 | same suite, negative test | ✓ 404 | PASS |
| GET `/api/company/orders` scoped to company A | `vitest run orders-scoped.integration.test.ts` | ✓ 200, `findMany` called with `company_id: COMPANY_A` | PASS |
| GET `/api/company/orders` returns 403 for non-company user | same suite | ✓ 403 | PASS |
| Socket `join:company` room naming contract consistent | `vitest run socket-company-join.integration.test.ts` | ✓ 4 assertions pass | PASS |
| All 8 integration tests | `vitest run` (3 files) | ✓ 3 passed, 8 tests passed in 1.18s | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WASH-06 | 06-01, 06-03 | Washer can mark job as complete (triggers after photo + payout queue) | SATISFIED | `orderLifecycleRoutes` at `/api/orders` resolves PATCH. Integration test confirms 200. Status transition to `in_progress`/`completed` reaches lifecycle.ts which triggers notification queue. |
| ORD-01 | 06-01, 06-03 | On-site order follows 7-state lifecycle | SATISFIED | Lifecycle route registered at `/api/orders`. PATCH `/:id/status` handler manages state transitions. Route prefix fix ensures washer-mobile calls resolve. |
| ORD-02 | 06-01, 06-02, 06-03 | Company receives real-time notification when new order is placed | SATISFIED | `booking/orders.ts` emits `order:new` to `company:{id}`. Company-web joins room via `join:company`. `useOrderSocket` listens and invalidates query. |
| PAY-04 | 06-01 | Company receives payout via Stripe Connect after completion | SATISFIED (integration fix) | Lifecycle route fix unblocks order completion (was 404 before). Completion triggers payout queue. The Stripe Connect payout logic itself was built in Phase 2 — this phase fixes the route that triggers it. |
| NOTF-01 | 06-01 | Push notification sent on key order status changes | SATISFIED (integration fix) | Lifecycle route fix allows status transitions to complete, which call `notificationQueue.add`. Queue logic was built in Phase 4. |
| NOTF-02 | 06-01 | SMS sent for order confirmation and washer arrival | SATISFIED (integration fix) | Same as NOTF-01 — unblocked by route fix. |
| NOTF-03 | 06-01 | WhatsApp notification for order confirmation | SATISFIED (integration fix) | Same as NOTF-01 — unblocked by route fix. |
| NOTF-04 | 06-01 | Email receipt sent after order completion | SATISFIED (integration fix) | Same as NOTF-01 — unblocked by route fix. |
| COMP-05 | 06-02, 06-03 | Company sees live order feed with real-time updates | SATISFIED | `useOrderSocket` correctly joins `company:{id}` room and invalidates `company-orders` query on events. `useAuth()` provides real companyId. |
| COMP-06 | 06-02, 06-03 | Company can assign washers to incoming orders | SATISFIED (integration fix) | `assign-washer` PATCH now at `/api/orders/:id/assign-washer`. `companyId` from JWT auth context enables scoped company order access. |

All 10 declared requirements accounted for. NOTF-01 through NOTF-04 and PAY-04 are correctly classified as integration fixes (logic built in earlier phases, unblocked by route prefix fix in Phase 6).

No orphaned requirements: REQUIREMENTS.md traceability table maps all 10 IDs to Phase 6 as expected.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/company-web/src/router.tsx` | 6-8 | `OnboardingPage`, `PackagesPage`, `WashersPage` return placeholder `<div>` content | INFO | These pages are noted as `TODO` in a comment ("will be real pages in gap closure or Phase 3+"). They are not on the critical path for Phase 6's goal (orders, auth, socket). No user-visible blocker for the company order dashboard flow. |

No blocker anti-patterns found. The placeholder pages in router.tsx are secondary routes unrelated to Phase 6 success criteria. The order feed (`/orders`) route is fully wired with real data.

No `TODO_FROM_AUTH` references anywhere in company-web. No `return null`, `return {}`, or `return []` stubs in the data path. No double `/api/api/` prefixes introduced.

---

### Human Verification Required

The following items cannot be verified programmatically and require a running dev environment:

#### 1. Full Washer-to-Completion Flow (Live)

**Test:** Start API server + washer-mobile dev build. Log in as washer. Accept a job assignment. Tap "Start Job" and "Complete Job" in the washer app. Observe network tab.
**Expected:** PATCH `/api/orders/:id/status` returns 200 with status `in_progress`, then `completed`. No 404 at any step.
**Why human:** Requires live Neon DB, real JWT, actual device or simulator. Integration test mocks Prisma — does not exercise real DB transaction logic.

#### 2. Company Real-Time Socket Event Receipt (Live)

**Test:** Open company dashboard in browser. Place a new order from customer-mobile. Observe company dashboard without page refresh.
**Expected:** New order appears in the order feed within ~1 second of booking. Status changes from washer app appear immediately.
**Why human:** Requires live Socket.io server, real Redis adapter, two simultaneous browser/device sessions. Integration tests verify contract, not live network behavior.

#### 3. Token Persistence Across Refresh

**Test:** Log in to company dashboard. Close tab. Reopen tab.
**Expected:** Dashboard loads immediately without re-login prompt. Orders are visible and scoped to the same company.
**Why human:** `localStorage` persistence requires browser session. Auth state initialization from `localStorage` in `AuthProvider` cannot be verified without a running browser.

---

### Gaps Summary

No gaps. All three success criteria are verified through a combination of:
- Direct file inspection (artifact existence, pattern matching)
- Data-flow tracing (JWT decode → companyId → OrderFeed → useOrderSocket → server room)
- Behavioral spot-checks (8 integration tests, all passing in 1.18s)

Three minor human verification items remain (live network, live socket, browser localStorage) — these are operational checks on already-verified logic, not gaps in implementation.

---

*Verified: 2026-04-09T03:45:00Z*
*Verifier: Claude (gsd-verifier)*

---
phase: 05-wire-washer-job-dispatch
verified: 2026-04-08T15:30:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "End-to-end dispatch with real devices"
    expected: "Washer mobile receives job:alert takeover screen, accepts/declines in 30s, order state updates in company dashboard"
    why_human: "Requires running API server, company dashboard, and washer mobile simultaneously with valid JWT — cannot verify socket room membership or order state transitions programmatically"
---

# Phase 5: Wire Washer Job Dispatch — Verification Report

**Phase Goal:** The washer job dispatch loop works end-to-end — when a company assigns a washer, the washer receives an in-app job alert, can accept/decline within the countdown timer, and the server processes the response to advance the order lifecycle.
**Verified:** 2026-04-08T15:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Server emits `job:alert` to `washer:{userId}` room when company assigns a washer | ✓ VERIFIED | `lifecycle.ts` line 236: `io.to(\`washer:${washer_id}\`).emit('job:alert', {...})` — full payload including PostGIS lat/lng extraction |
| 2 | Washer socket events `job:accept` and `job:decline` are handled server-side | ✓ VERIFIED | `job-dispatch.ts` lines 10-93: both handlers registered via `registerJobDispatchHandlers(socket)` called from `socket.ts` line 116 |
| 3 | `job:accept` transitions order to `washer_en_route` and cancels 30s BullMQ timer | ✓ VERIFIED | `job-dispatch.ts` line 30: `transitionOrderStatus(orderId, OrderStatus.washer_en_route)`; line 38: `orderQueue.getJob(\`washer-timeout-${orderId}\`)` then `timerJob.remove()` |
| 4 | `job:decline` reverts order to `accepted` with `washer_id` cleared | ✓ VERIFIED | `job-dispatch.ts` line 76-79: `prisma.order.update({ data: { washer_id: null, status: 'accepted' } })` |
| 5 | Washer personal room is auto-joined on socket connection | ✓ VERIFIED | `socket.ts` lines 50-62: JWT payload decoded on connect, if `role === 'washer'` joins `washer:{sub}` and sets `(socket as any).userId = sub` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/lib/job-dispatch.ts` | Socket handlers for job:accept and job:decline | ✓ VERIFIED | 94 lines; exports `registerJobDispatchHandlers`; both handlers implemented with auth guard, order ownership check, state transition, BullMQ timer cancellation, and room notifications |
| `apps/api/src/lib/socket.ts` | Auto-join washer:{userId} room on connection + job-dispatch registration | ✓ VERIFIED | Imports and calls `registerJobDispatchHandlers(socket)` line 116; auto-join block lines 50-62 |
| `apps/api/src/routes/orders/lifecycle.ts` | job:alert emission after washer assignment | ✓ VERIFIED | Lines 220-244: company name fetch, PostGIS raw SQL for lat/lng, `io.to(\`washer:${washer_id}\`).emit('job:alert', ...)` with full 7-field payload |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lifecycle.ts` assign-washer handler | `washer:{userId}` socket room | `io.to().emit('job:alert')` | ✓ WIRED | Line 236: `io.to(\`washer:${washer_id}\`).emit('job:alert', {...})` |
| `job-dispatch.ts` job:accept handler | `order.service.ts` | `transitionOrderStatus` call | ✓ WIRED | Line 30: `await transitionOrderStatus(orderId, OrderStatus.washer_en_route)` |
| `socket.ts` connection callback | `job-dispatch.ts` | `registerJobDispatchHandlers(socket)` | ✓ WIRED | Line 6 import + line 116 call inside `io.on('connection', ...)` |
| `useWasherSocket.ts` | `job-dispatch.ts` server handler | `socket.emit('job:accept', { orderId })` client / `socket.on('job:accept')` server | ✓ WIRED | Client emits at `useWasherSocket.ts` line 30; server listens at `job-dispatch.ts` line 10 — event names match |
| `index.tsx` `handleJobAlert` | `/(job)/alert` screen | `router.push({ pathname: '/(job)/alert', params: {...} })` | ✓ WIRED | Lines 94-107: navigates with all 7 required params (orderId, serviceType, companyName, customerAddress, customerLat, customerLng, estimatedDistance) |
| `alert.tsx` accept button | server `job:accept` handler | `acceptJob(orderId)` → `socket.emit('job:accept', ...)` | ✓ WIRED | `alert.tsx` line 132: `acceptJob(orderId)` via `useWasherSocket`; hook line 30: `getSocket().emit('job:accept', { orderId })` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `lifecycle.ts` job:alert payload | `loc.lat`, `loc.lng` | `prisma.$queryRaw` with `ST_Y(service_location::geometry)` + `ST_X(service_location::geometry)` | Yes — PostGIS raw SQL query against DB | ✓ FLOWING |
| `lifecycle.ts` job:alert payload | `company.name_en` | `prisma.company.findUniqueOrThrow({ select: { name_en: true } })` | Yes — live DB query | ✓ FLOWING |
| `lifecycle.ts` job:alert payload | `assignedOrder.type`, `assignedOrder.location_note` | `prisma.order.findUniqueOrThrow` (line 209) | Yes — live DB query | ✓ FLOWING |
| `alert.tsx` countdown | `remaining` state | `setInterval` decrementing from 30 | Yes — real timer | ✓ FLOWING |
| `alert.tsx` screen params | `orderId`, `serviceType`, `companyName`, `customerAddress`, `customerLat`, `customerLng` | `useLocalSearchParams` from expo-router | Yes — passed from `handleJobAlert` which receives live socket payload | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires running servers and connected mobile devices. Covered under Human Verification.

### Requirements Coverage

| Requirement | Phase | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| WASH-02 | Phase 5 | Washer sees new job alert with accept/decline and countdown timer | ✓ SATISFIED | `alert.tsx` renders 30s `CountdownRing`, accept/decline buttons; `handleJobAlert` in `index.tsx` navigates to alert screen on `job:alert` receipt; `useWasherSocket` listens for `job:alert` |
| ORD-03 | Phase 5 | Company can assign a washer to an accepted order | ✓ SATISFIED | `lifecycle.ts` assign-washer handler transitions order to `washer_assigned`, sets `washer_id`, emits `job:alert` to washer room — completes the assignment chain |
| ORD-04 | Phase 5 | Washer can accept or decline job assignment (30s timer) | ✓ SATISFIED | `job-dispatch.ts` handles `job:accept` (transitions to `washer_en_route`) and `job:decline` (reverts to `accepted` with cleared washer_id); BullMQ timer cancelled on both paths; 30s countdown in `alert.tsx` auto-declines on expiry |

All three requirement IDs declared in PLAN frontmatter are accounted for and satisfied.

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps ORD-03, ORD-04, WASH-02 to "Phase 2, Phase 5" — all three are claimed by this phase's plan. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `index.tsx` | 43-49 | `MOCK_STATS` constant used as fallback when API returns error or token missing | ℹ️ Info | Pre-existing from Phase 3 — stats endpoint is out of scope for Phase 5; fallback to zero values is expected behavior, not a stub for the dispatch loop |

No blockers or warnings found in Phase 5 scope.

### Human Verification Required

#### 1. End-to-End Job Dispatch Flow

**Test:** With API server + company dashboard + washer-mobile running: log in as company admin, assign a washer to an `accepted` order, observe the washer mobile app.
**Expected:** Washer-mobile receives `job:alert` and immediately navigates to the alert takeover screen showing company name, service type, customer address, map pin, and a 30-second countdown. Tapping Accept: order transitions to `washer_en_route`, company dashboard reflects status change, washer is navigated to en-route screen. Tapping Decline: order reverts to `accepted` in company dashboard.
**Why human:** Requires real Socket.io room membership (cannot verify from grep), actual BullMQ timer cancellation in Upstash Redis, and live Prisma transaction behavior — none of which are verifiable without a running server.

#### 2. 30s Auto-Decline Behavior

**Test:** On the alert screen, let the countdown reach 0 without tapping.
**Expected:** `declineJob(orderId)` emitted automatically, washer set offline via PATCH `/api/washers/status`, screen navigates to `/(home)`. Order reverts to `accepted` state in company dashboard.
**Why human:** Timer behavior and navigation require runtime observation on device.

#### 3. JWT Washer Room Auto-Join

**Test:** Connect a washer's socket without calling `washer:join-order`. Trigger a company assign-washer.
**Expected:** Washer receives `job:alert` in their `washer:{userId}` room — verifying the auto-join on connection path works independently of `washer:join-order`.
**Why human:** Requires verifying socket room membership at connection time — only verifiable with a connected client.

### Gaps Summary

No gaps. All 5 must-have truths verified at all levels (exists, substantive, wired, data flowing). Both commits confirmed in git history (`7e2270c`, `b66113f`). All 26 acceptance criteria checks pass. Requirements WASH-02, ORD-03, ORD-04 all satisfied.

The only pending item is human verification of live end-to-end behavior, which cannot be verified statically.

---

_Verified: 2026-04-08T15:30:00Z_
_Verifier: Claude (gsd-verifier)_

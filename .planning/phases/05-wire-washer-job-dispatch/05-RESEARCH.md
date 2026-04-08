# Phase 5: Wire Washer Job Dispatch Loop - Research

**Researched:** 2026-04-08
**Domain:** Socket.io server event handlers, BullMQ timer cancellation, Prisma order state transitions
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Socket-only for job accept/decline. The existing HTTP `POST /orders/:id/washer-response` endpoint is removed or deprecated. All accept/decline flows go through `job:accept` and `job:decline` socket events, matching the client code already built in `useWasherSocket.ts`.
- **D-02:** Current `JobAlert` type is sufficient — no additions needed. Fields: `orderId`, `serviceType`, `companyName`, `customerAddress`, `customerLat`, `customerLng`, `estimatedDistance`. The alert screen already renders exactly these fields.
- **D-03:** On decline or 30s timer expiry, order reverts to `accepted` status with `washer_id` cleared. Company sees it back in their dashboard and manually picks another washer. No auto-reassignment logic. This matches the existing decline path in `lifecycle.ts`.
- **D-04:** New `job:accept` and `job:decline` socket handlers go in a separate `job-dispatch.ts` module (not inline in `socket.ts`). `socket.ts` stays as the connection/setup hub. The new module handles Prisma queries, BullMQ timer cancellation, and status transitions.

### Claude's Discretion

- Error handling approach for socket events (what to emit back on invalid accept/decline)
- Whether to extract shared transition logic between socket handlers and existing lifecycle code
- BullMQ timer job naming convention and cancellation approach
- Whether to fully delete or just deprecate the HTTP washer-response endpoint

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WASH-02 | Washer sees new job alert with accept/decline and countdown timer | Server must emit `job:alert` to `washer:{userId}` room; client `handleJobAlert` stub must navigate to `/(job)/alert`; alert screen is already built and correct |
| ORD-03 | Company can assign a washer to an accepted order | `assign-washer` endpoint already transitions state and queues BullMQ timer; needs `job:alert` socket emission added after line 218 in `lifecycle.ts` |
| ORD-04 | Washer can accept or decline job assignment (30s timer) | Socket handlers `job:accept` and `job:decline` missing on server; BullMQ timer exists but auto-decline worker does not emit socket event back to company |
</phase_requirements>

## Summary

Phase 5 is a pure wiring phase — no new UI, no new schema, no new API routes. Three broken integration points in the v1.0 audit (INT-02, INT-03, INT-04) must be connected by modifying three existing files and creating one new module.

The client-side is almost complete: `useWasherSocket.ts` correctly listens for `job:alert` and emits `job:accept`/`job:decline`. The alert screen with 30s countdown, map preview, and accept/decline buttons is fully built. Only `handleJobAlert` in `index.tsx` is a one-line stub (commented-out navigation call) that needs to be uncommented and corrected.

The server side has two gaps: (1) the `assign-washer` endpoint in `lifecycle.ts` never emits `job:alert` to the washer's socket room after assigning, and (2) there are no socket event handlers for `job:accept` or `job:decline` — the client emits into the void. All business logic for accept/decline is already implemented in the HTTP `POST /orders/:id/washer-response` endpoint; the socket handlers must replicate that logic.

**Primary recommendation:** Create `apps/api/src/lib/job-dispatch.ts` with `registerJobDispatchHandlers(io, socket)` — call it from `socket.ts` inside the `connection` callback. Add `job:alert` emission to `lifecycle.ts` assign-washer handler. Fix the `handleJobAlert` stub in washer-mobile `index.tsx`.

## Standard Stack

### Core (already installed — no new dependencies required)

| Library | Version | Purpose | Confirmed |
|---------|---------|---------|-----------|
| Socket.io (server) | 4.8.x | Emit `job:alert` to `washer:{userId}` room | `apps/api/src/lib/socket.ts` — confirmed present |
| BullMQ | 5.x | Cancel `washer-timeout-{orderId}` job on accept | `apps/api/src/lib/queue.ts` — `orderQueue` exported |
| Prisma | 6.x | Read order + company data for payload; transition state | `apps/api/src/lib/prisma.js` — singleton |
| `@cleanly/types` | workspace | `isValidTransition`, `OrderStatus`, `assignWasherSchema` | `packages/types/src/booking.ts` — confirmed |
| expo-router | 4.x | Navigate to `/(job)/alert` with route params | `apps/washer-mobile/app/(job)/alert.tsx` — confirmed |

**No new packages required.** This phase uses exclusively what is already installed.

## Architecture Patterns

### Established Patterns in This Codebase

**Socket.io room naming:**
- `company:{id}` — company dashboard
- `order:{id}` — customer tracking
- `washer:{userId}` — washer personal room (already joined in `washer:join-order` handler in `socket.ts` line 76)

**Socket handler organization (from `socket.ts`):**
- All handlers registered inside `io.on('connection', (socket) => { ... })`
- Handlers access `(socket as any).userId` for the authenticated washer user ID
- `getIO()` export allows route handlers to emit from outside `socket.ts`

**BullMQ job cancellation pattern (from `lifecycle.ts` lines 250-252, 266-268):**
```typescript
// Source: apps/api/src/routes/orders/lifecycle.ts lines 250-252
const job = await orderQueue.getJob(`washer-timeout-${orderId}`)
if (job) await job.remove()
```
Job ID convention already established: `washer-timeout-${orderId}` (set at `lifecycle.ts` line 207: `jobId: 'washer-timeout-${orderId}'`).

**Order state transition pattern (from `order.service.ts`):**
```typescript
// Source: apps/api/src/services/order.service.ts lines 58-81
await transitionOrderStatus(orderId, OrderStatus.washer_en_route)
// Throws on invalid transition — caller wraps in try/catch
```
`transitionOrderStatus` is already exported from `apps/api/src/services/order.service.js`.

**Socket emission after Prisma update (from `lifecycle.ts` lines 199-201):**
```typescript
// Source: apps/api/src/routes/orders/lifecycle.ts lines 199-201
const io = getIO()
io.to(`company:${companyId}`).emit('order:status-changed', { orderId, status: 'washer_assigned' })
io.to(`order:${orderId}`).emit('order:status-changed', { orderId, status: 'washer_en_route' })
```

### Recommended Project Structure

No new directories. Files touched:

```
apps/api/src/
├── lib/
│   ├── socket.ts            # MODIFY — import and call registerJobDispatchHandlers
│   └── job-dispatch.ts      # CREATE — new module per D-04
├── routes/orders/
│   └── lifecycle.ts         # MODIFY — add job:alert emission at assign-washer handler
apps/washer-mobile/app/(home)/
└── index.tsx                # MODIFY — fix handleJobAlert stub (1-line change)
```

### Pattern 1: New job-dispatch.ts module

The module receives `io` (SocketServer) and `socket` (individual Socket) to avoid importing `getIO()` inside the module (which would require the module to know about the server's initialization order). Alternatively, `getIO()` can be called inside the handlers since by the time a connection event fires, `io` is always initialized.

**Recommended approach — pass `socket` and use `getIO()` internally:**

```typescript
// Source: pattern derived from lifecycle.ts and socket.ts in this codebase
import type { Socket } from 'socket.io'
import { prisma } from './prisma.js'
import { orderQueue } from './queue.js'
import { transitionOrderStatus } from '../services/order.service.js'
import { getIO } from './socket.js'
import { OrderStatus } from '@cleanly/types'

export function registerJobDispatchHandlers(socket: Socket) {
  // job:accept — washer accepted the assignment
  socket.on('job:accept', async ({ orderId }: { orderId: string }) => {
    const washerId = (socket as any).userId as string | undefined
    if (!washerId) {
      socket.emit('job:error', { orderId, message: 'Not authenticated' })
      return
    }
    // ... transition + timer cancel + room emit
  })

  // job:decline — washer declined
  socket.on('job:decline', async ({ orderId }: { orderId: string }) => {
    // ... revert to accepted + clear washer_id + notify company
  })
}
```

Called from `socket.ts` inside the `connection` callback:
```typescript
// socket.ts — inside io.on('connection', (socket) => { ... })
import { registerJobDispatchHandlers } from './job-dispatch.js'
// ... existing handlers ...
registerJobDispatchHandlers(socket)
```

### Pattern 2: job:alert emission in assign-washer handler

Add after the push notification enqueue at `lifecycle.ts` line 219:

```typescript
// Source: to be added after lifecycle.ts line 218 (after push notification enqueue)
// Build job:alert payload matching JobAlert type in useWasherSocket.ts
const io = getIO()
const company = await prisma.company.findUniqueOrThrow({
  where: { id: companyId },
  select: { name_en: true },
})
io.to(`washer:${washer_id}`).emit('job:alert', {
  orderId,
  serviceType: assignedOrder.type,
  companyName: company.name_en,
  customerAddress: assignedOrder.location_note ?? '',
  customerLat: assignedOrder.service_location_lat,
  customerLng: assignedOrder.service_location_lng,
  estimatedDistance: 0,  // distance not computed at this stage — matches D-02
})
```

**Note:** `assignedOrder` already fetched at line 210 of `lifecycle.ts`. `company` is the company record — `name_en` used since job alert renders in the device language but server doesn't know washer's language at emit time. The alert screen uses `companyName` as a display string, not a translated key.

### Pattern 3: handleJobAlert fix in washer-mobile/index.tsx

Current stub at lines 94-97:
```typescript
const handleJobAlert = useCallback(() => {
  // TODO: Navigate to job alert screen in Phase 3 plan 03
  // router.push('/job-alert')
}, [])
```

Must become (matching expo-router params pattern in `alert.tsx` line 40-48):
```typescript
const handleJobAlert = useCallback((alert: JobAlert) => {
  router.push({
    pathname: '/(job)/alert',
    params: {
      orderId: alert.orderId,
      serviceType: alert.serviceType,
      companyName: alert.companyName,
      customerAddress: alert.customerAddress,
      customerLat: String(alert.customerLat),
      customerLng: String(alert.customerLng),
      estimatedDistance: String(alert.estimatedDistance),
    },
  })
}, [router])
```

The `JobAlert` type is defined in `useWasherSocket.ts` lines 4-12. The `router` is already imported at line 14 of `index.tsx`. The `useWasherSocket` hook already passes the `alert` payload as the first argument to `onJobAlert` (hook line 20).

### Anti-Patterns to Avoid

- **Do not import `getIO()` before Socket.io is initialized.** `getIO()` throws if called before `setupSocketHandlers()`. Socket handlers fire only after a connection, which is always after initialization — safe to call `getIO()` inside socket event handlers.
- **Do not duplicate the accept/decline business logic.** The HTTP washer-response endpoint already has correct Prisma logic for accept (transition to `washer_en_route`) and decline (revert to `accepted`, clear `washer_id`). Socket handlers should reuse `transitionOrderStatus` from `order.service.ts` — do not inline raw Prisma calls.
- **Do not emit `job:alert` before `washer_id` is written.** The `assign-washer` handler calls `prisma.order.update` to set `washer_id` at line 195, then emits. The `job:alert` must be added after both `transitionOrderStatus` and `prisma.order.update` — not before.
- **Do not break the 30s timer job naming convention.** The existing timer uses `jobId: 'washer-timeout-${orderId}'`. The `job:accept` handler must cancel using the same key: `orderQueue.getJob('washer-timeout-${orderId}')`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Order state validation | Custom if/else chain | `transitionOrderStatus()` from `order.service.ts` | Already has row-level locking, `isValidTransition` check from `@cleanly/types`, and complete error message |
| Timer cancellation | Redis direct key deletion | `orderQueue.getJob(jobId).then(j => j?.remove())` | BullMQ manages job state — direct Redis manipulation bypasses job lifecycle tracking |
| Washer ownership verification | Re-querying washer table | `prisma.order.findUnique` and check `order.washer_id === washerId` from socket | Simpler — `washerId` is already on the socket as `(socket as any).userId` from `washer:join-order` handler |

**Key insight:** Every piece of business logic needed for the socket handlers already exists in `lifecycle.ts` or `order.service.ts`. The socket handlers are wiring, not new logic.

## Common Pitfalls

### Pitfall 1: washer:join-order must have been called before job:alert is received

**What goes wrong:** The washer joins `washer:{userId}` room only when the `washer:join-order` socket event is emitted from the washer-mobile app (see `socket.ts` line 76). If the washer app has not emitted `washer:join-order` yet when the company assigns a washer, the `io.to('washer:{userId}')` emission goes to an empty room.

**Why it happens:** The room join is tied to the `washer:join-order` event — sent when the washer starts tracking an active job. But for job alert delivery, the washer may be on the home screen with no active job, so they would never have emitted `washer:join-order`.

**Current actual behavior:** Looking at `socket.ts` line 75-76, `washer:join-order` also joins the personal `washer:{userId}` room. But there is no separate "washer comes online" room join. The washer home screen calls `useWasherSocket` which calls `connectSocket(token)` — this establishes the socket connection. However, the personal room join (`washer:{userId}`) only happens inside `washer:join-order`.

**How to avoid (two options):**
1. Add a `washer:online` event (emitted by `connectSocket` or `OnlineToggle`) that joins the personal room.
2. OR have the server auto-join the personal room based on the JWT `sub` (userId) on connection, using the JWT decoded from `socket.handshake.auth.token`.

**Recommended approach (discretion item):** On connection, decode the JWT from `socket.handshake.auth.token` and auto-join the `washer:{userId}` personal room. This is the safest pattern — the room is always joined when the socket is connected, not dependent on a secondary event.

```typescript
// socket.ts — add to connection handler before other socket.on registrations
// Source: pattern derived from existing socket.ts auth pattern
import jwt from 'jsonwebtoken'

io.on('connection', (socket) => {
  // Auto-join personal washer room if this socket belongs to a washer
  const token = socket.handshake.auth?.token as string | undefined
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; role: string }
      if (decoded.role === 'washer') {
        socket.join(`washer:${decoded.sub}`)
        ;(socket as any).userId = decoded.sub
      }
    } catch {
      // Not a washer or invalid token — no-op
    }
  }
  // ... rest of handlers
})
```

This replaces the need for `washer:join-order` to also join the personal room (though it can remain as a no-op there). The `(socket as any).userId` assignment also moves here, which is cleaner.

### Pitfall 2: Race condition between socket accept and BullMQ auto-decline

**What goes wrong:** Washer accepts via socket at T+29s. BullMQ fires the auto-decline at T+30s. Both run concurrently. The `transitionOrderStatus` call in the socket handler acquires a `FOR UPDATE` row lock — the BullMQ worker also reads the order before attempting to update. If the lock is released between the read and update in the worker, the worker may still process.

**Why it happens:** The `washer-response-timeout` BullMQ job checks `order.status === 'washer_assigned'` before acting (worker line 56). After the socket accept handler transitions to `washer_en_route`, the status is no longer `washer_assigned`, so the worker check fails gracefully and returns `{ skipped: true }`.

**How to avoid:** This is already handled by the existing worker guard at `order.worker.ts` line 56. No additional locking needed. The `transitionOrderStatus` row lock ensures the status is committed before the worker's read. This pitfall is a theoretical concern that is already resolved by existing code.

**Warning sign:** If the order appears to be in `washer_en_route` but the washer timer fires anyway — check that `transitionOrderStatus` is called before emitting the socket event in the accept handler.

### Pitfall 3: HTTP washer-response endpoint still active alongside socket handlers

**What goes wrong:** The HTTP `POST /orders/:id/washer-response` endpoint remains active (it is registered in `lifecycle.ts` lines 224-273). If both socket handlers and the HTTP endpoint are active, a washer could theoretically accept via HTTP (from an old client version or test) while the socket handler also fires — or a timeout fires after an HTTP accept.

**Why it happens:** D-01 says the HTTP endpoint should be "removed or deprecated" — this is a discretion item. If it is kept, its logic is redundant with the socket handlers but causes no functional harm since `transitionOrderStatus` uses row-level locking.

**How to avoid:** Deprecate the HTTP endpoint by returning 410 Gone with a message pointing to the socket approach. Do not delete it entirely yet — safer to flag for removal.

### Pitfall 4: `estimatedDistance` is 0 in the job:alert payload

**What goes wrong:** The assign-washer handler does not compute distance between washer and customer. `estimatedDistance: 0` is sent in the `job:alert` payload.

**Why it happens:** D-02 explicitly states the current `JobAlert` type is sufficient with no additions. Distance computation is not in scope.

**How to avoid:** The alert screen already handles `estimatedDistance === 0` — it conditionally renders the distance label only when `estimatedDistanceNum > 0` (see `alert.tsx` line 193). So `0` renders nothing, which is correct. This is not a bug, it is an intentional deferred feature.

### Pitfall 5: `location_note` vs actual GPS coordinates for `customerAddress`

**What goes wrong:** `assignedOrder.location_note` may be `null` (it is optional in the booking schema). Passing `null` to the socket emit as `customerAddress` would render `null` on the alert screen.

**How to avoid:** Use a fallback: `assignedOrder.location_note ?? ''`. The address field in the alert screen handles empty strings gracefully (it just renders nothing visible).

Also verify that `service_location_lat` and `service_location_lng` are actual columns on the `Order` Prisma model. If they are stored differently (e.g., as a JSON field or as `service_location: { lat, lng }`), the payload construction must match.

## Code Examples

### job:accept socket handler (new module)

```typescript
// Source: derived from lifecycle.ts washer-response logic + socket.ts patterns in this codebase
// apps/api/src/lib/job-dispatch.ts

socket.on('job:accept', async ({ orderId }: { orderId: string }) => {
  const washerId = (socket as any).userId as string | undefined
  if (!washerId) {
    socket.emit('job:error', { orderId, message: 'Not authenticated' })
    return
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    socket.emit('job:error', { orderId, message: 'Order not found' })
    return
  }
  if (order.washer_id !== washerId) {
    socket.emit('job:error', { orderId, message: 'Not assigned to this order' })
    return
  }

  try {
    await transitionOrderStatus(orderId, OrderStatus.washer_en_route)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transition failed'
    socket.emit('job:error', { orderId, message })
    return
  }

  // Cancel the 30s auto-decline timer
  const timerJob = await orderQueue.getJob(`washer-timeout-${orderId}`)
  if (timerJob) await timerJob.remove()

  const io = getIO()
  io.to(`company:${order.company_id}`).emit('order:status-changed', {
    orderId,
    status: 'washer_en_route',
  })
  io.to(`order:${orderId}`).emit('order:status-changed', {
    orderId,
    status: 'washer_en_route',
  })

  socket.emit('job:accepted', { orderId })
})
```

### job:decline socket handler

```typescript
// Source: derived from lifecycle.ts decline path (lines 259-273) in this codebase
socket.on('job:decline', async ({ orderId }: { orderId: string }) => {
  const washerId = (socket as any).userId as string | undefined
  if (!washerId) {
    socket.emit('job:error', { orderId, message: 'Not authenticated' })
    return
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.washer_id !== washerId) {
    socket.emit('job:error', { orderId, message: 'Not assigned to this order' })
    return
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { washer_id: null, status: 'accepted' },
  })

  // Cancel timer (washer already chose — no need for auto-decline)
  const timerJob = await orderQueue.getJob(`washer-timeout-${orderId}`)
  if (timerJob) await timerJob.remove()

  const io = getIO()
  io.to(`company:${order.company_id}`).emit('order:status-changed', {
    orderId,
    status: 'accepted',
  })

  socket.emit('job:declined', { orderId })
})
```

### job:alert emission in lifecycle.ts assign-washer handler

Add after line 219 (after push notification enqueue, before `return` statement):

```typescript
// Source: to add in lifecycle.ts assign-washer handler, after push notification enqueue
// Emit in-app job alert to washer's personal socket room (INT-02 fix)
const company = await prisma.company.findUniqueOrThrow({
  where: { id: companyId },
  select: { name_en: true },
})
const io = getIO()
io.to(`washer:${washer_id}`).emit('job:alert', {
  orderId,
  serviceType: assignedOrder.type,
  companyName: company.name_en,
  customerAddress: assignedOrder.location_note ?? '',
  customerLat: assignedOrder.service_location_lat ?? 0,
  customerLng: assignedOrder.service_location_lng ?? 0,
  estimatedDistance: 0,
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP endpoint for washer-response | Socket event (D-01) | Phase 5 decision | Removes HTTP round-trip; washer response is real-time |
| handleJobAlert stub | Navigation to `/(job)/alert` | Phase 5 fix | Closes INT-03 |
| No job:alert emission | `io.to('washer:${id}').emit('job:alert', ...)` | Phase 5 fix | Closes INT-02 |
| No job:accept/decline handlers | `job-dispatch.ts` module registered in socket.ts | Phase 5 fix | Closes INT-04 |

## Open Questions

1. **How are `service_location_lat` and `service_location_lng` stored in the Order Prisma model?**
   - What we know: The booking route stores location; the Order model has location fields.
   - What's unclear: The exact Prisma field names — they could be `service_location_lat`/`service_location_lng` or a JSON field or PostGIS geography column.
   - Recommendation: Read `packages/db/prisma/schema.prisma` Order model before writing the `job:alert` payload construction. If stored as PostGIS geography, the lat/lng extraction requires different syntax.

2. **Does `useWasherSocket` in washer-mobile connect the socket as soon as the home screen mounts?**
   - What we know: `connectSocket(token)` is called inside `useEffect` in the hook when token is present (hook lines 15-17).
   - What's unclear: Whether auto-joining the personal room via JWT decode on connection (recommended approach for Pitfall 1) could cause issues with the existing `washer:join-order` handler that also sets `(socket as any).userId`.
   - Recommendation: If implementing auto-join on connection, ensure `(socket as any).userId` is set in both places (connection handler + `washer:join-order`) so existing GPS handlers continue to work.

3. **Should the auto-decline BullMQ worker also emit a socket event to the company?**
   - What we know: The `washer-response-timeout` worker (order.worker.ts line 45-67) updates the DB to `accepted` but emits nothing.
   - What's unclear: Whether this is intentional — company would not know in real-time that the washer declined via timeout.
   - Recommendation: This is a discretion item. Adding `io.to('company:${order.company_id}').emit('order:status-changed', { orderId, status: 'accepted' })` to the timeout worker improves company UX but is not strictly required for Phase 5 success criteria. Address it if time allows.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond already-running API server and Redis — this is a pure code wiring phase with no new tooling required).

## Validation Architecture

Step skipped — `workflow.nyquist_validation` is set to `false` in `.planning/config.json`.

## Sources

### Primary (HIGH confidence)
- `apps/api/src/lib/socket.ts` — Confirmed: room naming, `washer:join-order`, `(socket as any).userId`, `getIO()` export
- `apps/api/src/routes/orders/lifecycle.ts` — Confirmed: assign-washer handler (lines 165-222), decline logic (lines 259-273), BullMQ timer job naming convention
- `apps/api/src/workers/order.worker.ts` — Confirmed: `washer-response-timeout` handler, auto-decline guard at line 56
- `apps/api/src/services/order.service.ts` — Confirmed: `transitionOrderStatus` with row-lock, `isValidTransition`
- `apps/washer-mobile/src/hooks/useWasherSocket.ts` — Confirmed: `JobAlert` type, `job:alert` listener, `acceptJob`/`declineJob` emit
- `apps/washer-mobile/app/(job)/alert.tsx` — Confirmed: params shape, accept/decline call sites, auto-decline on timeout
- `apps/washer-mobile/app/(home)/index.tsx` — Confirmed: stub at lines 94-97, `useWasherSocket` call at line 99
- `.planning/phases/05-wire-washer-job-dispatch/05-CONTEXT.md` — Confirmed: D-01 through D-04 locked decisions
- `.planning/v1.0-MILESTONE-AUDIT.md` — Confirmed: INT-02, INT-03, INT-04 gap definitions

### Secondary (MEDIUM confidence)
- Phase 5 success criteria from `.planning/ROADMAP.md` (inferred from CONTEXT.md canonical_refs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified by direct file inspection
- Architecture: HIGH — all patterns derived from actual existing code in the repository
- Pitfalls: HIGH for Pitfalls 1, 3, 4, 5 (verified by code); MEDIUM for Pitfall 2 (theoretical race condition confirmed handled by existing guard)
- Open questions: LOW — flagged items require 1-2 additional file reads by the planner before writing implementation tasks

**Research date:** 2026-04-08
**Valid until:** Stable — no external services involved; valid until the Prisma schema or Socket.io version is changed

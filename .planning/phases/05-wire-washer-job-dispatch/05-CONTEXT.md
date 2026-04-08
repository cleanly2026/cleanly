# Phase 5: Wire Washer Job Dispatch Loop - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

When a company assigns a washer to an order, the server emits a `job:alert` socket event to the washer, the washer-mobile receives it and navigates to the existing job alert screen (30s countdown), and `job:accept`/`job:decline` socket events are handled server-side to advance or revert order state. This is a backend wiring phase — no new UI is built.

Gap Closure: Closes INT-02 (server never emits job:alert), INT-03 (client handleJobAlert is a stub), INT-04 (job:accept/decline have no server handlers) from v1.0 audit. Fixes Flow 3 (Washer Job Alert Dispatch).

Requirements: WASH-02, ORD-03, ORD-04

</domain>

<decisions>
## Implementation Decisions

### Accept/Decline Channel
- **D-01:** Socket-only for job accept/decline. The existing HTTP `POST /orders/:id/washer-response` endpoint is removed or deprecated. All accept/decline flows go through `job:accept` and `job:decline` socket events, matching the client code already built in `useWasherSocket.ts`.

### Job Alert Payload
- **D-02:** Current `JobAlert` type is sufficient — no additions needed. Fields: `orderId`, `serviceType`, `companyName`, `customerAddress`, `customerLat`, `customerLng`, `estimatedDistance`. The alert screen already renders exactly these fields.

### Decline & Reassignment
- **D-03:** On decline or 30s timer expiry, order reverts to `accepted` status with `washer_id` cleared. Company sees it back in their dashboard and manually picks another washer. No auto-reassignment logic. This matches the existing decline path in `lifecycle.ts`.

### Socket Handler Organization
- **D-04:** New `job:accept` and `job:decline` socket handlers go in a separate `job-dispatch.ts` module (not inline in `socket.ts`). `socket.ts` stays as the connection/setup hub. The new module handles Prisma queries, BullMQ timer cancellation, and status transitions.

### Claude's Discretion
- Error handling approach for socket events (what to emit back on invalid accept/decline)
- Whether to extract shared transition logic between socket handlers and existing lifecycle code
- BullMQ timer job naming convention and cancellation approach
- Whether to fully delete or just deprecate the HTTP washer-response endpoint

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Audit (Gap Source)
- `.planning/v1.0-MILESTONE-AUDIT.md` — Defines INT-02, INT-03, INT-04 gaps and Flow 3 breakdown

### Prior Phase Context
- `.planning/phases/03-real-time-washer-app/03-CONTEXT.md` — Phase 3 decisions on washer job flow (D-01 through D-03: full-screen takeover, in-app route preview, auto-decline on timeout sets washer offline)

### Requirements
- `.planning/REQUIREMENTS.md` — WASH-02 (job alert + accept/decline), ORD-03 (order state advancement), ORD-04 (timeout handling)

### Architecture
- `.planning/ROADMAP.md` — Phase 5 success criteria (3 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/washer-mobile/src/hooks/useWasherSocket.ts` — Client hook fully implemented: listens for `job:alert`, exports `acceptJob`/`declineJob` that emit socket events. **Ready to use, no changes needed.**
- `apps/washer-mobile/app/(job)/alert.tsx` — Full alert screen with 30s countdown, map preview, accept/decline buttons. **Ready to use, no changes needed.**
- `apps/washer-mobile/src/lib/socket.ts` — Socket.io client singleton with JWT auth. **Ready to use.**
- `apps/api/src/routes/orders/lifecycle.ts` lines 165-222 — Assign-washer endpoint already transitions order, queues 30s BullMQ timer, sends push notification. **Needs job:alert socket emission added.**
- `apps/api/src/lib/socket.ts` — Socket.io server with Redis adapter, room-based handlers. **Needs job-dispatch module registered.**
- `packages/types/src/booking.ts` — `assignWasherSchema` and `washerResponseSchema` Zod schemas.

### Established Patterns
- Socket.io: Room-based (`company:{id}`, `order:{id}`, `washer:{userId}`), JWT auth via `socket.auth.token`
- Order transitions: `isValidTransition()` from `@cleanly/types` validates state changes
- BullMQ: Order worker handles async side effects on state transitions
- Route organization: Domain-organized under `src/routes/{domain}/`

### Integration Points
- `apps/api/src/routes/orders/lifecycle.ts` — Add `io.to('washer:${washerId}').emit('job:alert', payload)` after washer assignment
- `apps/api/src/lib/socket.ts` — Import and register new `job-dispatch.ts` handlers in the connection callback
- `apps/washer-mobile/app/(home)/index.tsx` line 94-97 — Replace empty `handleJobAlert` stub with `router.push('/(job)/alert', { params })` navigation
- `apps/api/src/workers/order.worker.ts` — BullMQ 30s auto-decline timer job (already queued, may need handler wiring)

### What's Complete vs Missing
| Component | Status |
|-----------|--------|
| Client: useWasherSocket hook | COMPLETE |
| Client: Alert screen UI | COMPLETE |
| Client: handleJobAlert navigation | STUB — needs 1-line fix |
| Server: job:alert emission | MISSING |
| Server: job:accept handler | MISSING |
| Server: job:decline handler | MISSING |

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard socket wiring following established patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-wire-washer-job-dispatch*
*Context gathered: 2026-04-08*

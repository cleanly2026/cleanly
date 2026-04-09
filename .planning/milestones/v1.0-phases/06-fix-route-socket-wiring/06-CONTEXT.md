# Phase 6: Fix Cross-Phase Route & Socket Wiring - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix three integration bugs identified in the v1.0 milestone audit so the on-site order lifecycle and real-time company dashboard flows work end-to-end. No new UI — pure wiring fixes across washer-mobile, API server, and company-web.

Gap Closure: Closes INT-01 (route prefix 404), INT-05 (company socket join mismatch), and companyId TODO tech debt. Fixes Flow 1 (On-Site Order Lifecycle) and Flow 2 (Real-Time Company Dashboard).

Requirements: WASH-06, ORD-01, ORD-02, PAY-04, NOTF-01, NOTF-02, NOTF-03, NOTF-04, COMP-05, COMP-06

</domain>

<decisions>
## Implementation Decisions

### Route Prefix Fix (INT-01)
- **D-01:** Add `/api` prefix on the server side. Register all Fastify routes under an `/api` top-level prefix so all client calls to `/api/*` resolve correctly. Do NOT change client-side URLs — they are already correct with `/api` prefix. This is a single server-side change that fixes the mismatch for all apps.

### companyId Auth Wiring
- **D-02:** Decode companyId from the existing JWT token client-side. The company login already returns a JWT with a companyId claim — extract it and store in React context. Replace `'TODO_FROM_AUTH'` in `router.tsx` with the value from auth context. No new `/me` endpoint needed.

### Company Socket Join Fix (INT-05)
- **D-03:** Fix the socket join event name mismatch between company-web and API server so company-web successfully joins the `company:{id}` room and receives `order:new` and `order:status-changed` events.

### Verification Approach
- **D-04:** Write 3 targeted integration tests, one per fix:
  1. Washer PATCH to `/api/orders/:id/status` returns 200 (not 404)
  2. Company socket join receives `order:new` and `order:status-changed` events
  3. Company orders endpoint returns data scoped to the authenticated company (not all orders)

### Claude's Discretion
- Whether to wrap the `/api` prefix at the top-level Fastify register or per-route-group
- How to structure the JWT decode utility in company-web (inline vs shared hook)
- Socket join fix implementation details (which side to change)
- Integration test framework and file organization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Audit (Gap Source)
- `.planning/v1.0-MILESTONE-AUDIT.md` — Defines INT-01, INT-05 gaps and Flow 1/Flow 2 breakdowns

### API Server
- `apps/api/src/server.ts` — Route registration (line 81: orderLifecycleRoutes prefix)
- `apps/api/src/routes/orders/lifecycle.ts` — Order status transition endpoints
- `apps/api/src/lib/socket.ts` — Socket.io server setup, room join handlers

### Washer Mobile
- `apps/washer-mobile/src/components/OnlineToggle.tsx` — Client PATCH calls to order status

### Company Web
- `apps/company-web/src/router.tsx` — `companyId = 'TODO_FROM_AUTH'` placeholder (line 13)
- `apps/company-web/src/lib/socket.ts` — Socket.io client, join:company emit (line 27)

### Prior Phase Context
- `.planning/phases/05-wire-washer-job-dispatch/05-CONTEXT.md` — Phase 5 socket handler patterns, job-dispatch module organization
- `.planning/phases/03-real-time-washer-app/03-CONTEXT.md` — Phase 3 socket room conventions, washer app patterns

### Requirements
- `.planning/REQUIREMENTS.md` — WASH-06, ORD-01, ORD-02, COMP-05, COMP-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/lib/socket.ts` — Socket.io server with Redis adapter, room-based handlers. Needs event name fix for company join.
- `apps/company-web/src/lib/socket.ts` — Socket.io client singleton. Already emits `join:company` with companyId.
- `@cleanly/types` — `isValidTransition()` for order state validation, shared Zod schemas.
- Fastify `register()` with `prefix` option — established pattern for route grouping.

### Established Patterns
- Socket.io: Room-based (`company:{id}`, `order:{id}`, `washer:{userId}`), JWT auth via `socket.auth.token`
- Route organization: Domain-organized under `src/routes/{domain}/`
- Auth: JWT with role-based claims (customerId, companyId, washerId depending on role)
- Order transitions: Database-level locking via Prisma transactions

### Integration Points
- `apps/api/src/server.ts` — Add `/api` prefix wrapper around all route registrations
- `apps/company-web/src/router.tsx` — Replace TODO placeholder with JWT-decoded companyId from auth context
- `apps/api/src/lib/socket.ts` — Fix join event handler name to match client emission

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward bug fixes with clear audit trail from milestone audit.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-fix-route-socket-wiring*
*Context gathered: 2026-04-08*

# Phase 3: Real-Time & Washer App - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Washer receives job alerts, accepts/declines with a 30-second timer, navigates to customers, broadcasts live GPS location, uploads before/after photos via presigned R2 URLs, completes service checklists, and marks jobs done. Customer sees a live moving washer dot on their map during the entire service (on-site and carpet pickup/return). This phase delivers the washer mobile app (Expo) and customer-side live tracking UI.

Requirements: RT-01 through RT-05, PHO-01 through PHO-06, WASH-01 through WASH-06 (17 requirements total).

</domain>

<decisions>
## Implementation Decisions

### Washer Job Flow
- **D-01:** Job alert is a full-screen takeover — Uber/Careem-style. Entire screen becomes the job alert with a 30-second countdown ring, customer location preview, service details, and accept/decline buttons. Hard to miss.
- **D-02:** After accepting, show an in-app route preview (map with route/ETA) before a "Navigate" button launches Google Maps with customer coordinates. Washer sees what they're getting into before leaving.
- **D-03:** If the 30-second timer expires without accept/decline, the job auto-declines and reassigns to the next available washer. The timed-out washer is also set to offline status (they may be away from phone). Washer must manually go back online.

### GPS Tracking UX
- **D-04:** Customer tracking map shows: moving washer dot, estimated arrival time (updating live), and washer's first name + photo. Uber-style experience.
- **D-05:** During `in_progress` state (washer is cleaning on-site), the map is replaced by a service-in-progress status card showing: washer name, service type, elapsed time, and a progress indicator. Map is less useful when washer is stationary.
- **D-06:** Carpet pickup/return tracking uses the same live map experience as on-site orders, with different status labels ("Picking up your carpet" / "Delivering your carpet" instead of "En route to clean"). Consistent UX across both order types.

### Photo Evidence Flow
- **D-07:** Photo capture uses the device's native system camera. Washer takes photo, returns to app to review/confirm before uploading. Simpler approach leveraging native camera features. (R2 presigned upload client already exists in `apps/api/src/lib/r2.ts`.)
- **D-08:** Upload retry is automatic with background queuing. Upload queues locally, auto-retries when signal improves. Washer sees a progress indicator but can continue working — upload completes in background.
- **D-09:** Photo upload is a soft gate — washer gets prompted to upload before/after photos at the right moments, but can skip with a reason if needed. Company/admin can review incomplete evidence later. No hard blocking on poor signal.

### Washer App Overall
- **D-10:** Washer home screen is a card-based dashboard: today's earnings, jobs completed, next scheduled job, and an online/offline toggle. Map is secondary or absent. Info-dense view for washers waiting between jobs.
- **D-11:** Service checklist (WASH-05) is a single scrollable page with all checklist items as checkboxes. Washer checks off items as they go, then taps "Complete Job". Faster and more flexible than step-by-step screens.
- **D-12:** Job completion flow is sequential: after photo prompt → show completed checklist summary → washer confirms all done → order transitions to `completed`. Clean confirmation before finalizing.

### Claude's Discretion
- Map library choice for customer tracking (Google Maps, Mapbox, or react-native-maps)
- Socket.io room design for washer GPS broadcasting
- GPS broadcast interval tuning (5-10s as per RT-01)
- Redis caching strategy for washer locations (RT-05)
- Android Foreground Service implementation for background GPS (WASH-04)
- Checklist item definitions per service category
- ETA calculation approach (simple distance/speed vs routing API)
- Washer earnings calculation display logic
- Photo compression/resize before upload

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Blueprint & Architecture
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full v1 requirements with REQ-IDs for Phase 3 (RT-*, PHO-*, WASH-*)
- `.planning/ROADMAP.md` — Phase goals and success criteria

### Stack Research (from Phase 1)
- `.planning/research/STACK.md` — Verified tech stack with versions, rationale, alternatives
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, build order
- `.planning/research/PITFALLS.md` — 10 critical pitfalls with prevention strategies
- `.planning/research/CONTEXT7_VERIFIED.md` — Copy-paste-ready code patterns (Fastify, Prisma+Neon, Socket.io, Expo)

### Domain Research (from Phase 1)
- `.planning/research/FEATURES.md` — Feature landscape, both order lifecycles
- `.planning/research/SUMMARY.md` — Research synthesis with phase implications

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — DB schema decisions (order model, PostGIS geography, bilingual columns)
- `.planning/phases/02-core-business-flow/02-CONTEXT.md` — Booking flow, order lifecycle, company dashboard decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/lib/socket.ts` — Socket.io server initialized with company room + order tracking room. Needs extension for washer GPS rooms.
- `apps/api/src/lib/r2.ts` — R2 presigned URL generation ready to use. Supports direct client upload via `getSignedUploadUrl()`.
- `apps/api/src/routes/auth/washer.ts` — Washer OTP+PIN auth already working.
- `apps/api/src/routes/orders/lifecycle.ts` — Order state machine with `isValidTransition()` from `@cleanly/types`.
- `apps/api/src/workers/order.worker.ts` — BullMQ order worker for async side effects on state transitions.
- `packages/types/src/order.ts` — Shared order types and state enums.
- `packages/types/src/storage.ts` — Storage-related type contracts.

### Established Patterns
- Socket.io: Room-based with `join:company` and `join:order` events, JWT token passed for auth
- Auth: Fastify JWT plugin with role-based guards
- i18n: next-intl for web, i18next for Expo mobile apps
- API routes: Domain-organized under `src/routes/{domain}/`

### Integration Points
- `apps/washer-mobile/` — Expo app exists with bare scaffold (`_layout.tsx` + i18n). All screens to be built.
- `apps/customer-mobile/` — Same bare scaffold. Tracking map screen needed here.
- `apps/api/src/server.ts` — New routes for washer GPS, photo upload URLs, and checklist endpoints register here.
- Socket.io server needs new event handlers for washer location broadcasting.

</code_context>

<specifics>
## Specific Ideas

- Job alert UX should feel like Uber/Careem driver experience — full-screen takeover that's impossible to miss
- Customer tracking should show washer name + photo + live ETA — personal and informative
- During active cleaning, switch from map to status card — map adds no value when washer is stationary
- Carpet tracking uses identical UI to on-site — just different status labels. No separate flow.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-real-time-washer-app*
*Context gathered: 2026-04-03*

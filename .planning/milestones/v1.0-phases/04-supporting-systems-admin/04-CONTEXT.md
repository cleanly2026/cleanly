# Phase 4: Supporting Systems & Admin - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Customers and washers receive timely multi-channel notifications in their preferred language at every order lifecycle milestone. Platform admins can review company applications, manage disputes with photo evidence, issue full or partial refunds, and monitor the platform via an audit log. All 5 app surfaces are polished to private beta readiness — customer web + mobile and washer mobile are fully functional, company dashboard and admin panel are functional with acceptable rough edges.

Requirements: NOTF-01 through NOTF-05, ADM-01 through ADM-06 (11 requirements total).

</domain>

<decisions>
## Implementation Decisions

### Notification Channels & Triggers
- **D-01:** Full lifecycle coverage — all order state transitions trigger notifications. Events include: order confirmed, washer assigned, washer en route, washer arrived, service in progress, service completed, refund issued, carpet picked up, carpet ready for return, carpet out for delivery, carpet returned. ~10 customer-facing events.
- **D-02:** Tiered channel approach per event importance:
  - **Push notifications (Expo Push):** All events — always sent.
  - **SMS (Twilio) + WhatsApp (360dialog):** Critical events only — order confirmed, washer en route, service completed, refund issued.
  - **Email (Resend):** Receipt/invoice only — sent after order completion.
- **D-03:** WhatsApp templates designed and submitted for Meta approval during development. Bilingual templates (AR + EN) for each critical event. 360dialog account setup and template submission happens in parallel with code development.
- **D-04:** Both customers AND washers receive notifications. Washer notifications: new job assignment, job cancelled by customer, schedule changes. Push-only for washers (no SMS/WhatsApp/email for washers).
- **D-05:** All notifications sent in the recipient's preferred language (stored in user profile). BullMQ `notificationQueue` (already scaffolded) processes all notification jobs.

### Admin Panel UX & Layout
- **D-06:** Sidebar navigation — fixed left sidebar with sections: Dashboard, Companies, Orders, Disputes, Cities/Categories, Audit Log. Collapsible on mobile. Standard admin panel pattern.
- **D-07:** Dashboard landing page shows essential metrics only: today's orders, active washers, pending company reviews, open disputes. 4 stat cards + recent orders table. Minimal and actionable.
- **D-08:** Company review workflow: admin clicks pending company → full detail page (name, documents, cities, categories, Stripe Connect status) → approve or reject with reason field. Rejection reason sent to company via notification.
- **D-09:** Audit log: simple action + timestamp + admin user table. Filterable by action type and admin user. No before/after diff logging for beta.

### Refund & Dispute Handling
- **D-10:** Dispute is customer-initiated in-app. Customer taps "Report issue" on a completed order, selects a reason, optionally adds a note. Creates a dispute record for admin review.
- **D-11:** Admin dispute view: side-by-side photo viewer showing before and after photos, plus order details (customer, washer, company, timestamps, checklist status). Single scrollable dispute page.
- **D-12:** Admin can issue full refund or partial refund (custom amount + reason). Stripe refund API already implemented in `stripe.service.ts` — admin panel provides a UI to trigger it.
- **D-13:** Refund triggers: reverse Stripe transfer to company before issuing customer refund (PAY-06 already implemented). Audit log records refund action.

### Private Beta Readiness
- **D-14:** Beta priority: customer web + customer mobile and washer mobile must be rock-solid (full end-to-end flow). Company dashboard and admin panel functional but polish is acceptable.
- **D-15:** Full seed script for beta testing: 3 demo companies (each with packages, washers, different cities), sample orders in various states, test customer and washer accounts.
- **D-16:** Manual test checklist (not automated E2E) — written checklist a human follows to verify the full booking-to-completion flow across surfaces.
- **D-17:** Polish pass: add proper error boundaries, loading skeletons, and empty states across all screens that currently lack them.

### Claude's Discretion
- Notification template text/copy for each event and channel
- BullMQ worker architecture for notification dispatch (single worker or per-channel workers)
- Admin panel component library choice (reuse shadcn/ui from customer-web or admin-specific)
- Dispute reason categories/enum values
- Seed data specifics (company names, package details, pricing)
- Error boundary implementation pattern across surfaces
- Manual test checklist structure and coverage
- City/category management CRUD in admin panel

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Blueprint & Architecture
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full v1 requirements with REQ-IDs for Phase 4 (NOTF-*, ADM-*)
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
- `.planning/phases/01-foundation/01-CONTEXT.md` — DB schema decisions, auth strategy, bilingual columns
- `.planning/phases/02-core-business-flow/02-CONTEXT.md` — Booking flow, order lifecycle, payment decisions, company dashboard
- `.planning/phases/03-real-time-washer-app/03-CONTEXT.md` — GPS tracking, photo evidence, washer app decisions

### Existing Code (key files for Phase 4)
- `apps/api/src/queues/queues.ts` — BullMQ `notificationQueue` already scaffolded with retry config
- `apps/api/src/lib/r2.ts` — R2 presigned URL client (reuse for admin photo viewer)
- `apps/api/src/services/stripe.service.ts` — Stripe refund API already implemented
- `apps/api/src/lib/socket.ts` — Socket.io server for real-time events
- `apps/admin-web/` — Next.js app with locale routing and Google SSO auth (Phase 1)

### PDF Blueprints
- `Cleanly_Platform_Blueprint.pdf` — Pages 11-12: Notification matrix, WhatsApp template specs
- `Cleanly_Vibe_Coding_Guide.pdf` — Admin panel build guidance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/queues/queues.ts` — `notificationQueue` BullMQ queue already created with exponential backoff (3 attempts)
- `apps/api/src/lib/r2.ts` — R2 presigned URL generation for photo access (reuse in admin dispute viewer)
- `apps/api/src/services/stripe.service.ts` — Stripe refund + transfer reversal already implemented
- `apps/api/src/lib/socket.ts` — Socket.io server running, can emit real-time admin dashboard updates
- `apps/api/src/lib/redis.ts` — Redis client for caching (admin dashboard metrics)
- `apps/admin-web/` — Next.js app with `[locale]` routing, Google SSO auth pages already working

### Established Patterns
- BullMQ queue pattern: define queue in `queues.ts`, create worker in separate file, jobs dispatched from route handlers
- Prisma transaction pattern for state transitions (from Phase 2 order lifecycle)
- i18n pattern: `next-intl` for Next.js apps, `i18next` for Expo apps — all strings via translation keys
- shadcn/ui components in `packages/ui` — shared across web apps
- Zod validation on all API endpoints

### Integration Points
- Order state transition handlers (Phase 2) — add notification dispatch after each transition
- Admin auth middleware (Phase 1) — protect all admin API routes
- Company approval status field — already in Prisma schema, needs API route to update
- Socket.io rooms — admin dashboard can join an `admin:` room for real-time updates

</code_context>

<specifics>
## Specific Ideas

- WhatsApp template approval has 1-2 week lead time — start 360dialog account setup and template submission early in the phase
- State.md decision from pre-Phase 1: "Start 360dialog WhatsApp template approval now"
- Tiered notification approach specifically chosen to avoid notification fatigue and control Twilio/360dialog costs
- Customer-initiated disputes (not just admin-created) — "Report issue" button on completed orders

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-supporting-systems-admin*
*Context gathered: 2026-04-05*

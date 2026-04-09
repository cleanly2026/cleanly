# Phase 2: Core Business Flow - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Customer discovers cleaning companies by city and category, selects a package with add-ons, books either an on-site service (car wash/sofa) or a carpet pickup-return, pays via Stripe, and the order progresses through its complete lifecycle — including company acceptance, washer assignment, and Stripe Connect payout to the company. Company dashboard enables order management, washer assignment, and self-service onboarding.

Requirements: DISC-01 through DISC-05, BOOK-01 through BOOK-04, CARP-01 through CARP-05, PAY-01 through PAY-06 (wallet PAY-02 deferred), ORD-01 through ORD-06, COMP-01 through COMP-07 (33 requirements total, 32 active).

</domain>

<decisions>
## Implementation Decisions

### Discovery UX
- **D-01:** Service category selection uses 3 big visual cards with icons/illustrations on the home screen (car wash, carpet, sofa). Clean, obvious, tappable. Careem/Talabat-style service selection.
- **D-02:** Company listing cards are rich — logo, company name, star rating, review count, starting price, response time badge. One card per row in a scrollable list.
- **D-03:** GPS city detection fallback is a city picker dropdown modal/sheet with available cities. Customer taps their city, then sees filtered companies.
- **D-04:** Company profile page is a single scrollable page (no tabs) — header → packages → add-ons → reviews (show 3-5, "see all" link). Natural scroll flow.

### Booking Flow
- **D-05:** Booking is a single scrollable page — package → add-ons → location/time → summary → pay. Sticky bottom bar shows running total. No multi-step wizard.
- **D-06:** On-site location selection uses a draggable map pin (full-screen map, centered pin, reverse geocoding for address). Plus a text field for parking/access notes. Standard ride-hailing pattern.
- **D-07:** Carpet pickup time selection uses a date picker + 2-hour time slot grid (e.g., 9-11, 11-1, 1-3, 3-5). Company defines available slots. Estimated return date shown below.
- **D-08:** Add-ons presented as toggleable chips/cards — name, price, toggle to add. Running total updates instantly in the sticky bottom bar.

### Payment Experience
- **D-09:** Payment uses Stripe Payment Element (pre-built component handling card, Apple Pay, Google Pay). Minimal PCI scope. Stripe handles method adaptation automatically.
- **D-10:** Platform fee visible to customer as "service fee" line item — transparent breakdown: subtotal + service fee + total. Standard marketplace pattern.
- **D-11:** Payment failure shows inline error on the same screen ("Card declined — try another card"). Customer retries without losing booking details. Order stays pending until timeout.
- **D-12:** Wallet top-up (PAY-02) deferred to a future phase. Phase 2 is direct Stripe payments only.

### Company Dashboard
- **D-13:** Order feed is a data table with columns (order #, customer, service, status, time, amount) and status filter tabs across top (All / Pending / Active / Completed). Real-time row updates via Socket.io.
- **D-14:** Washer assignment via dropdown on order row — click "Assign", dropdown shows available washers (name + current status), select and confirm. Washer receives push notification.
- **D-15:** Full company onboarding in Phase 2 — bilingual profile setup, city coverage, package/add-on creation, and Stripe Connect onboarding. Companies fully self-serve.
- **D-16:** company-web i18n wired in Phase 2 — i18next set up from day 1, all new pages use translation keys. No English-only retrofit later.

### Order Lifecycle
- **D-17:** On-site order follows 7-state lifecycle: pending → accepted → washer_assigned → washer_en_route → in_progress → completed (+ cancelled). State transitions enforced by `isValidTransition()` from `@cleanly/types`.
- **D-18:** Carpet order follows 10-state lifecycle: pending → accepted → pickup_scheduled → picked_up → in_cleaning → ready_for_return → return_scheduled → out_for_return → returned → completed. Extension table `carpet_order_details` tracks carpet-specific data.
- **D-19:** Order state transitions use database-level locking (Prisma `$transaction` with row-level lock) to prevent race conditions on concurrent status updates.
- **D-20:** BullMQ `order-lifecycle` queue (already scaffolded) handles async side effects on state transitions — notifications, payout triggers, etc.

### Claude's Discretion
- TanStack Query setup pattern (QueryClient config, wrapper placement, hook conventions)
- API route organization (per-domain files vs single router)
- Stripe webhook verification implementation details
- Map library choice for location pin (Google Maps, Mapbox, or Leaflet)
- Company-web routing structure (react-router vs TanStack Router)
- Real-time update mechanism for company dashboard (Socket.io room design)
- Order timeout/cancellation policy implementation details
- Stripe Connect onboarding flow type (Standard vs Express vs Custom)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Blueprint & Architecture
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full v1 requirements with REQ-IDs for Phase 2 (DISC-*, BOOK-*, CARP-*, PAY-*, ORD-*, COMP-*)
- `.planning/ROADMAP.md` — Phase goals and success criteria

### Stack Research (from Phase 1)
- `.planning/research/STACK.md` — Verified tech stack with versions, rationale, alternatives
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, build order
- `.planning/research/PITFALLS.md` — 10 critical pitfalls with prevention strategies
- `.planning/research/CONTEXT7_VERIFIED.md` — Copy-paste-ready code patterns (Fastify, Prisma+Neon, Next.js i18n, Stripe Connect)

### Domain Research (from Phase 1)
- `.planning/research/FEATURES.md` — Feature landscape, both order lifecycles (7-state on-site + 10-state carpet)
- `.planning/research/SUMMARY.md` — Research synthesis with phase implications

### Phase 1 Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Foundation decisions (DB schema, auth, hosting, monorepo)

### PDF Blueprints (schema + security source of truth)
- `Cleanly_Platform_Blueprint.pdf` — Pages 5-8: Full 15-table database schema; Page 9: Order lifecycle states; Page 11: Security blueprint
- `Cleanly_Vibe_Coding_Guide.pdf` — Pages 5-6: CLAUDE.md templates; Pages 12-13: Build order

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Prisma schema** (`packages/db/schema.prisma`): All tables ready — Order, OrderItem, CarpetOrderDetails, Company, Package, AddOn, Review, City, CompanyService. Enums defined (OrderStatus, OrderType, ServiceCategory).
- **Type system** (`packages/types/src/order.ts`): `VALID_TRANSITIONS` state machine map + `isValidTransition()` helper. Zod schemas for order types.
- **Auth middleware** (`apps/api/src/plugins/auth.ts`): `fastify.authenticate` preHandler decorator. JWT payload typed as `{ sub, role, companyId }`.
- **R2 upload utils** (`apps/api/src/lib/r2.ts`): `getSignedUploadUrl()`, `buildPhotoKey()`, `getPublicUrl()` — ready for photo evidence.
- **BullMQ queues** (`apps/api/src/lib/queue.ts`): `notificationQueue` and `orderQueue` scaffolded with retry config. Workers need implementation.
- **Redis client** (`apps/api/src/lib/redis.ts`): ioredis singleton, ready for caching and rate limiting.
- **i18n package** (`packages/i18n`): `en.json` + `ar.json` with `getMessages(locale)`. Auth namespace populated. Phase 2 adds discovery/booking/order/payment/dashboard namespaces.
- **UI components** (`packages/ui`): AuthCard, OtpInput, PinInput, PhoneInput, LanguageToggle. Phase 2 builds new components for discovery/booking/dashboard.

### Established Patterns
- **API routes**: Fastify route files with Zod schema validation, per-route rate limiting, `preHandler: [fastify.authenticate]` for protected endpoints.
- **Prisma singleton**: `apps/api/src/lib/prisma.ts` — Neon serverless adapter, shared across routes.
- **Money convention**: All prices in fils (integer). No floats anywhere.
- **Bilingual columns**: `_en` / `_ar` column pairs. Both required at schema level.
- **Customer-web**: Next.js App Router, `[locale]` route prefix, `next-intl` for translations, Cairo font, RTL via `dir` attribute.
- **Company-web**: Vite SPA, React 19. Auth pages exist. i18n not yet wired (to be done in Phase 2 per D-16).

### Integration Points
- **New API routes** register under `apps/api/src/routes/` and get registered in `server.ts` with a prefix.
- **Customer-web pages** go under `apps/customer-web/app/[locale]/` following App Router conventions.
- **Company-web pages** go under `apps/company-web/src/pages/` (Vite SPA routing).
- **Shared types** export from `packages/types/src/index.ts`.
- **Translation keys** added to `packages/i18n/locales/en.json` and `ar.json`.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user selected all recommended approaches. Standard marketplace patterns throughout (Careem/Talabat-style category selection, Uber-style location pin, standard Stripe Payment Element integration).

</specifics>

<deferred>
## Deferred Ideas

- **Wallet top-up (PAY-02)**: Deferred from Phase 2. Direct Stripe payments only for now. Wallet adds complexity (top-up flow, balance checks, partial wallet+card combos) — ship core payment first.
- **Loyalty points and promo codes**: Already in v2 requirements (RET-01 through RET-06). Not Phase 2 scope.

</deferred>

---

*Phase: 02-core-business-flow*
*Context gathered: 2026-04-02*

# Project Research Summary

**Project:** Cleanly
**Domain:** On-demand cleaning services marketplace (Gulf region, bilingual AR/EN, 5 app surfaces)
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

Cleanly is a multi-role marketplace connecting customers with professional cleaning companies (car wash, carpet, sofa) across the UAE, with Arabic-first bilingual requirements and Gulf-specific operational constraints. Research confirms this is a well-understood category with validated technology choices and clearly documented failure modes. The recommended build approach is a Turborepo monorepo with a single Fastify API (modular monolith), two Expo mobile apps, two Next.js web apps, and one Vite dashboard — all sharing types, UI primitives, and i18n infrastructure from day one. The stack is 95% validated against the blueprint; the only required adjustments are using Upstash Redis on a Fixed Plan (not Pay-As-You-Go) to avoid BullMQ billing blowout and confirming Stripe Connect UAE onboarding requirements with Stripe directly before writing any payout code.

The most important architectural decision is building two distinct order state machines from the start — a 7-state machine for on-site services (car wash, sofa) and a 10-state machine for carpet pickup-and-return. These models share a booking interface but diverge completely in lifecycle, scheduling UX, and notification strategy. Attempting to extend the on-site lifecycle to cover carpet is a documented trap that creates data integrity problems and painful retrofitting. The second most important decision is RTL/Arabic infrastructure: it must be present in the first shared package, before any UI component is written. Every project in this domain that attempted to retrofit RTL after building in English reports 2-4 weeks of remediation work.

The top risks are: (1) Stripe Connect UAE requires manual company onboarding, not the self-serve Express flow assumed by most tutorials — this must be confirmed pre-development; (2) GPS background tracking on Android/iOS is unreliable in Expo managed workflow without a foreground service — requires production build testing on real devices with battery saver enabled; (3) order state race conditions (two washers accepting simultaneously) require PostgreSQL row-level locking from day one, not as a later fix. Solo developer scope creep across 5 surfaces is also called out explicitly as a launch killer — the critical path is customer + washer + company dashboard, in that order, with admin panel last.

---

## Key Findings

### Recommended Stack

The blueprint stack is sound and validated against current (2026) library versions and regional service availability. Fastify 5 on Node 20+ is the right API choice — 2-3x Express throughput with TypeScript-first design and native JSON Schema validation. Neon PostgreSQL (Bahrain region) with PostGIS covers geospatial proximity queries using the `geography` type (not `geometry`) with GIST indexes. The non-obvious but critical constraint is that Socket.io must run on a persistent process host (Fly.io Bahrain or Railway) — it cannot run on Vercel Serverless or any lambda, which also hosts the customer web app. Two separate deployment targets are required from the start.

WhatsApp via 360dialog is not optional for UAE — it has ~95% penetration and competitors treat it as table stakes. However, Meta requires template pre-approval through 360dialog, which takes 1-2 weeks. This process must begin before Phase 1 ships, not after.

**Core technologies:**
- **Fastify 5 + Node 20 LTS**: API server — 2-3x Express throughput, TypeScript-native, required for Socket.io persistent connections
- **Neon PostgreSQL (Bahrain) + PostGIS + Prisma 6**: Primary datastore — serverless Postgres, geospatial proximity queries, Bahrain region for Gulf latency
- **Upstash Redis (Fixed Plan $10/mo)**: Cache, BullMQ queues, Socket.io adapter — Fixed Plan mandatory to prevent BullMQ polling cost blowout
- **Socket.io 4.x**: Real-time GPS tracking and order state push — self-hosted, no Redis adapter needed until horizontal scaling
- **BullMQ 5.x**: Background jobs (notifications, payouts, photo processing) — persistent, retryable, separate worker dyno
- **Turborepo + pnpm**: Monorepo orchestration — remote cache, shared packages across 5 surfaces
- **Next.js 16 (App Router)**: Customer web + admin panel — SSR for SEO, server components
- **Vite + React**: Company dashboard — SPA only, 10-30x faster HMR than Next.js for data-heavy ops tool
- **Expo SDK 55 (New Architecture)**: Customer + washer mobile — EAS Build/Update for OTA without App Store wait
- **Stripe Connect (destination charges)**: Payments + company payouts — AED, Apple/Google Pay, 15-20% commission auto-deducted
- **Cloudflare R2**: Photo storage — zero egress fees vs S3's $0.09/GB
- **360dialog**: WhatsApp notifications — flat monthly fee, dominant notification channel in UAE
- **Twilio Verify**: Phone OTP — industry standard, UAE SMS reliable, pay-per-use
- **shadcn/ui + Tailwind 4**: Web UI components — RTL-compatible via Radix primitives, logical CSS properties throughout

### Expected Features

Research confirms two service models with fundamentally different feature sets that must be modeled separately from the database schema up.

**Must have (table stakes — v1 private beta):**
- Phone OTP auth (customers + washers) — standard Gulf onboarding pattern
- Company email + MFA auth — supply side login
- Service category browsing with GPS city detection — discovery and routing
- Company listings with ratings, pricing, availability — core marketplace
- Package + add-on selection with quantity support — value configuration, carpet needs item counts
- Stripe payment: card + Apple Pay + Google Pay + in-app wallet — cashless is expected
- On-site order lifecycle (7 states: PENDING → ACCEPTED → WASHER_ASSIGNED → EN_ROUTE → IN_PROGRESS → COMPLETED + CANCELLED)
- Carpet pickup-return lifecycle (10 states with PICKUP_SCHEDULED, PICKED_UP, IN_CLEANING, READY_FOR_RETURN, RETURN_SCHEDULED, OUT_FOR_RETURN, RETURNED phases)
- Real-time washer GPS tracking (Socket.io) — the customer "wow" moment
- Before/after photo evidence — quality signal, dispute reduction
- Per-category service checklists (washer app) — execution quality
- Customer reviews and ratings — trust for marketplace
- Company dashboard: order management + washer assignment — supply side must work
- Washer mobile app: job list, GPS broadcast, checklist, camera — execution tooling
- Push (Expo) + SMS (Twilio) + WhatsApp (360dialog) — all three required at launch for UAE
- Bilingual Arabic RTL + English — required day 1, not retrofittable
- Admin panel: company approval, order oversight, dispute handling — platform governance
- Stripe Connect payouts with 7-14 day delay — companies won't operate without transparent payment

**Should have (competitive differentiators — v1.x post-beta):**
- Loyalty points + wallet — repeat booking retention mechanism
- Promo codes + discount engine — customer acquisition tool
- Company analytics dashboard — platform stickiness, revenue visibility
- Preferred washer selection — available after first completed order with that washer
- Eco-friendly / verified badges — trust signals, low complexity

**Defer (v2+):**
- Subscriptions / recurring bookings — different payment logic, not ready until 500+ active customers
- AI pricing recommendations — needs 1,000+ orders of training data
- B2B fleet / corporate accounts — completely different sales motion
- Multi-region (KSA, Egypt) — after UAE unit economics positive
- Arabic chatbot support — after support volume justifies it

**Anti-features (deliberately exclude):**
- In-app chat — use WhatsApp deep-link with order reference instead
- Real-time availability calendar — stale data creates false expectations; use response-time metric instead
- Instant auto-dispatch — breaks marketplace trust model; keep company-accepts model
- Public reviews without order verification — fake review risk

### Architecture Approach

The recommended architecture is a modular monolith — a single Fastify API process with internally-separated service modules sharing one DB connection, one Redis connection, and one Socket.io server. This is the explicit consensus for below-10-developer teams in 2025. The 5 client surfaces (customer web, customer mobile, company web, washer mobile, admin web) communicate with the API via REST over HTTPS and WebSocket (WSS) over the same persistent process. BullMQ workers run in the same process for MVP and split to a separate worker dyno only when measured load demands it.

**Major components:**

1. **Fastify API (modular monolith)** — all business logic: auth, orders, payments, location, media, notifications; single deployable unit on Fly.io/Railway persistent host
2. **Order State Machine** — TypeScript transition table in `packages/types`, enforced server-side only with PostgreSQL `FOR UPDATE SKIP LOCKED` to prevent race conditions; two separate machines (on-site 7-state, carpet 10-state)
3. **Socket.io Server (embedded in Fastify)** — GPS location broadcast via Redis-backed rooms keyed by `orderId`; washer POSTs location to REST endpoint → Redis → broadcast to customer room
4. **BullMQ Workers** — async jobs per criticality queue: `payments` (1 retry, alert on fail), `notifications` (3 retries), `analytics` (best-effort)
5. **Presigned URL Media Flow** — API issues R2 presigned PUT URL → client uploads directly to R2 → client confirms to API; API never in byte-transfer path
6. **Stripe Connect (destination charges)** — PaymentIntent with `capture_method: manual` at booking, capture on completion, delayed transfer to company (7-14 days) with `transfer_reversal` on dispute
7. **Turborepo monorepo with shared packages** — `packages/db` (Prisma schema), `packages/types` (Zod + order state machines), `packages/i18n` (AR/EN from first component), `packages/ui` + `packages/ui-native` (separate for web/RN bundler compatibility)

### Critical Pitfalls

1. **Stripe Connect UAE requires manual company onboarding** — Express self-serve hosted onboarding does not work in UAE. Contact Stripe before writing any payout code; design company onboarding UI to accommodate pending activation; use `destination_charges` not `on_behalf_of`. Address in Phase 1.

2. **RTL/Arabic is non-retrofittable** — Every component using `marginLeft`/`marginRight` in React Native or `left`/`right` in CSS must be audited and rewritten. Use `marginStart`/`marginEnd` and logical CSS properties from the first line of UI code. Set up `packages/i18n` with Arabic keys (even placeholders) before building any component. Cost to retrofit: 2-4 weeks. Address in Phase 1 (Foundation).

3. **GPS background tracking fails on production devices** — Expo managed workflow GPS stops when app is backgrounded/killed on Android (manufacturer power-saving) and has 30s window on iOS. Requires Android Foreground Service (persistent notification), `react-native-background-geolocation`, and production build testing on real Samsung + iPhone with battery saver enabled. Never validate GPS in Expo Go only. Address in Phase 3.

4. **Order state race conditions require database-level locking** — Application-layer state transitions without `FOR UPDATE SKIP LOCKED` and a `version` column allow two washers to accept the same order simultaneously or a cancel and en_route to co-exist. Must be built into the state machine from day one. Address in Phase 2.

5. **BullMQ stalled jobs cause duplicate notifications and double Stripe transfers** — Workers that crash without graceful `SIGTERM` handling retry in-progress jobs. All Stripe calls need idempotency keys; all notification jobs need "already sent" DB checks; Redis `maxmemory-policy` must be `noeviction`. Address in Phase 2.

6. **Payout clawback on dispute** — Transferring funds immediately to company accounts means the platform absorbs full disputed amounts. Implement 7-14 day payout delay and `transfer_reversal` in refund flow. Address in Phase 2.

7. **Solo developer scope creep across 5 surfaces** — Critical path is: customer booking → washer execution → company acceptance. Admin panel and company analytics are monitoring tools. Build and fully test the critical path before any polish work on non-critical surfaces. Address in Phase 0 (planning).

---

## Implications for Roadmap

Based on combined research, the natural phase structure is driven by hard dependencies (auth before everything, order state machine before any transition endpoint, GPS infrastructure before washer app) and the critical pitfall warnings (RTL from Phase 1, Stripe Connect UAE validated before Phase 2 payout code, GPS production-tested in Phase 3 not later).

### Phase 1: Foundation — Monorepo, Database, Auth, RTL Infrastructure

**Rationale:** Everything else depends on auth being in place. RTL and i18n infrastructure must be established before any UI component is written — retrofitting is 2-4x more expensive. Prisma schema and connection patterns must be correct before services use them. This phase creates zero user-visible features but unblocks all subsequent work.

**Delivers:** Working monorepo scaffold, Neon DB with full schema (both order state machines modeled), auth endpoints for all 4 roles (customer OTP, washer OTP, company email/MFA, admin Google SSO), shared packages with RTL conventions enforced, Prisma singleton with pooled Neon connection

**Addresses:** Phone OTP auth, bilingual AR/EN setup, company auth

**Avoids:** RTL retrofit (Pitfall 3), Prisma connection exhaustion (Pitfall 8), wrong PostGIS type for GPS (geography not geometry)

**Research flag:** Standard patterns — well-documented Turborepo + Prisma + Fastify setup. Skip `/gsd:research-phase`.

**Pre-work:** Start 360dialog template approval process now (1-2 week lead time). Contact Stripe to confirm UAE Connect onboarding model.

---

### Phase 2: Core Business Flow — Company Onboarding, Orders, Payments

**Rationale:** The most complex business logic (two state machines, Stripe Connect with UAE-specific constraints, race condition prevention) must be built and verified before any real-time or notification layer is added on top. Order state machine correctness is the hardest thing to retrofit. Stripe Connect UAE constraints must be discovered and handled here, not after payout code is written.

**Delivers:** Company onboarding flow (profile, zones, packages), company web dashboard (functional, not polished), both order lifecycles (7-state on-site + 10-state carpet), Stripe PaymentIntent + manual capture + Connect transfer with payout delay, BullMQ workers with graceful shutdown and idempotency, first end-to-end test: customer books → company accepts → order completes → company paid

**Addresses:** Service category browsing + GPS filtering, company listings + ratings, package selection, both order lifecycles, Stripe payment (card + Apple/Google Pay), Stripe Connect payouts, company dashboard order management

**Avoids:** Stripe Connect UAE manual onboarding surprise (Pitfall 1), payout clawback on dispute (Pitfall 2), order race conditions (Pitfall 5), BullMQ stalled jobs (Pitfall 9)

**Research flag:** Needs `/gsd:research-phase` for Stripe Connect UAE — the manual onboarding flow is not well-documented publicly and requires Stripe support confirmation.

---

### Phase 3: Real-Time Layer — GPS Tracking, Washer App, Customer Mobile

**Rationale:** Real-time infrastructure depends on working orders from Phase 2. GPS architecture (Redis cache + Socket.io rooms) must be validated before building washer and customer mobile apps on top of it. Redis adapter must be in place before any production Socket.io deployment. GPS background tracking requires production build testing — must not be left for "later."

**Delivers:** Socket.io server with order/tracking namespaces and Redis adapter, Location Service (GPS POST → Redis TTL 60s → Socket.io room broadcast), washer mobile app (job list, GPS broadcast, checklist, foreground service notification), customer mobile app (booking, real-time tracking map with GPS-gap handling), production GPS tested on Samsung + iPhone with battery saver

**Addresses:** Real-time washer GPS tracking, washer mobile app, customer mobile app, per-category service checklists

**Avoids:** Socket.io single-instance trap (Pitfall 6), GPS background tracking failure (Pitfall 4)

**Research flag:** Needs `/gsd:research-phase` for `react-native-background-geolocation` integration — transistorsoft library setup, foreground service configuration, Expo managed workflow compatibility in SDK 55.

---

### Phase 4: Supporting Systems — Notifications, Photos, Reviews

**Rationale:** Notification fan-out and photo upload require the order lifecycle and real-time infrastructure from Phases 2-3 to be stable. Photo upload reliability (offline-first, retry, decouple from order completion) is its own architectural concern that warrants a dedicated phase. Before/after photos and reviews are table-stakes features but depend on orders existing.

**Delivers:** BullMQ notification queues (Expo Push + Twilio SMS + Resend email + 360dialog WhatsApp), presigned R2 upload flow with client-side retry and resume, before/after photo UI in washer mobile and customer order history, photo timeline in order history, customer reviews + ratings (post-completion only), washer photo checklist in-context during job (not post-completion)

**Addresses:** Push + SMS + WhatsApp notifications, before/after photo evidence, customer reviews and ratings, email notifications

**Avoids:** Photo upload failures leaving orders in limbo (Pitfall 7), 360dialog template approval delay (begin in Phase 1)

**Research flag:** Standard patterns for Expo Push + Twilio + Resend. Skip `/gsd:research-phase`. Cloudflare R2 presigned URL pattern is well-documented.

---

### Phase 5: Admin Panel, Polish, and Private Beta Readiness

**Rationale:** Admin panel is a monitoring tool, not a customer-facing product. It must be built after the core loop is working and generating real data to manage. Arabic RTL polish pass happens here — earlier phases use correct conventions but defer pixel-perfect Arabic typography. This phase ends with a shippable private beta.

**Delivers:** Admin web (Next.js): company approval, order oversight, dispute handling, platform config; Arabic RTL polish across all 5 surfaces (font selection — Cairo/Tajawal, bidirectional text, icon mirroring, number formatting); cancellation policy enforcement with UX (free window display, cancellation fee flow); company onboarding progressive reveal (don't gate all functionality on Stripe activation); private beta ready with all P1 features complete

**Addresses:** Admin panel platform oversight, verified company badges (basic), bilingual polish, cancellation and rescheduling UX

**Avoids:** Solo developer scope creep (Pitfall 10) — admin is explicitly last; RTL afterthought (conventions established Phase 1, fully tested here)

**Research flag:** Standard patterns. Skip `/gsd:research-phase`.

---

### Phase 6: Growth Features — Loyalty, Promos, Analytics (v1.x)

**Rationale:** These features require validated core loop and real user data. Loyalty points need payment flow working (Phase 2). Promo codes need Stripe integration stable. Company analytics need structured event data from completed orders — which is why FEATURES.md explicitly calls out emitting structured order events from Phase 2 even if the dashboard isn't built yet.

**Delivers:** Loyalty points + wallet (earned per order, redeemable at checkout), promo code + discount engine (fixed/percentage/minimum-order, expiry), company analytics dashboard (revenue, order volume, rating trends, washer performance), preferred washer selection (after first completed order with washer), eco-friendly/verified badges with filter option

**Addresses:** Loyalty + wallet, promo codes, company analytics, preferred washer, badges

**Avoids:** Building before core loop validated (Pitfall 10)

**Research flag:** May benefit from `/gsd:research-phase` for loyalty points + wallet implementation patterns (idempotency with order completion, redemption at Stripe checkout) if not well-covered in blueprint.

---

### Phase Ordering Rationale

- **Auth before everything:** No other endpoint can be built or tested without role-aware JWTs. Phase 1 creates this dependency resolver.
- **Both order state machines in Phase 1 schema, built in Phase 2:** Carpet and on-site lifecycles must be modeled as separate entities in the DB from the start (FEATURES.md explicit warning). Schema changes after Phase 3 real-time is built are high-friction.
- **GPS infrastructure before mobile apps:** Washer and customer mobile apps are built on top of the real-time layer — they cannot be built in parallel without a working Socket.io infrastructure to develop against.
- **Notifications after order lifecycle:** The notification fan-out pattern depends on order state events. Building notifications before orders are stable creates integration instability.
- **Admin panel last:** It manages existing data — no data means nothing to manage. Solo dev scope creep (Pitfall 10) is the most likely launch killer; explicit sequencing enforces the right build order.
- **Structured order events from Phase 2:** Even though analytics dashboard is Phase 6, FEATURES.md flags that analytics requires clean event data from Phase 2 onwards. The event emission pattern must be in the order service from the start.

### Research Flags

**Needs `/gsd:research-phase` during planning:**
- **Phase 2 (Stripe Connect UAE):** Manual onboarding flow, `destination_charges` vs `on_behalf_of` restrictions, UAE-specific account capabilities — not well-documented publicly, requires Stripe support confirmation
- **Phase 3 (GPS background tracking):** `react-native-background-geolocation` (transistorsoft) setup, Android Foreground Service configuration, Expo SDK 55 managed workflow compatibility
- **Phase 6 (Loyalty wallet + Stripe):** Idempotency for point award on payment completion, redemption applied as Stripe discount vs wallet pre-charge deduction

**Standard patterns — skip `/gsd:research-phase`:**
- **Phase 1 (Turborepo + Fastify + Prisma + Auth):** Extensively documented, well-established patterns, blueprint already has Zooli.ai experience
- **Phase 4 (Notifications + R2 photos):** Expo Push, Twilio, Resend, and R2 presigned URL patterns are straightforward and well-documented
- **Phase 5 (Admin panel + RTL polish):** shadcn/ui RTL is handled by Radix primitives; Cairo/Tajawal font integration is standard

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Blueprint 95% validated; version numbers confirmed via official docs and WebSearch; two specific adjustments (Upstash Fixed Plan, Drizzle alternative) have authoritative source citations |
| Features | MEDIUM-HIGH | UAE competitors (Justlife, Matic, ServiceMarket) analyzed; carpet pickup-return model inferred from analogous laundry/dry-cleaning software since no public Gulf carpet marketplace with this exact model was found as a reference |
| Architecture | HIGH | Multiple production references (Uber/Lyft GPS, Stripe Connect marketplaces, Socket.io scaling); patterns verified against current library documentation |
| Pitfalls | HIGH | Most pitfalls have authoritative sources (Stripe UAE support page, Expo background task guides, React Native RTL blog, BullMQ stalled job docs); Stripe Connect UAE restrictions verified against Stripe support documentation specifically |

**Overall confidence:** HIGH

### Gaps to Address

- **Stripe Connect UAE current state:** The exact onboarding flow for UAE company accounts in 2026 must be confirmed directly with Stripe before Phase 2 design. Research found the restriction is documented but the current workaround path may have changed.
- **Carpet pickup-return competitor precedent:** No direct UAE competitor was found publicly offering the carpet model with explicit return-date scheduling. The 10-state lifecycle is inferred from analogous laundry/dry-cleaning software (CleanCloud, Jobber). The UX should be validated with even 2-3 real carpet cleaning companies before Phase 2 build.
- **360dialog pricing and template approval timeline:** Flat $50/number/month pricing confirmed; 1-2 week template approval confirmed. Actual template approval rate for first-time UAE accounts needs validation by registering the account before Phase 1 ships.
- **Neon Bahrain region availability:** Confirmed as of research date; should be re-verified at project init since regional availability can change.

---

## Sources

### Primary (HIGH confidence)
- Stripe Connect UAE availability — `support.stripe.com/questions/connect-availability-in-the-uae`
- Neon PostgreSQL docs (PostGIS, PgBouncer, Prisma guide) — `neon.com/docs`
- Fastify official docs — `fastify.dev` (v5.8.4, Node 20+ requirement)
- Socket.io docs v4 — single server Redis adapter guidance
- Upstash docs (BullMQ integration, Fixed Plan recommendation)
- Expo changelog SDK 52-55 — push notifications require dev builds
- Cloudflare R2 docs (presigned URLs, zero egress)
- React Native RTL support docs — `reactnative.dev/blog/2016/08/19/right-to-left-support-for-react-native-apps`
- BullMQ stalled jobs docs — `docs.bullmq.io/guide/workers/stalled-jobs`

### Secondary (MEDIUM confidence)
- Justlife, Matic, ServiceMarket app feature analysis (Property Finder, DXB Apps, MENAbytes)
- Monolith vs microservices 2025 framework analysis
- Turborepo + React Native + Next.js production guide (2025)
- Stripe Connect for marketplaces — lessons from multi-vendor flow
- GPS background tracking without timeout — React Native guide
- CleanCloud pickup-and-delivery, Jobber carpet cleaning software (carpet lifecycle reference)

### Tertiary (LOW confidence — validate during implementation)
- 360dialog pricing model (flat $50/number) — single provider source, confirm at account registration
- Neon Bahrain region current availability — confirm at project init
- Stripe Connect UAE current manual onboarding path — confirm with Stripe support before Phase 2

---

*Research completed: 2026-03-31*
*Ready for roadmap: yes*

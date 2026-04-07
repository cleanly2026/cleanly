---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-08-PLAN.md -- gap closure (rejection email + dashboard stats)
last_updated: "2026-04-06T01:56:36.549Z"
last_activity: 2026-04-06 -- Phase 03 execution started
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 41
  completed_plans: 40
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** A customer can book a cleaning service, pay securely, and track their washer arriving in real-time — the full end-to-end booking-to-completion flow must work flawlessly.
**Current focus:** Phase 03 — real-time-washer-app

## Current Position

Phase: 03 (real-time-washer-app) — EXECUTING
Plan: 1 of 9
Status: Executing Phase 03
Last activity: 2026-04-07 - Completed quick task 260408-0ki: Fix i18n gap in washer-mobile

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation P01 | 5 | 2 tasks | 23 files |
| Phase 01 P03 | 120 | 2 tasks | 9 files |
| Phase 01-foundation P04 | 2min | 2 tasks | 5 files |
| Phase 01-foundation P05 | 11min | 2 tasks | 12 files |
| Phase 01-foundation P06 | 5min | 2 tasks | 8 files |
| Phase 01-foundation P07 | 10min | 2 tasks | 8 files |
| Phase 01-foundation P09 | 5 | 1 tasks | 5 files |
| Phase 01-foundation P08 | 7min | 2 tasks | 18 files |
| Phase 01-foundation P10 | 7min | 2 tasks | 13 files |
| Phase 01-foundation P11 | 2min | 2 tasks | 8 files |
| Phase 02 P01 | 10min | 2 tasks | 8 files |
| Phase 02 P09 | 4min | 2 tasks | 14 files |
| Phase 02 P02 | 15min | 2 tasks | 11 files |
| Phase 02-core-business-flow P12 | 3min | 1 tasks | 1 files |
| Phase 02-core-business-flow P11 | 5 | 1 tasks | 1 files |
| Phase 02 P10 | 3min | 1 tasks | 3 files |
| Phase 03-real-time-washer-app P03 | 2 | 2 tasks | 6 files |
| Phase 03 P08 | 3min | 2 tasks | 8 files |
| Phase 03 P09 | 3min | 1 tasks | 2 files |
| Phase 04-supporting-systems-admin P01 | 12min | 2 tasks | 10 files |
| Phase 04 P02 | 7min | 2 tasks | 10 files |
| Phase 04 P06 | 5min | 2 tasks | 5 files |
| Phase 04-supporting-systems-admin P04 | 25min | 2 tasks | 12 files |
| Phase 04-supporting-systems-admin P03 | 7min | 2 tasks | 9 files |
| Phase 04-supporting-systems-admin P05 | 6min | 2 tasks | 8 files |
| Phase 04-supporting-systems-admin P07 | 1min | 2 tasks | 3 files |
| Phase 04 P08 | 1min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Pre-Phase 1: Start 360dialog WhatsApp template approval now — 1-2 week lead time required before Phase 4 ships
- Pre-Phase 1: Confirm Stripe Connect UAE manual onboarding flow with Stripe support before writing any payout code in Phase 2
- Pre-Phase 1: Upstash Redis must use Fixed Plan ($10/mo) — Pay-As-You-Go causes BullMQ polling cost blowout
- Pre-Phase 1: Two separate order state machines from day one — 7-state on-site and 10-state carpet; do not merge
- [Phase 01-foundation]: node-linker=hoisted in .npmrc required for Expo SDK 55 + pnpm native module resolution
- [Phase 01-foundation]: apps/company-web uses Vite (not Next.js) — authenticated SPA with no SEO need, 10x faster HMR for ops dashboard
- [Phase 01]: Sentry DSN conditional init: warn + return (never crash) if DSN missing — allows CI to pass without Sentry account configured
- [Phase 01]: TURBO_TOKEN/TURBO_TEAM are optional CI secrets — CI works without them (local cache only), remote cache enabled when Vercel account configured
- [Phase 01-foundation]: Prisma client output to generated/client directory for monorepo isolation
- [Phase 01-foundation]: PostGIS GIST indexes managed via idempotent SQL postmigrate script, not Prisma migrations (Prisma drops custom indexes)
- [Phase 01-foundation]: Used fastify-type-provider-zod (community package) — @fastify/type-provider-zod does not exist on npm
- [Phase 01-foundation]: ioredis default import pattern for ESM compatibility in Fastify server
- [Phase 01-foundation]: Refresh token stored as bcrypt hash in Redis at rt:{userId} — single token per user, enables instant revocation
- [Phase 01-foundation]: Rate limit keyGenerator uses req.body.phone not req.ip — prevents distributed OTP attacks while allowing shared IPs
- [Phase 01-foundation]: washer.ts uses findFirst not findUnique — role is not part of phone unique constraint
- [Phase 01-foundation]: otplib v13.4.0 used for TOTP instead of speakeasy (unmaintained since 2019)
- [Phase 01-foundation]: HMAC-SHA256 exchange pattern bridges Auth.js Google session to Fastify JWT without leaking session tokens
- [Phase 01-foundation]: Pre-MFA session token (5min TTL, single-use Redis key) prevents TOTP replay attacks for company admin login
- [Phase 01-foundation]: R2 client uses PutObjectCommand presigned URLs (not proxied): client uploads directly to R2 per PHO-05, 60s TTL prevents abuse
- [Phase 01-foundation]: buildPhotoKey pattern orders/{orderId}/{photoType}/{timestamp}.{ext} covers all 4 Phase 3 photo types (before/after/pickup/return for carpet model)
- [Phase 01-foundation]: next-intl localePrefix: 'always' — explicit /en and /ar URLs for SEO and locale clarity
- [Phase 01-foundation]: admin-web middleware chains intlMiddleware with auth.js guard — locale routing and auth both preserved without conflict
- [Phase 01-foundation]: pnpm overrides align react/react-dom at 19.2.0 across monorepo — fixes version mismatch that broke Vitest
- [Phase 01-foundation]: dir=ltr on OtpInput container: digit boxes always LTR even in Arabic RTL mode per UI-SPEC
- [Phase 01-foundation]: PinInput is a 3-line wrapper over OtpInput with masked=true — avoids duplicating OTP logic
- [Phase 01-foundation]: Company web uses hardcoded English strings for Phase 1 scaffold -- i18next wired in Phase 2
- [Phase 02]: carpet_lead_time_days stored on Company model (not global config) — per-company configurability required by CARP-03
- [Phase 02]: Zod schemas organized by domain (discovery, booking, company) not by HTTP method — matches downstream plan naming conventions
- [Phase 02-09]: order_number derived as CLN-{id.slice(0,8)} — Order model has no order_number column in schema
- [Phase 02-09]: Washers queried as User.role='washer' (no separate Washer model) — company_id links washers to company
- [Phase 02-09]: amount_total field name (not total_amount) — aligned to actual Prisma schema
- [Phase 02-02]: fastify-raw-body v5 used (not @fastify/rawbody — that package does not exist on npm)
- [Phase 02-02]: Socket autoConnect=false in company-web — connectSocket() called explicitly after auth
- [Phase 02-02]: Socket rooms pattern: company:{id} and order:{id} — established for all downstream plans
- [Phase 02-05]: bcryptjs used for washer PIN hashing (bcryptjs is installed package, not bare bcrypt)
- [Phase 02-05]: stripe.service.ts created with all Plan 04 functions (createPaymentIntent, createRefund, createAccountLink, createConnectAccount) — Plan 04 had not yet executed when 02-05 ran
- [Phase 02-05]: Stripe Connect UAE returns pending_activation — UAE Express accounts require manual Stripe verification; company features NOT blocked on Connect status
- [Phase 02-05]: Washer deactivation sets company_id to null — removes from company roster without deleting user account/history
- [Phase 02-05]: Company services update uses delete-then-recreate transaction — simpler than diffing for category list replacement
- [Phase 02-core-business-flow]: router.tsx uses companyId = 'TODO_FROM_AUTH' placeholder — auth context wiring is a separate concern; OrderFeed is reachable so COMP-05/COMP-06 are closed
- [Phase 02]: Followed established auth pattern (preHandler authenticate + 403 on missing companyId) for packages and washer routes
- [Phase 02-core-business-flow]: Worker queue name must be 'orders' (not 'order-lifecycle') — matches Queue created in lib/queue.ts
- [Phase 02-core-business-flow]: Idempotency key format payout-\ prevents double Stripe transfers on BullMQ retry (3 attempts with exponential backoff)
- [Phase 03-real-time-washer-app]: customer-mobile socket.ts uses autoConnect=false singleton — explicit connectSocket(token) from screen
- [Phase 03-real-time-washer-app]: useOrderTracking tracks previousLocation alongside washerLocation for marker interpolation animation in Plan 06
- [Phase 03-real-time-washer-app]: useEta returns distanceMeters alongside etaMinutes — i18n text formatting delegated to consuming component
- [Phase 03]: AuthContext reads from AsyncStorage on mount without token refresh — refresh logic is a separate future concern
- [Phase 03]: useGpsTracking accepts userId as optional param (default null) and emits it in washer:join-order so server can store userId on socket for GPS broadcast routing
- [Phase 03]: pickup photo maps to beforePhotoUrl, return maps to afterPhotoUrl — carpet model pickup=before equivalent, return=after equivalent
- [Phase 04-supporting-systems-admin]: JSX added to apps/api tsconfig for React Email template compilation
- [Phase 04-supporting-systems-admin]: All notification services use graceful env guard pattern (warn + return if key missing) for dev-friendliness
- [Phase 04-supporting-systems-admin]: 360dialog uses native fetch (no Node.js SDK on npm) to waba-v2.360dialog.io with D360-API-KEY header
- [Phase 04]: Admin routes use addHook preHandler pattern (not per-route array) for consistent auth across all admin endpoints
- [Phase 04]: cities.ts registers /categories before /:id to prevent route collision in Fastify
- [Phase 04]: DisputeReasonSheet uses apiFetch helper (not raw fetch) for consistent API_BASE and auth header handling
- [Phase 04-supporting-systems-admin]: admin-sidebar uses inline SVG icons — lucide-react not installed in admin-web, avoids new dep
- [Phase 04-supporting-systems-admin]: companies/[id]/page.tsx is client component — needs useState for modal; uses useParams() not async params
- [Phase 04-supporting-systems-admin]: Active Washers and Open Disputes stub 0 on dashboard — API endpoints are Plan 05 scope
- [Phase 04-supporting-systems-admin]: CRITICAL_EVENTS = [order_confirmed, washer_en_route, completed, refund_issued] per D-02 tier matrix — SMS+WhatsApp only on these 4 events, push on all
- [Phase 04-supporting-systems-admin]: expo-notifications ~55.0.14 added to mobile apps — Expo SDK 55 compatible version from bundledNativeModules.json
- [Phase 04-supporting-systems-admin]: DisputePhotoViewer uses plain img with onError fallback — photos are full public URLs from R2 getPublicUrl, no presigned URL needed in client components
- [Phase 04-supporting-systems-admin]: Flatten-row pattern (DisputeRow/OrderRow/AuditEntryRow): intermediate types extend Record<string,unknown> to satisfy DataTable generic without unsafe casts
- [Phase 04-supporting-systems-admin]: seed.ts already existed from prior execution with full beta data — no changes needed in 04-07
- [Phase 04]: Active Washers stat remains stub (value=0) -- no washer-online count API endpoint exists

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260408-0ki | Fix i18n gap in washer-mobile: replace hardcoded English with t() calls | 2026-04-07 | 164464f | [260408-0ki](./quick/260408-0ki-fix-i18n-gap-in-washer-mobile-replace-ha/) |

### Blockers/Concerns

- Stripe Connect UAE: Manual onboarding (not self-serve Express) — must confirm current flow with Stripe before Phase 2 payout code is written
- 360dialog: Template pre-approval takes 1-2 weeks — register account before Phase 1 ships to avoid blocking Phase 4
- GPS background tracking: Requires production build testing on real Samsung + iPhone with battery saver enabled — cannot validate in Expo Go only (Phase 3 risk)
- Neon Bahrain region: Confirm availability at project init — regional availability can change

## Session Continuity

Last session: 2026-04-05T08:30:05.125Z
Stopped at: Completed 04-08-PLAN.md -- gap closure (rejection email + dashboard stats)
Resume file: None

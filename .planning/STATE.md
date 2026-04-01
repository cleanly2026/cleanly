---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 01-foundation/01-11-PLAN.md
last_updated: "2026-04-01T21:45:13.338Z"
last_activity: 2026-04-01
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 12
  completed_plans: 12
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** A customer can book a cleaning service, pay securely, and track their washer arriving in real-time — the full end-to-end booking-to-completion flow must work flawlessly.
**Current focus:** Phase 01 — foundation

## Current Position

Phase: 2
Plan: Not started
Status: Ready to execute
Last activity: 2026-04-01

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

### Pending Todos

None yet.

### Blockers/Concerns

- Stripe Connect UAE: Manual onboarding (not self-serve Express) — must confirm current flow with Stripe before Phase 2 payout code is written
- 360dialog: Template pre-approval takes 1-2 weeks — register account before Phase 1 ships to avoid blocking Phase 4
- GPS background tracking: Requires production build testing on real Samsung + iPhone with battery saver enabled — cannot validate in Expo Go only (Phase 3 risk)
- Neon Bahrain region: Confirm availability at project init — regional availability can change

## Session Continuity

Last session: 2026-04-01T07:56:38.861Z
Stopped at: Completed 01-foundation/01-11-PLAN.md
Resume file: None

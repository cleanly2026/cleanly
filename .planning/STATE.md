---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Ship to Production
status: executing
stopped_at: Completed 09-02-PLAN.md (partial - deploy blocked by sandbox)
last_updated: "2026-04-14T00:42:39.996Z"
last_activity: 2026-04-14 -- Completed quick task 260414-7fs: Delete orphan Sentry config files in apps/admin-web
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 8
  completed_plans: 6
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** A customer can book a cleaning service, pay securely, and track their washer arriving in real-time — the full end-to-end booking-to-completion flow must work flawlessly.
**Current focus:** Phase 09 — infrastructure-deployment

## Current Position

Phase: 09 (infrastructure-deployment) — EXECUTING
Plan: 1 of 4
Status: Executing Phase 09
Last activity: 2026-04-14 -- Completed quick task 260414-7fs: Delete orphan Sentry config files in apps/admin-web

Progress: [█████░░░░░] 50%

## Phase Index (v1.1)

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 8 | Accounts & Environment | ACCT-01–14, ENV-01–05 (19 total) | Not started |
| 9 | Infrastructure Deployment | FLY-01–09, VCL-01–06 (15 total) | Not started |
| 10 | CI/CD & Monitoring | CI-01–05, MON-01–06 (11 total) | Not started |
| 11 | Mobile Distribution & Staging Validation | MOB-01–06, STG-01–06 (12 total) | Not started |

## Performance Metrics

**Velocity (v1.1):**

- Total plans completed: 4
- Average duration: ~5min
- Total execution time: ~19min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 08 | 01 | 5min | 2 | 13 |
| 08 | 02 | 4min | 2 | 17 |
| 08 | 03 | 5min | 3 | 12 |
| 09 | 01 | ~5min | 5 | 8 |
| 09 | 02 | 8min | 4 | 3 |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.1]: Fly.io Mumbai region (bom) — no Bahrain/Middle East region exists on Fly.io
- [v1.1]: Platform subdomains for beta (*.fly.dev, *.vercel.app) — no custom domain yet
- [v1.1]: Staging-first approach — deploy staging, validate, then promote to production
- [v1.1]: EAS Build for mobile distribution (TestFlight + Android internal testing)
- [v1.1]: All third-party accounts need creation from scratch
- [v1.1]: BullMQ worker machine must have auto_stop_machines = "off" to prevent queue stalling
- [v1.1]: Two Neon connection strings required: pooled URL (runtime) + direct URL (migrations only)
- [v1.1]: Turborepo env vars must be declared in turbo.json to prevent cache poisoning with NEXT_PUBLIC_*/VITE_* vars
- [v1.1]: Stripe webhook endpoint requires raw body handler (not Fastify JSON parser) for signature verification
- [v1.1]: APNs sandbox credentials will fail silently in production — use p8 key with production environment
- [Phase 09-infrastructure-deployment]: Worker process group has no [[services]] block so Fly Proxy cannot auto-stop it (09-01)
- [Phase 09-infrastructure-deployment]: Rate limiter skipOnError: false + nameSpace per env.NODE_ENV — fail-closed on Redis outage to block OTP abuse (09-01)
- [Phase 09-infrastructure-deployment]: /healthz uses Promise.allSettled (not Promise.all) and returns 503 on any dep failure so Fly routes elsewhere (09-01)
- [Phase 09-infrastructure-deployment]: Single fly.toml for staging+production — differ only by --app flag at deploy time (09-01)
- [Phase 08]: Chained fullSchema superRefine for WHATSAPP_ENABLED gate (applies all envs)

- [Phase 08]: Added !.env.op.tpl to .gitignore — .env.* glob was blocking template commits
- [Phase 08]: op://Cleanly/<Item>/<field> naming convention for 1Password vault references
- [Phase 08]: Per-provider runbook format: 8-section docs under docs/accounts/ with 1Password layout, secret destination map, billing alerts

### Pending Todos

- Begin 360dialog WhatsApp template submission immediately (1-2 week approval lead time)
- Confirm Stripe Connect UAE manual onboarding flow with Stripe support before Phase 9
- Enroll Apple Developer account ($99/yr) — needed for Phase 11

### Blockers/Concerns

- Stripe Connect UAE: Manual onboarding (not self-serve Express) — needs confirmation with Stripe support
- 360dialog: WhatsApp template pre-approval takes 1-2 weeks — start early
- GPS background tracking: Needs real Samsung device with battery saver enabled for STG-05
- EAS Build: Requires Apple Developer ($99/yr) + Google Play Console ($25 one-time) accounts

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260414-7fs | Delete orphan Sentry config files in apps/admin-web | 2026-04-14 | e29b767 | [260414-7fs-delete-orphan-sentry-config-files-in-app](./quick/260414-7fs-delete-orphan-sentry-config-files-in-app/) |
| 260411-qng | fix pre-existing TypeScript errors in apps/api so 09-02 can run strict tsc --noEmit at deploy time | 2026-04-11 | 4aa4ed6 | [260411-qng-fix-pre-existing-typescript-errors-in-ap](./quick/260411-qng-fix-pre-existing-typescript-errors-in-ap/) |
| Phase 08 P02 | 4min | 2 tasks | 17 files |
| Phase 08 P01 | 5min | 2 tasks | 13 files |

## Session Continuity

Last session: 2026-04-12T18:45:00Z
Stopped at: Completed 09-02-PLAN.md (partial - deploy blocked by sandbox)
Resume file: None

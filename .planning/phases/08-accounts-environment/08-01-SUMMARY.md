---
phase: 08-accounts-environment
plan: 01
subsystem: infra
tags: [neon, upstash, twilio, 360dialog, resend, sentry, cloudflare-r2, fly, vercel, expo, google-play, stripe, apple, 1password, provisioning]

# Dependency graph
requires:
  - phase: none
    provides: none (first phase of v1.1 milestone)
provides:
  - 13 per-provider setup runbooks under docs/accounts/
  - 1Password item layout for all 14 provider secrets
  - Secret destination map (Fly.io / Vercel / GitHub Environments)
  - Billing alert instructions for all paid providers
  - Phase 9 handoff instructions for Fly.io Mumbai (bom) region
affects: [08-02, 08-03, 08-04, 09-infrastructure-deployment, 10-ci-cd-monitoring, 11-mobile-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-provider-runbook-format, 1password-vault-naming-convention]

key-files:
  created:
    - docs/accounts/NEON-SETUP.md
    - docs/accounts/UPSTASH-SETUP.md
    - docs/accounts/TWILIO-SETUP.md
    - docs/accounts/360DIALOG-SETUP.md
    - docs/accounts/RESEND-SETUP.md
    - docs/accounts/SENTRY-SETUP.md
    - docs/accounts/CLOUDFLARE-R2-SETUP.md
    - docs/accounts/FLY-SETUP.md
    - docs/accounts/VERCEL-SETUP.md
    - docs/accounts/EXPO-EAS-SETUP.md
    - docs/accounts/GOOGLE-PLAY-SETUP.md
    - docs/accounts/STRIPE-SETUP.md
    - docs/accounts/APPLE-DEVELOPER-SETUP.md
  modified: []

key-decisions:
  - "Neon region documented as ap-southeast-1 (Singapore) or eu-central-1 (Frankfurt) — no Bahrain region exists"
  - "Each provider doc follows 8-section format: Header, Prerequisites, Signup, Capture, 1Password, Secrets, Billing, Post-Phase-8"
  - "Deferred providers (Stripe, Apple Developer) get full placeholder docs with Phase 8.5 instructions"

patterns-established:
  - "Per-provider runbook: docs/accounts/<PROVIDER>-SETUP.md with self-contained 8-section format"
  - "1Password naming: Cleanly - <Provider> with vault Cleanly"
  - "Secret destination map: Fly.io (runtime), Vercel (web runtime), GitHub Environments (CI-only)"

requirements-completed: [ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ACCT-06, ACCT-07, ACCT-08, ACCT-09, ACCT-10, ACCT-11, ACCT-12, ACCT-13, ACCT-14]

# Metrics
duration: 5min
completed: 2026-04-12
---

# Phase 8 Plan 1: Provider Setup Docs Summary

**13 per-provider provisioning runbooks with 1Password layouts, secret destination maps, and billing alerts for all 14 third-party services**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T06:01:51Z
- **Completed:** 2026-04-12T06:06:53Z
- **Tasks:** 2
- **Files created:** 13

## Accomplishments
- Created 11 instant provider setup docs with complete signup checklists, secret capture fields, 1Password storage layouts, secret destination maps, and billing alert instructions
- Created 2 deferred provider placeholder docs (Stripe + Apple Developer) clearly marked as Phase 8.5 with entity-gated instructions
- Documented Neon region as Singapore (ap-southeast-1) since no Bahrain region exists on Neon
- Included Phase 9 handoff in Fly.io doc with explicit Mumbai (bom) region app creation commands

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 11 instant provider setup docs** - `4f767ac` (docs)
2. **Task 2: Create 2 deferred provider placeholder docs** - `46baa2d` (docs)

## Files Created
- `docs/accounts/NEON-SETUP.md` - Neon PostgreSQL provisioning runbook (Singapore/Frankfurt region)
- `docs/accounts/UPSTASH-SETUP.md` - Upstash Redis Fixed Plan ($10/mo) provisioning runbook
- `docs/accounts/TWILIO-SETUP.md` - Twilio Verify provisioning runbook (UAE SMS, Verify Service SID)
- `docs/accounts/360DIALOG-SETUP.md` - 360dialog WhatsApp provisioning + template submission guide
- `docs/accounts/RESEND-SETUP.md` - Resend email provisioning + domain verification DNS records
- `docs/accounts/SENTRY-SETUP.md` - Sentry org + 6 projects provisioning (api, customer-web, admin-web, company-web, customer-mobile, washer-mobile)
- `docs/accounts/CLOUDFLARE-R2-SETUP.md` - Cloudflare R2 bucket + CORS policy (explicit content-type)
- `docs/accounts/FLY-SETUP.md` - Fly.io account + deploy token + Phase 9 Mumbai handoff
- `docs/accounts/VERCEL-SETUP.md` - Vercel Hobby tier account + deploy token
- `docs/accounts/EXPO-EAS-SETUP.md` - Expo EAS account + cleanly2026 ownership verification
- `docs/accounts/GOOGLE-PLAY-SETUP.md` - Google Play Console $25 personal enrollment
- `docs/accounts/STRIPE-SETUP.md` - Stripe + Connect UAE deferred placeholder (Phase 8.5)
- `docs/accounts/APPLE-DEVELOPER-SETUP.md` - Apple Developer deferred placeholder (Phase 8.5, D-U-N-S required)

## Decisions Made
- Neon region: Documented ap-southeast-1 (Singapore) as primary recommendation for Gulf latency, eu-central-1 (Frankfurt) as alternative -- no Bahrain region exists on Neon
- Consistent 8-section format across all docs: Header, Prerequisites, Signup Checklist, What to Capture, 1Password Storage, Where Secrets Go, Billing Alert, Post-Phase-8
- Deferred docs include full "What Will Be Needed" sections so Phase 8.5 can proceed without re-research

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all 13 docs are complete with their required sections.

## Issues Encountered

None.

## User Setup Required

None - these are documentation files. Actual account provisioning happens during Phase 8 execution sessions (plans 08-02 through 08-04).

## Next Phase Readiness
- All 13 provider runbooks ready for use during live provisioning sessions (08-02, 08-03, 08-04)
- Deferred providers clearly marked with Phase 8.5 instructions
- Secret destination map provides clear guidance for Phase 9 infrastructure deployment

---
*Phase: 08-accounts-environment*
*Completed: 2026-04-12*

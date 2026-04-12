---
phase: 08-accounts-environment
verified: 2026-04-12T17:00:00Z
status: passed
score: 9/10 must-haves verified
re_verification: false
gaps:
  - truth: "GitHub Environments (staging + production) exist with CI-only secrets set"
    status: resolved
    reason: "Environments created and all 4 CI-only secrets (NEON_DIRECT_URL, SENTRY_AUTH_TOKEN, FLY_API_TOKEN, VERCEL_TOKEN) set on both staging and production."
    artifacts: []
    missing: []
  - truth: "All 11 instant provider accounts are created with secrets stored in 1Password"
    status: partial
    reason: "9/11 providers completed. Google Play Console (ACCT-14) and 360dialog (ACCT-06) deferred by user. Both are non-blocking for Phase 9 but required before Phase 11 (mobile distribution) and WhatsApp go-live respectively."
    artifacts: []
    missing:
      - "Create Google Play Console developer account ($25) before Phase 11"
      - "Create 360dialog account and submit WhatsApp templates before WhatsApp notifications go live"
human_verification:
  - test: "Verify 9 provider accounts are accessible in their dashboards"
    expected: "Neon, Upstash, Twilio, Resend, Sentry, Cloudflare R2, Fly.io, Vercel, Expo EAS dashboards all load and show the Cleanly project/org"
    why_human: "Dashboard access requires browser authentication"
  - test: "Verify 1Password vault contains 9 items with correct field names"
    expected: "1Password Cleanly vault has items for each completed provider with field names matching the docs/accounts/ runbooks"
    why_human: "1Password vault access requires authenticated desktop app"
  - test: "Verify Upstash is on Fixed Plan (not PAYG)"
    expected: "Upstash billing page shows Fixed Plan at $10/mo"
    why_human: "Billing page requires authenticated dashboard access"
---

# Phase 8: Accounts & Environment Verification Report

**Phase Goal:** All third-party accounts are provisioned and all credentials are documented, stored securely, and validated -- no app can start without this
**Verified:** 2026-04-12T17:00:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every third-party provider has a self-contained setup doc under docs/accounts/ | VERIFIED | 13 files exist: 11 instant + 2 deferred (Stripe, Apple Developer). All 13 contain 1Password and Billing sections |
| 2 | API boots with WHATSAPP_ENABLED and BYPASS_SENTRY as recognized env vars with correct defaults | VERIFIED | env.ts lines 86-91 contain both flags with `.transform((v) => v === 'true')` and `.default('false')` |
| 3 | Setting WHATSAPP_ENABLED=true without DIALOG360_API_KEY crashes with descriptive error | VERIFIED | env.ts line 124-127: fullSchema superRefine checks `data.WHATSAPP_ENABLED && !data.DIALOG360_API_KEY` and issues `DIALOG360_API_KEY is required when WHATSAPP_ENABLED=true` |
| 4 | BYPASS_SENTRY is honored in staging, ignored in production | VERIFIED | env.ts line 106: `sentryBypassActive = data.BYPASS_SENTRY && data.NODE_ENV !== 'production'`. sentry.ts line 6: `if (env.BYPASS_SENTRY)` skips init |
| 5 | No API source file outside env.ts reads process.env directly | VERIFIED | grep found 0 violations in source files (only test files use process.env for setup, which is correct) |
| 6 | .env.example files exist for every app with all env vars documented | VERIFIED | 7 .env.example files exist (6 apps + packages/db). API .env.example includes WHATSAPP_ENABLED and BYPASS_SENTRY |
| 7 | turbo.json declares all EXPO_PUBLIC_* vars to prevent cache poisoning | VERIFIED | 5 EXPO_PUBLIC_* vars in turbo.json tasks.build.env: API_URL, PROJECT_ID, STRIPE_PUBLISHABLE_KEY, SENTRY_DSN, GOOGLE_MAPS_API_KEY |
| 8 | Every app has a .env.op.tpl file with 1Password references and pnpm setup:env works | VERIFIED | 7 .env.op.tpl files exist with op://Cleanly/ references. package.json has setup:env script. SETUP.md documents the workflow |
| 9 | All 11 instant provider accounts are created with secrets stored in 1Password | PARTIAL | 9/11 completed (Neon, Upstash, Twilio, Resend, Sentry, Cloudflare R2, Fly.io, Vercel, Expo EAS). Google Play (ACCT-14) and 360dialog (ACCT-06) deferred by user |
| 10 | GitHub Environments (staging + production) exist with CI-only secrets set | PARTIAL | Environments created on cleanly2026/cleanly. CI-only secrets NOT YET SET (user deferred). TURBO_TOKEN/TURBO_TEAM deferred to Phase 9 by design |

**Score:** 8/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/accounts/NEON-SETUP.md` | Neon PostgreSQL runbook | VERIFIED | Contains Singapore region, pooled/direct URL capture |
| `docs/accounts/UPSTASH-SETUP.md` | Upstash Redis runbook | VERIFIED | Contains "Fixed Plan" 11 times, $10/mo warning |
| `docs/accounts/TWILIO-SETUP.md` | Twilio Verify runbook | VERIFIED | Contains Verify Service SID (VA prefix) |
| `docs/accounts/360DIALOG-SETUP.md` | 360dialog runbook | VERIFIED | Contains template submission instructions |
| `docs/accounts/RESEND-SETUP.md` | Resend email runbook | VERIFIED | Contains domain verification DNS records |
| `docs/accounts/SENTRY-SETUP.md` | Sentry runbook | VERIFIED | Contains all 6 projects (api, customer-web, admin-web, company-web, customer-mobile, washer-mobile) |
| `docs/accounts/CLOUDFLARE-R2-SETUP.md` | R2 runbook | VERIFIED | Contains explicit "content-type" header (not wildcard) |
| `docs/accounts/FLY-SETUP.md` | Fly.io runbook | VERIFIED | Contains Post-Phase-8 section with bom/Mumbai handoff |
| `docs/accounts/VERCEL-SETUP.md` | Vercel runbook | VERIFIED | Contains "Hobby tier" |
| `docs/accounts/EXPO-EAS-SETUP.md` | Expo EAS runbook | VERIFIED | Contains "cleanly2026" |
| `docs/accounts/GOOGLE-PLAY-SETUP.md` | Google Play runbook | VERIFIED | Contains "$25" |
| `docs/accounts/STRIPE-SETUP.md` | Stripe deferred placeholder | VERIFIED | Contains "Phase 8.5" |
| `docs/accounts/APPLE-DEVELOPER-SETUP.md` | Apple Developer deferred placeholder | VERIFIED | Contains "Phase 8.5" |
| `apps/api/src/lib/env.ts` | Extended Zod env validation | VERIFIED | WHATSAPP_ENABLED + BYPASS_SENTRY with transforms, fullSchema chain, sentryBypassActive logic |
| `apps/api/src/lib/sentry.ts` | Sentry init with BYPASS_SENTRY | VERIFIED | Imports env singleton, checks env.BYPASS_SENTRY |
| `apps/api/src/services/whatsapp.service.ts` | WhatsApp service with WHATSAPP_ENABLED gate | VERIFIED | Checks env.WHATSAPP_ENABLED, returns early if false |
| `apps/api/.env.example` | Complete API env documentation | VERIFIED | Contains WHATSAPP_ENABLED=false, BYPASS_SENTRY=false |
| `turbo.json` | EXPO_PUBLIC_* env declarations | VERIFIED | All 5 EXPO_PUBLIC vars present |
| `apps/api/.env.op.tpl` | 1Password template for API | VERIFIED | 18+ op://Cleanly/ references |
| `package.json` | setup:env script | VERIFIED | Contains op inject chain for all 7 apps |
| `SETUP.md` | Developer setup docs | VERIFIED | Contains op inject instructions and manual fallback |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| env.ts | all API files | `import { env }` | WIRED | 0 process.env reads outside env.ts (excluding tests) |
| sentry.ts | env.ts | `env.BYPASS_SENTRY` | WIRED | Line 2: import, Line 6: env.BYPASS_SENTRY check |
| whatsapp.service.ts | env.ts | `env.WHATSAPP_ENABLED` | WIRED | Line 10: env.WHATSAPP_ENABLED gate |
| .env.op.tpl files | 1Password vault | `op://Cleanly/` references | WIRED | All 7 files contain valid op:// references |
| package.json | .env.op.tpl files | setup:env script | WIRED | Script chains op inject for all 7 apps |

### Data-Flow Trace (Level 4)

Not applicable -- this phase produces documentation, configuration, and env validation. No dynamic data rendering.

### Behavioral Spot-Checks

Step 7b: SKIPPED (no runnable entry points for this phase -- env validation requires actual env vars to be set, provider accounts require browser access).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ACCT-01 | 08-01 | Stripe account with live+test mode | DEFERRED (by design) | Placeholder doc with Phase 8.5 marker |
| ACCT-02 | 08-01 | Stripe Connect for UAE payouts | DEFERRED (by design) | Covered in STRIPE-SETUP.md placeholder |
| ACCT-03 | 08-01, 08-04 | Neon production database | SATISFIED (human-confirmed) | Doc exists, account provisioned per 08-04 summary |
| ACCT-04 | 08-01, 08-04 | Upstash Redis Fixed Plan | SATISFIED (human-confirmed) | Doc exists with Fixed Plan emphasis, account provisioned |
| ACCT-05 | 08-01, 08-04 | Twilio Verify account | SATISFIED (human-confirmed) | Doc exists, account provisioned |
| ACCT-06 | 08-01, 08-04 | 360dialog WhatsApp templates | DEFERRED (user decision) | Doc exists but account creation deferred by user |
| ACCT-07 | 08-01, 08-04 | Resend with domain verified | SATISFIED (human-confirmed) | Doc exists, account provisioned |
| ACCT-08 | 08-01, 08-04 | Sentry org with 6 projects | SATISFIED (human-confirmed) | Doc exists with 6 project names, account provisioned |
| ACCT-09 | 08-01, 08-04 | Cloudflare R2 bucket + CORS | SATISFIED (human-confirmed) | Doc exists with exact CORS JSON, account provisioned |
| ACCT-10 | 08-01, 08-04 | Fly.io account (partial) | PARTIAL | Account created, app creation deferred to Phase 9 (FLY-08/09) |
| ACCT-11 | 08-01, 08-04 | Vercel account (partial) | PARTIAL | Account created, project linking deferred to Phase 9 (VCL-01/02/03) |
| ACCT-12 | 08-01, 08-04 | Expo EAS account | SATISFIED (human-confirmed) | Doc exists, account provisioned |
| ACCT-13 | 08-01 | Apple Developer account | DEFERRED (by design) | Placeholder doc with Phase 8.5 marker |
| ACCT-14 | 08-01, 08-04 | Google Play Console | DEFERRED (user decision) | Doc exists but enrollment deferred by user |
| ENV-01 | 08-03 | .env.example for every app | SATISFIED | 7 .env.example files verified present |
| ENV-02 | 08-02 | Zod startup validation | SATISFIED | env.ts has Zod schema with descriptive crash messages |
| ENV-03 | 08-04 | GitHub Environments with secrets | PARTIAL | Environments created, secrets not yet set |
| ENV-04 | 08-02 | Neon two-URL config | SATISFIED | env.ts validates DATABASE_URL (pooled) and DIRECT_URL (direct) |
| ENV-05 | 08-03, 08-04 | Secrets in 1Password/GitHub/Fly.io | PARTIAL | .env.op.tpl templates ready, 1Password populated for 9 providers, GitHub secrets not yet set |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No anti-patterns found in modified files |

### Human Verification Required

### 1. Provider Dashboard Access
**Test:** Log into each of the 9 provisioned provider dashboards and verify the Cleanly project/org exists
**Expected:** Neon shows project in Singapore region, Upstash shows Fixed Plan, Sentry shows 6 projects, R2 shows cleanly-photos bucket with correct CORS
**Why human:** Dashboard access requires browser authentication

### 2. 1Password Vault Contents
**Test:** Open 1Password Cleanly vault and verify 9 items exist with correct field names per docs/accounts/ runbooks
**Expected:** Each item has the fields documented in its corresponding setup doc (e.g., Cleanly - Neon has database_url_pooled, direct_url, password)
**Why human:** 1Password vault requires authenticated desktop app access

### 3. Billing Alerts Configuration
**Test:** Check billing/alert settings on Neon, Upstash, Twilio, Sentry, Cloudflare, Fly.io dashboards
**Expected:** Alerts set per docs (e.g., Upstash at $15/mo, Twilio at $20/mo, Fly.io at $20/mo)
**Why human:** Billing pages require authenticated dashboard access

## Gaps Summary

Two gaps exist, both caused by user deferrals during the live provisioning session (Plan 08-04):

1. **GitHub Environment secrets not set** -- Environments exist on cleanly2026/cleanly but the 4 CI-only secrets per environment (NEON_DIRECT_URL, SENTRY_AUTH_TOKEN, FLY_API_TOKEN, VERCEL_TOKEN) were deferred. This is BLOCKING for Phase 10 (CI/CD pipeline) but non-blocking for Phase 9 (infrastructure deployment, which sets secrets on Fly.io/Vercel directly).

2. **2 provider accounts deferred** -- Google Play Console (ACCT-14) and 360dialog (ACCT-06) were deferred by user choice. Google Play is needed before Phase 11 (mobile distribution). 360dialog is needed before WhatsApp notifications go live. Neither blocks Phase 9 or Phase 10.

Additionally, 3 requirements are deferred by design (not gaps):
- ACCT-01/ACCT-02 (Stripe) -- Phase 8.5, entity-gated
- ACCT-13 (Apple Developer) -- Phase 8.5, entity-gated
- ACCT-10/ACCT-11 partial completion -- app/project creation moves to Phase 9

**Recommendation:** Proceed to Phase 9. The gaps are non-blocking for immediate next work. GitHub secrets must be set before Phase 10 CI/CD.

---

_Verified: 2026-04-12T17:00:00Z_
_Verifier: Claude (gsd-verifier)_

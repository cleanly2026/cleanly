# Roadmap: Cleanly

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-04-09) — [archive](milestones/v1.0-ROADMAP.md)
- 🚀 **v1.1 Ship to Production** — Phases 8-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-04-09</summary>

- [x] Phase 1: Foundation (12/12 plans) — Monorepo scaffold, Neon/Prisma schema, all-role auth, RTL/i18n
- [x] Phase 2: Core Business Flow (12/12 plans) — Discovery, booking, payments, order lifecycles, company dashboard
- [x] Phase 3: Real-Time & Washer App (9/9 plans) — GPS tracking, photo evidence, washer mobile, customer tracking
- [x] Phase 4: Supporting Systems & Admin (8/8 plans) — Notifications, admin panel, private beta readiness
- [x] Phase 5: Wire Washer Job Dispatch Loop (1/1 plan) — Gap closure: server job:alert + client wiring
- [x] Phase 6: Fix Cross-Phase Route & Socket Wiring (3/3 plans) — Gap closure: route prefix, socket rooms, companyId
- [x] Phase 7: Auth Guards & Housekeeping (2/2 plans) — Gap closure: auth gate, env assertions, checkbox audit

</details>

### v1.1 Ship to Production

- [ ] **Phase 8: Accounts & Environment** — All third-party accounts created, secrets stored, env documented
- [ ] **Phase 9: Infrastructure Deployment** — API + worker live on Fly.io, all 3 web apps live on Vercel
- [ ] **Phase 10: CI/CD & Monitoring** — Automated pipeline, Stripe hardening, Sentry + uptime monitoring
- [ ] **Phase 11: Mobile Distribution & Staging Validation** — EAS builds distributed, full E2E staging validated

## Phase Details

### Phase 8: Accounts & Environment
**Goal**: All third-party accounts are provisioned and all credentials are documented, stored securely, and validated — no app can start without this
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ACCT-06, ACCT-07, ACCT-08, ACCT-09, ACCT-10, ACCT-11, ACCT-12, ACCT-13, ACCT-14, ENV-01, ENV-02, ENV-03, ENV-04, ENV-05
**Success Criteria** (what must be TRUE):
  1. The API server starts without crashing and a missing required env var produces a descriptive error message (not a silent undefined)
  2. .env.example files exist for every app and every variable is documented with purpose and format
  3. GitHub Environments (staging + production) exist with scoped secrets — no credentials exist in the repository
  4. Neon production database branch is accessible in Bahrain region via both pooled URL (runtime) and direct URL (migrations)
  5. All third-party service dashboards are accessible: Stripe live+test mode, Twilio, 360dialog, Resend, Sentry, Cloudflare R2, Fly.io, Vercel, Expo EAS, Apple Developer, Google Play Console
**Plans**: TBD

### Phase 9: Infrastructure Deployment
**Goal**: The API, BullMQ worker, and all three web apps are deployed to staging and production environments and are reachable over the internet
**Depends on**: Phase 8
**Requirements**: FLY-01, FLY-02, FLY-03, FLY-04, FLY-05, FLY-06, FLY-07, FLY-08, FLY-09, VCL-01, VCL-02, VCL-03, VCL-04, VCL-05, VCL-06
**Success Criteria** (what must be TRUE):
  1. `GET https://cleanly-api-staging.fly.dev/healthz` returns 200 with DB and Redis connectivity status
  2. `GET https://cleanly-api.fly.dev/healthz` returns 200 with DB and Redis connectivity status
  3. All 3 web apps (customer-web, admin-web, company-web) load on Vercel without build errors
  4. A Socket.io WebSocket connection from a browser client to the staging API establishes and stays open through Fly.io proxy
  5. Rate limiting on OTP endpoints survives an API restart (backed by Upstash Redis, not in-memory)
**Plans**: TBD

### Phase 10: CI/CD & Monitoring
**Goal**: Every merge to staging or main triggers automated lint, typecheck, test, and deploy — and all errors in production are captured and alerted
**Depends on**: Phase 9
**Requirements**: CI-01, CI-02, CI-03, CI-04, CI-05, MON-01, MON-02, MON-03, MON-04, MON-05, MON-06
**Success Criteria** (what must be TRUE):
  1. A PR opened against main triggers lint + typecheck + test in GitHub Actions within 5 minutes
  2. A merge to `staging` branch automatically deploys to staging environments; a merge to `main` deploys to production
  3. A Stripe test webhook sent with an invalid signature is rejected — a valid webhook with a duplicate event ID does not double-process
  4. A thrown error in any of the 6 app surfaces appears in Sentry with a resolved source-mapped stack trace
  5. An API downtime event triggers a Better Stack (or equivalent) alert within 2 minutes
**Plans**: TBD

### Phase 11: Mobile Distribution & Staging Validation
**Goal**: Beta testers can install the mobile apps from TestFlight and Google Play internal testing, and the full booking-to-completion flow works end-to-end on staging with real devices
**Depends on**: Phase 10
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, STG-01, STG-02, STG-03, STG-04, STG-05, STG-06
**Success Criteria** (what must be TRUE):
  1. A beta tester can install the customer-mobile and washer-mobile apps from TestFlight (iOS) and Google Play internal testing (Android)
  2. A push notification sent from the staging API arrives on a TestFlight iOS build and an Android internal testing build
  3. The full customer flow works on staging: sign up → browse → book → pay with Stripe test card → see washer assigned → order completes
  4. GPS background tracking on a real Samsung device with battery saver enabled continues broadcasting location without interruption
  5. The washer mobile app connects to staging, receives a job alert, marks the job in progress, uploads before/after photos, and completes the order
  6. An OTA JS update pushed via EAS Update appears on the installed staging build without requiring a new store submission
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 12/12 | Complete | 2026-04-01 |
| 2. Core Business Flow | v1.0 | 12/12 | Complete | 2026-04-03 |
| 3. Real-Time & Washer App | v1.0 | 9/9 | Complete | 2026-04-05 |
| 4. Supporting Systems & Admin | v1.0 | 8/8 | Complete | 2026-04-07 |
| 5. Wire Washer Job Dispatch | v1.0 | 1/1 | Complete | 2026-04-08 |
| 6. Fix Route & Socket Wiring | v1.0 | 3/3 | Complete | 2026-04-08 |
| 7. Auth Guards & Housekeeping | v1.0 | 2/2 | Complete | 2026-04-09 |
| 8. Accounts & Environment | v1.1 | 0/? | Not started | - |
| 9. Infrastructure Deployment | v1.1 | 0/? | Not started | - |
| 10. CI/CD & Monitoring | v1.1 | 0/? | Not started | - |
| 11. Mobile Distribution & Staging Validation | v1.1 | 0/? | Not started | - |

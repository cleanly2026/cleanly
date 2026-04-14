# Requirements: ROFAN

**Defined:** 2026-04-09
**Core Value:** A customer can book a cleaning service, pay securely, and track their washer arriving in real-time — the full end-to-end booking-to-completion flow must work flawlessly.

## v1.1 Requirements

Requirements for shipping v1.0 code to production. Each maps to roadmap phases.

### Account Setup

- [ ] **ACCT-01**: Stripe account created with live + test mode, AED currency enabled
- [ ] **ACCT-02**: Stripe Connect platform configured for UAE company payouts
- [ ] **ACCT-03**: Neon production database branch created (Bahrain region) with PgBouncer pooling
- [ ] **ACCT-04**: Upstash Redis Fixed Plan ($10/mo) provisioned for BullMQ + rate limiting + cache
- [ ] **ACCT-05**: Twilio Verify account created with UAE SMS delivery configured
- [ ] **ACCT-06**: 360dialog WhatsApp Business account created and message templates submitted for approval
- [ ] **ACCT-07**: Resend account created with sender domain verified
- [ ] **ACCT-08**: Sentry organization created with 6 projects (one per app surface)
- [ ] **ACCT-09**: Cloudflare account created with R2 bucket provisioned and CORS policy set
- [ ] **ACCT-10**: Fly.io account created with `cleanly-api-staging` and `cleanly-api` apps in Mumbai region
- [ ] **ACCT-11**: Vercel account created with 3 projects linked to monorepo (customer-web, admin-web, company-web)
- [ ] **ACCT-12**: Expo EAS account created with project IDs configured for both mobile apps
- [ ] **ACCT-13**: Apple Developer account ($99/yr) enrolled with APNs p8 key generated
- [ ] **ACCT-14**: Google Play Console ($25) enrolled with internal testing track created

### Environment & Secrets

- [x] **ENV-01**: .env.example files created for every app and package documenting all required variables
- [x] **ENV-02**: Zod startup validation schema for API server — missing required env var causes clean crash with descriptive error
- [ ] **ENV-03**: GitHub Environments created (staging + production) with scoped secrets
- [x] **ENV-04**: Neon two-URL configuration: pooled URL for runtime, direct URL for migrations
- [ ] **ENV-05**: All secrets stored in GitHub Environments and Fly.io secrets (never in repo)

### API Deployment (Fly.io)

- [x] **FLY-01**: Dockerfile using `turbo prune api` for minimal production image
- [x] **FLY-02**: fly.toml with two process groups: `api` (HTTP, port 8080) and `worker` (BullMQ, no HTTP)
- [x] **FLY-03**: BullMQ worker machine has `auto_stop_machines = "off"` — never auto-stopped
- [x] **FLY-04**: API machine has `min_machines_running = 1` — always available
- [x] **FLY-05**: Health check endpoint (`/healthz`) returning DB + Redis connectivity status
- [ ] **FLY-06**: Socket.io WebSocket connections verified working through Fly.io proxy
- [x] **FLY-07**: Rate limiting backed by Upstash Redis (not in-memory) — survives deploys
- [ ] **FLY-08**: Staging API deployed and reachable at `cleanly-api-staging.fly.dev`
- [ ] **FLY-09**: Production API deployed and reachable at `cleanly-api.fly.dev`

### Web Deployment (Vercel)

- [ ] **VCL-01**: Customer-web Vercel project with Root Directory `apps/customer-web` and `turbo-ignore` build step
- [ ] **VCL-02**: Admin-web Vercel project with Root Directory `apps/admin-web` and `turbo-ignore` build step
- [ ] **VCL-03**: Company-web Vercel project with Root Directory `apps/company-web` and `turbo-ignore` build step
- [x] **VCL-04**: Turborepo env declarations in turbo.json for all NEXT_PUBLIC_* and VITE_* vars (prevents cache poisoning)
- [ ] **VCL-05**: CORS production config on API allows only deployed Vercel origins
- [ ] **VCL-06**: Cloudflare R2 CORS policy uses explicit `content-type` header (not wildcard `*`)

### CI/CD Pipeline

- [ ] **CI-01**: GitHub Actions workflow: lint + typecheck + test on PR, deploy on merge to main
- [ ] **CI-02**: Turborepo remote cache via Vercel (TURBO_TOKEN + TURBO_TEAM secrets)
- [ ] **CI-03**: Prisma migrate deploy runs in CI using Neon direct URL (not pooled)
- [ ] **CI-04**: Sentry source map upload as CI step after each deploy
- [ ] **CI-05**: Staging deploys on merge to `staging` branch; production deploys on merge to `main`

### Mobile Distribution

- [ ] **MOB-01**: EAS Build staging profile configured for both mobile apps
- [ ] **MOB-02**: EAS Build production profile configured with app store submission
- [ ] **MOB-03**: iOS TestFlight build submitted and accessible to beta testers
- [ ] **MOB-04**: Android internal testing track build uploaded and accessible to beta testers
- [ ] **MOB-05**: APNs production credentials configured (p8 key) — push notifications verified on TestFlight build
- [ ] **MOB-06**: EAS Update OTA channels configured (staging + production) for JS-only updates without store review

### Monitoring & Hardening

- [ ] **MON-01**: Sentry configured on all 6 app surfaces with source maps resolving correctly
- [ ] **MON-02**: Better Stack (or equivalent) uptime monitoring on API health endpoint + all 3 web apps
- [ ] **MON-03**: Structured log aggregation from Fly.io to Better Stack (or equivalent)
- [ ] **MON-04**: Stripe webhook endpoint uses raw body handler (not Fastify's JSON parser) for signature verification
- [x] **MON-05**: Stripe webhook handlers are idempotent (duplicate events don't double-process)
- [ ] **MON-06**: Rollback runbook documented (how to revert API, web, and mobile deploys)

### Staging Validation

- [ ] **STG-01**: Full E2E flow tested on staging: customer sign up → browse → book → pay (Stripe test mode) → order lifecycle
- [ ] **STG-02**: Company dashboard loads and receives real-time order events on staging
- [ ] **STG-03**: Washer mobile app connects to staging API, receives job alerts, uploads photos
- [ ] **STG-04**: Admin panel can review companies, handle disputes, issue refunds on staging
- [ ] **STG-05**: GPS background tracking verified on real Samsung device with battery saver enabled
- [ ] **STG-06**: Push notifications received on TestFlight iOS build and Android internal build

## v2 Requirements

Deferred to post-production-launch. Tracked but not in current roadmap.

### Retention & Growth

- **RET-01**: Loyalty points earned per completed order
- **RET-02**: Points redeemable as wallet credit at checkout
- **RET-03**: Promo code engine (percentage and fixed discounts, expiry, category/city scoping)
- **RET-04**: Referral program (customer gets credit for inviting friends)
- **RET-05**: 1-tap rebook from order history
- **RET-06**: Scheduled bookings (future date + time slot for on-site services)

### Company Tools

- **CTOOL-01**: Revenue analytics dashboard (orders by day/week/month)
- **CTOOL-02**: Washer performance metrics (ratings, jobs, on-time rate)
- **CTOOL-03**: Payout history with PDF invoice download
- **CTOOL-04**: Company-level promo code creation
- **CTOOL-05**: Holiday/unavailability schedule management

### Enhanced Features

- **ENH-01**: Preferred washer selection for repeat customers
- **ENH-02**: Eco-friendly / verified company badges
- **ENH-03**: Real-time ETA with Google Maps Distance Matrix
- **ENH-04**: In-app photo timeline for order history

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Custom domain | Using platform subdomains (*.fly.dev, *.vercel.app) for beta — domain in v1.2 |
| Kubernetes / container orchestration | Fly.io machines are sufficient for launch scale |
| Blue-green deployments | Fly.io rolling deploys with health checks are adequate |
| HashiCorp Vault / external secrets manager | GitHub Environments + Fly.io secrets are sufficient for solo dev |
| Prometheus / Grafana monitoring | Sentry + Better Stack cover the same ground with less ops burden |
| ELK stack / custom log pipeline | Better Stack log drain from Fly.io is simpler and free-tier sufficient |
| Load testing / performance benchmarks | Not needed at beta scale (~100 concurrent users) |
| Multi-region API deployment | Single Mumbai region is adequate; evaluate after measuring real latency |
| Wallet balance (PAY-02) | Feature work deferred — this milestone is deployment only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACCT-01 | Phase 8 | Pending |
| ACCT-02 | Phase 8 | Pending |
| ACCT-03 | Phase 8 | Pending |
| ACCT-04 | Phase 8 | Pending |
| ACCT-05 | Phase 8 | Pending |
| ACCT-06 | Phase 8 | Pending |
| ACCT-07 | Phase 8 | Pending |
| ACCT-08 | Phase 8 | Pending |
| ACCT-09 | Phase 8 | Pending |
| ACCT-10 | Phase 8 | Pending |
| ACCT-11 | Phase 8 | Pending |
| ACCT-12 | Phase 8 | Pending |
| ACCT-13 | Phase 8 | Pending |
| ACCT-14 | Phase 8 | Pending |
| ENV-01 | Phase 8 | Complete |
| ENV-02 | Phase 8 | Complete |
| ENV-03 | Phase 8 | Pending |
| ENV-04 | Phase 8 | Complete |
| ENV-05 | Phase 8 | Pending |
| FLY-01 | Phase 9 | Complete |
| FLY-02 | Phase 9 | Complete |
| FLY-03 | Phase 9 | Complete |
| FLY-04 | Phase 9 | Complete |
| FLY-05 | Phase 9 | Complete |
| FLY-06 | Phase 9 | Pending |
| FLY-07 | Phase 9 | Complete |
| FLY-08 | Phase 9 | Pending |
| FLY-09 | Phase 9 | Pending |
| VCL-01 | Phase 9 | Pending |
| VCL-02 | Phase 9 | Pending |
| VCL-03 | Phase 9 | Pending |
| VCL-04 | Phase 9 | Complete |
| VCL-05 | Phase 9 | Pending |
| VCL-06 | Phase 9 | Pending |
| CI-01 | Phase 10 | Pending |
| CI-02 | Phase 10 | Pending |
| CI-03 | Phase 10 | Pending |
| CI-04 | Phase 10 | Pending |
| CI-05 | Phase 10 | Pending |
| MON-01 | Phase 10 | Pending |
| MON-02 | Phase 10 | Pending |
| MON-03 | Phase 10 | Pending |
| MON-04 | Phase 10 | Pending |
| MON-05 | Phase 10 | Complete |
| MON-06 | Phase 10 | Pending |
| MOB-01 | Phase 11 | Pending |
| MOB-02 | Phase 11 | Pending |
| MOB-03 | Phase 11 | Pending |
| MOB-04 | Phase 11 | Pending |
| MOB-05 | Phase 11 | Pending |
| MOB-06 | Phase 11 | Pending |
| STG-01 | Phase 11 | Pending |
| STG-02 | Phase 11 | Pending |
| STG-03 | Phase 11 | Pending |
| STG-04 | Phase 11 | Pending |
| STG-05 | Phase 11 | Pending |
| STG-06 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 — traceability filled by roadmapper*

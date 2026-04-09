# Feature Research

**Domain:** Production deployment pipeline — Cleanly marketplace v1.1 (Turborepo monorepo, 6 apps, Gulf region)
**Researched:** 2026-04-09
**Confidence:** HIGH — verified against official Fly.io, Neon, Expo, Stripe, Sentry, and GitHub Actions documentation

> NOTE: v1.0 feature research (application features) is preserved in git history. This file covers v1.1 deployment and operations features only. All application features are already built and verified.

---

## Context

All 6 app surfaces are built and locally functional. The question this document answers is:

**What operational infrastructure must exist before the first beta user touches the platform, and what can be deferred without risking a 3am incident?**

The framing is operational risk. Features are classified by whether their absence causes a production incident ("what pages you at 3am"), not by user-visible value.

---

## Feature Landscape

### Table Stakes (Must-Have Before Beta)

Missing any of these makes a beta launch reckless — data loss, invisible payment failures, undetectable outages, or no ability to push fixes.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Staging environment (Neon branch + Fly.io staging app + Vercel staging)** | Without staging, every deploy is a live experiment on real users. A bad migration or misconfigured env var hits paying customers. | MEDIUM | Separate Neon branch (`cleanly-staging`), separate Fly.io app (`cleanly-api-staging`), separate Vercel project. All use Stripe test mode keys. |
| **`.env` validation at startup for all 6 apps** | Code already has graceful env assertions — but must cover all surfaces. Production crashes silently on a missing var without this. | LOW | Zod-based env validation (already partially in place). Fail at startup, not when a customer hits the endpoint. |
| **GitHub Actions CI: lint + typecheck + test on every PR** | Turborepo is wired but CI must cover all 6 apps. A broken deploy from an unchecked app introduces regressions under solo-dev time pressure. | LOW | `pnpm turbo lint typecheck test --filter='...[origin/main]'`. Add `TURBO_TOKEN` + `TURBO_TEAM` env vars for remote cache. Already exists — verify all apps are covered. |
| **Automated deploy to staging on merge to `main`** | Manual staging deploys are skipped when busy. Staging becomes stale and loses its value as a validation environment. | MEDIUM | GitHub Actions job triggers `flyctl deploy --app cleanly-api-staging` + Vercel preview after merge to main. |
| **Neon migration strategy: branch → validate → promote** | Running `prisma migrate deploy` directly against production = risk of irreversible schema change. Neon branching is purpose-built to prevent this. | MEDIUM | Create Neon branch from production, run migration against branch, validate, then run against production. Requires two connection strings: `DATABASE_URL` (PgBouncer pooled, for runtime) and `DIRECT_URL` (TCP direct, for `prisma migrate` only — Prisma Migrate does not support PgBouncer). |
| **Fly.io health check endpoint (`GET /healthz` → 200)** | Fly Proxy routes traffic to a new deployment only after health check passes. Without this, broken deploys silently receive live traffic until they time out. | LOW | Return `{ status: "ok", version: process.env.npm_package_version }`. Grace period: 10s. Must always return 200 — no auth, no redirects. |
| **Stripe webhook endpoint with HMAC signature verification** | Without `stripe.webhooks.constructEvent()`, any actor can POST fake payment events to trigger payouts or order completions. This is a financial integrity requirement, not hardening. | LOW | Likely implemented in v1.0 — verify raw body is passed (not JSON.parse). Fastify requires explicit raw body collection. Separate webhook secrets for staging vs production in Stripe dashboard. Default 5-minute timestamp tolerance prevents replay attacks. |
| **SSL/TLS on all surfaces** | Stripe requires TLS 1.2+ in live mode for webhook delivery. Fly.io and Vercel provision TLS automatically on custom domains. | LOW | Zero config on Fly.io/Vercel. Cloudflare: set SSL mode to "Full (strict)". Verify no hardcoded `http://` base URLs remain after deploy. |
| **CORS production config (named origins, not wildcard)** | Wildcard `*` CORS with `credentials: true` violates the browser spec and silently fails — all authenticated requests from the customer web app return CORS errors. | LOW | `@fastify/cors` with `origin: ['https://cleanly.ae', 'https://app.cleanly.ae']`. Staging uses staging URLs. Never combine `*` with `credentials: true`. |
| **Cloudflare R2 CORS policy on production bucket** | Washers upload photos directly from the mobile app via presigned PUT URLs. Without R2 CORS configured, PUT requests from the app domain return 403. | LOW | Set `AllowedOrigins` to the exact app domain. Set `AllowedHeaders: ["content-type"]` — R2 does not honor `*` in AllowedHeaders (unlike AWS S3, where `*` works). This is an R2-specific gotcha. |
| **Error tracking (Sentry) on all 6 surfaces with source maps** | Without Sentry, production errors are invisible until a user complains. Source maps are mandatory — without them, stack traces point to minified line numbers and are unreadable. | MEDIUM | `@sentry/node` on Fastify API with `Sentry.setupFastifyErrorHandler(app)`. `@sentry/nextjs` on both Next.js apps. `@sentry/react` on company-web. `@sentry/react-native` on both Expo apps. Source map upload must be a CI step (not manual). Do not use `source-map-support` package alongside Sentry — they conflict. Sentry free tier (5K errors/mo) is sufficient for beta. |
| **Secrets in platform stores (not the repository)** | Committing secrets = permanent exposure, even after deletion from git history. For a solo dev with 6 apps, GitHub Actions environment secrets + Fly.io `fly secrets set` + Vercel env vars is sufficient — no Vault needed. | LOW | GitHub Actions: environment-scoped secrets (one `staging` environment, one `production` environment). Fly.io: `fly secrets set KEY=value --app cleanly-api`. Vercel: dashboard per project. Never commit `.env.production` to git. |
| **BullMQ worker deployed as a separate Fly.io machine** | BullMQ workers are long-lived processes. If colocated on the API machine, an API redeploy kills in-flight jobs mid-execution — notification half-sent, payout not completed, order in corrupt intermediate state. | LOW | Same Docker image, different start command (`node dist/worker.js` vs `node dist/server.js`). Both machines share the same Upstash Redis Fixed Plan. |
| **Upstash Redis Fixed Plan (not Pay-As-You-Go)** | BullMQ polls Redis every few seconds even when idle. PAYG billing accumulates $200-400/month in unexpected polling charges. Documented by Upstash in their BullMQ integration notes. | LOW | Create Upstash account, select Fixed Plan ($10/mo) explicitly. Do not auto-provision via integration — it often defaults to PAYG. |
| **EAS Build production builds (iOS + Android)** | `expo start` and Expo Go do not support push notifications or GPS background tracking from SDK 52 onwards. Both are required features of the washer app. Production builds are mandatory before real device testing. | MEDIUM | `eas build --platform all --profile production`. iOS: submit to TestFlight internal testing (up to 100 testers, no App Store review required). Android: submit to Google Play Internal Testing track. Requires Apple Developer ($99/yr) and Google Play ($25 one-time) accounts. |
| **EAS Update OTA channels (staging and production)** | Without OTA channels, a JS-layer bug fix in the washer or customer app requires a full app store submission with 24-72h review wait. EAS Update bypasses this for all JS changes. | LOW | Configure `eas.json` with `staging` and `production` channels. Staging builds point to `staging` channel; production builds to `production` channel. Never `eas update --channel production` without staging validation first. |
| **Rate limiting Redis-backed in production** | `@fastify/rate-limit` defaults to in-memory store, which resets on every Fly.io machine restart or deploy. This means OTP endpoints are effectively unprotected in production — the rate limit evaporates on every redeploy. | LOW | Configure `@fastify/rate-limit` with Upstash Redis store. OTP: 3 requests/phone/15min. Payment initiation: 10/user/min. This is a config change, not a code change. |

---

### Differentiators (Should-Have — Add Before Public Launch After Staging Validates)

These improve operational quality and reduce incident probability, but the platform can run beta without them. None of them are 3am incidents on their own.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Uptime monitoring with alerting (Better Stack)** | Without external uptime monitoring, a full platform outage is detected only when a user complains. Better Stack checks every 30 seconds from multiple global regions and sends SMS/Slack alert immediately. Better Stack free tier covers 10 monitors with 3-minute intervals — sufficient for beta. | LOW | Monitor: Fastify `/healthz`, customer-web Vercel URL, admin-web Vercel URL, company-web Vercel URL. Alert to phone + Slack on any downtime. Setup is configuration, not engineering work. |
| **Structured log aggregation (Better Stack Logs drain on Fly.io)** | Fly.io provides live log tail but no retention beyond ~24 hours and no search. When a company reports "an order failed yesterday evening," you need retroactive search. | LOW | Configure Fly.io log drain to Better Stack. Fastify's native logger is `pino` (structured JSON) — likely already in place. Better Stack free tier: 1GB/day, 3-day retention. Sufficient for beta investigation. |
| **Sentry performance tracing (10% sample rate)** | Error tracking tells you what broke. Performance tracing tells you what is slow before users experience it — slow Prisma queries, Socket.io latency spikes, slow Neon cold starts. | LOW | Enable `tracesSampleRate: 0.1` in production Sentry config. At 10% sampling, no meaningful performance overhead. Zero additional cost on Sentry free tier. Part of the same Sentry setup as error tracking. |
| **Stripe webhook event idempotency** | Stripe retries failed webhook deliveries for up to 3 days. If your endpoint times out or returns 5xx, the event is retried — potentially processing the same `payment_intent.succeeded` or `transfer.reversed` twice (double-payout, double-refund). | MEDIUM | Check Stripe event ID against a Redis key or a `processed_stripe_events` DB table before processing. Mark as processed after success. Especially critical for payout and refund events. |
| **Deployment rollback procedure (RUNBOOK.md)** | When a broken deploy reaches production, the first 5-10 minutes are spent remembering the rollback command. A written procedure (10 lines) changes this from panic to a 2-minute operation. | LOW | Fly.io: `flyctl releases list --app cleanly-api` + `flyctl deploy --image [hash] --app cleanly-api`. Vercel: one-click rollback in dashboard. EAS: `eas update --channel production --branch [previous]`. Document this before it is needed. |
| **Database connection pool tuning** | Default Prisma pool of 10 connections per instance is fine for one machine under low load. Under concurrent load or with multiple API instances, pool exhaustion causes 500 errors with no clear error message. | LOW | Add `?connection_limit=10&pool_timeout=20&pgbouncer=true` to `DATABASE_URL`. Neon PgBouncer handles the Neon-side limit (up to 10K connections). This is a connection string parameter change, not a code change. |
| **Mobile crash reporting (Sentry for React Native with native layer)** | JS errors are captured by Sentry. Native crashes (OOM, GPS background service kill, Samsung power management) are not captured without `@sentry/react-native` properly initialized with native modules. Without this, washer app crashes on Samsung devices are invisible. | LOW | Ensure `@sentry/react-native` is initialized before the app renders (not in a useEffect). Separate DSNs for customer-mobile and washer-mobile for isolation. Requires native module linking in EAS build config. |
| **Docker build layer caching (Fly.io)** | Cold Fly.io deploys rebuild the entire Docker image including `pnpm install` on every deploy. For a Turborepo monorepo with many dependencies, this takes 3-5 minutes. Layer caching reduces this to under 60 seconds. | MEDIUM | `COPY pnpm-lock.yaml .` + `RUN pnpm install --frozen-lockfile` before `COPY . .` in Dockerfile. Fly.io respects Docker layer cache when lockfile is unchanged. |

---

### Anti-Features (Avoid — High Operational Cost for Solo Dev)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **HashiCorp Vault for secrets** | Centralized secrets, rotation, audit trail | Requires a running Vault server, token renewal workflow, seal/unseal procedures. A single misconfiguration locks you out of all credentials across all apps. Operational overhead is disproportionate for one developer. | GitHub Actions environment secrets + Fly.io `fly secrets` + Vercel env vars. Sufficient for a solo dev with 6 apps. No ongoing maintenance. |
| **Full observability stack (Prometheus + Grafana)** | Rich dashboards, custom metrics, fine-grained alerting | Prometheus requires a persistent metrics store (an additional machine), scrape configs, alert rules, and dashboard JSON maintenance. A week of setup to replicate what Better Stack + Sentry provide for free in 30 minutes. | Better Stack uptime + Sentry errors + Fly.io built-in metrics dashboard. Revisit Prometheus at 10K+ users when free tier limits become an issue. |
| **Blue-green deployments** | Zero-downtime deploys | Requires maintaining two identical production environments simultaneously, doubling infrastructure cost. For a solo dev at launch scale, Fly.io rolling deploy + health checks already provide near-zero-downtime without this complexity. | Fly.io rolling deploy with `min_machines_running = 1` and `/healthz` health check. |
| **Multi-region API at launch** | Lower latency for KSA/Egypt users | Socket.io requires sticky sessions or Redis adapter when running across regions. KSA/Egypt are not in the launch market. Adding multi-region before UAE is validated creates operational complexity for zero users. | Single Fly.io Bahrain region (`bah`). Add KSA/Egypt regions when those markets open — Redis adapter addition is one afternoon of work. |
| **Kubernetes / container orchestration** | Enterprise-grade scaling | Fly.io already runs on Kubernetes internally. `fly deploy` is the equivalent of `kubectl apply`. There is no workload at launch that requires direct Kubernetes access. | Fly.io. |
| **ELK stack (Elasticsearch + Logstash + Kibana)** | Full-text log search, 30-day retention | Three services, $80-150/mo on a managed provider, ongoing maintenance. Solves the same problem as Better Stack Logs at $0 during beta. | Better Stack Logs drain on Fly.io. Pino structured logging. |
| **Feature flags service (LaunchDarkly, Unleash)** | Gradual rollout, A/B testing | Valuable at scale but requires integration across all 6 apps and ongoing flag management. For a beta with one developer, `process.env.FEATURE_X` env vars are sufficient and have zero integration overhead. | Environment variable flags. Promote to a flags service when A/B tests are meaningful (requires user base). |
| **Separate pg_dump backup cron job** | Data protection beyond Neon defaults | Neon automatically takes PITR snapshots. A parallel pg_dump cron creates two competing backup strategies and does not add safety — it creates confusion about which backup to use during recovery. | Verify Neon retention period before beta: 7 days on free tier, 30 days on Launch ($19/mo) plan. Upgrade Neon tier if 7-day retention is insufficient for beta. |

---

## Feature Dependencies

```
[Staging environment]
    └──requires──> [Neon staging branch]
    └──requires──> [Fly.io staging app]
    └──requires──> [Separate .env.staging secrets in GitHub Actions]
    └──required by──> [Automated deploy to staging]

[GitHub Actions CI pipeline]
    └──requires──> [GitHub Actions secrets configured (Fly deploy token, Vercel token)]
    └──enables──>  [Automated deploy to staging on merge to main]
    └──enables──>  [Sentry source map upload on deploy]

[Neon migration strategy]
    └──requires──> [DIRECT_URL in .env (non-pooled TCP, for prisma migrate only)]
    └──requires──> [DATABASE_URL in .env (PgBouncer pooled, for runtime)]
    └──blocks──>   [Production deploy] (validate migration on branch before running on prod)

[EAS Build production builds]
    └──requires──> [Apple Developer account ($99/yr)]
    └──requires──> [Google Play account ($25 one-time)]
    └──requires──> [eas.json configured with staging + production profiles]
    └──enables──>  [EAS Update OTA channels]
    └──enables──>  [Push notifications in production]
    └──enables──>  [GPS background tracking validation on real device]
    └──enables──>  [Mobile crash reporting (Sentry React Native native layer)]

[Sentry error tracking]
    └──requires──> [Source map upload step in GitHub Actions deploy job]
    └──enables──>  [Sentry performance tracing] (same SDK, just enable tracesSampleRate)
    └──enables──>  [Mobile crash reporting] (same SDK, native module linking)

[Rate limiting (production)]
    └──requires──> [Upstash Redis Fixed Plan] (in-memory store resets on every deploy)

[BullMQ worker (separate machine)]
    └──requires──> [Upstash Redis Fixed Plan]
    └──requires──> [Fly.io separate machine with different CMD]

[Stripe webhook signature verification]
    └──requires──> [Raw body collected before JSON parsing] (verify Fastify config)
    └──requires──> [Separate STRIPE_WEBHOOK_SECRET per environment]

[Stripe webhook idempotency]
    └──requires──> [Stripe webhook signature verification] (must verify before dedup check)
    └──requires──> [Redis key or DB table for event deduplication]

[Uptime monitoring]
    └──requires──> [/healthz endpoint deployed and returning 200]
    └──enhances──> [Deployment rollback procedure] (tells you when a rollback is needed)

[Structured log aggregation]
    └──requires──> [Fly.io log drain configured to Better Stack]
    └──requires──> [Pino structured logger on Fastify API]
```

### Dependency Notes

- **`DIRECT_URL` is mandatory for Prisma Migrate with Neon.** Prisma Migrate explicitly does not support PgBouncer connection pooling. The pooled `DATABASE_URL` works for runtime app queries. The direct `DIRECT_URL` is required for `prisma migrate deploy` in CI. Without it, migrations silently fail or time out.
- **EAS Build blocks production push notification testing.** Expo Go and `expo start` do not support Expo Push Notifications from SDK 52 onwards. Any testing of notifications on real devices requires a production EAS Build. Do not attempt to validate the notification flow without completing EAS Build first.
- **Sentry source maps must be a CI step, not a manual action.** Source maps change on every build. Manual upload is forgotten under pressure. Add `sentry-cli sourcemaps upload` to the GitHub Actions deploy job for all 6 apps at initial setup.
- **Rate limiting requires Redis-backed store before production.** The in-memory `@fastify/rate-limit` store resets on every Fly.io machine restart or rolling deploy. This means the OTP endpoint has no effective rate limiting in production without this change.
- **R2 `AllowedHeaders` cannot be `*`.** Unlike AWS S3 where `AllowedHeaders: ["*"]` works for presigned URLs, Cloudflare R2 requires explicit header names. Use `["content-type"]` for photo upload presigned PUTs.

---

## MVP Definition

### Launch With (v1.1 — Before First Beta User)

These must be done or the platform has either invisible failures, financial risk, or no way to fix mobile bugs quickly.

- [ ] Staging environment (Neon branch + Fly.io staging + Vercel staging) — every fix tested before hitting real users
- [ ] `.env` validation at startup for all 6 apps — no silent undefined crashes
- [ ] GitHub Actions CI: lint + typecheck + test — no broken deploys from unchecked apps
- [ ] Automated deploy to staging on merge to main — staging stays current
- [ ] Neon migration strategy: branch → validate → promote — no irreversible schema changes
- [ ] Fly.io `/healthz` health check endpoint — zero-downtime rolling deploys
- [ ] Stripe webhook signature verification (verify and harden v1.0 implementation) — payment integrity
- [ ] SSL/TLS verified on all surfaces — Stripe live mode requires TLS 1.2+
- [ ] CORS production config (named origins) — authenticated requests work in production browsers
- [ ] Cloudflare R2 CORS policy on production bucket (`content-type` header, named origin) — photo uploads work
- [ ] Sentry on all 6 surfaces with source maps uploaded in CI — errors are visible and debuggable
- [ ] Secrets in platform stores (not repo) — GitHub Actions envs + Fly.io secrets + Vercel env vars
- [ ] BullMQ worker as separate Fly.io machine — no job corruption on API redeploy
- [ ] Upstash Redis Fixed Plan (explicitly, not PAYG) — predictable cost, no $400/mo polling bill
- [ ] EAS Build production builds (iOS + Android) — required for push notifications and GPS background
- [ ] EAS Update OTA channels (staging + production) — hotfixes without 24-72h app store review wait
- [ ] Rate limiting Redis-backed in production — effective OTP and payment endpoint protection

### Add After Staging Validates (v1.1 — Before Public Launch)

Safe to do during the staging validation window. None of these block beta users but all block public launch.

- [ ] Uptime monitoring (Better Stack) with SMS alert — know about outages before users report them
- [ ] Structured log aggregation (Better Stack drain) — retroactive incident investigation
- [ ] Sentry performance tracing at 10% sample rate — slow query detection before user complaints
- [ ] Stripe webhook idempotency — prevents double-payout/double-refund on Stripe retry
- [ ] Deployment rollback procedure documented (RUNBOOK.md) — 2-minute recovery instead of 20-minute panic
- [ ] Database connection pool tuning (`connection_limit` in DATABASE_URL) — pool exhaustion prevention

### Future Consideration (v1.2+)

These are conveniences or scale concerns, not safety requirements.

- [ ] Neon branch per PR in CI — high value for migration-heavy phases, overkill for ops milestone
- [ ] Docker build layer caching — reduces deploy time 3-5min → 60s; annoying, not blocking
- [ ] Multi-region Fly.io deployment — when KSA/Egypt markets open (add Redis adapter at that point)
- [ ] Feature flags service — when user base is large enough for meaningful A/B tests
- [ ] Prometheus + Grafana — when Better Stack + Sentry free tiers become constraints

---

## Feature Prioritization Matrix

| Feature | Incident Risk if Missing | Implementation Cost | Priority |
|---------|--------------------------|---------------------|----------|
| Staging environment | HIGH — every deploy is a live experiment | MEDIUM | P1 |
| `.env` startup validation | HIGH — silent undefined crashes in prod | LOW | P1 |
| GitHub Actions CI | MEDIUM — regressions reach production | LOW | P1 |
| Automated staging deploy | MEDIUM — staging goes stale | MEDIUM | P1 |
| Neon migration strategy | CRITICAL — data loss on bad migration | MEDIUM | P1 |
| Fly.io `/healthz` | HIGH — broken deploys receive live traffic | LOW | P1 |
| Stripe webhook sig verify | CRITICAL — fake events trigger payouts | LOW | P1 |
| SSL/TLS verified | HIGH — Stripe live mode requires it | LOW | P1 |
| CORS production config | HIGH — authenticated requests fail in browser | LOW | P1 |
| R2 CORS policy | HIGH — photo upload fails (orders can't complete) | LOW | P1 |
| Sentry + source maps | HIGH — errors invisible without it | MEDIUM | P1 |
| Secrets in platform stores | HIGH — security | LOW | P1 |
| BullMQ separate machine | MEDIUM — job corruption on redeploy | LOW | P1 |
| Upstash Fixed Plan | HIGH — $400/mo bill, then Redis goes down | LOW | P1 |
| EAS Build production | HIGH — push notifications and GPS require it | MEDIUM | P1 |
| EAS Update OTA channels | MEDIUM — hotfixes require app store review without it | LOW | P1 |
| Rate limiting Redis-backed | HIGH — OTP unprotected in production | LOW | P1 |
| Uptime monitoring | MEDIUM — outages undetected | LOW | P2 |
| Structured log aggregation | MEDIUM — incident investigation impossible | LOW | P2 |
| Sentry performance tracing | LOW — slow queries undetected | LOW | P2 |
| Stripe webhook idempotency | MEDIUM — double-payout on Stripe retry | MEDIUM | P2 |
| Rollback procedure documented | MEDIUM — recovery takes 20min not 2min | LOW | P2 |
| DB connection pool tuning | MEDIUM — pool exhaustion under load | LOW | P2 |
| Docker layer caching | LOW — slow deploys, not an incident | MEDIUM | P3 |
| Neon branch per PR | LOW — migration safety, not needed for ops | MEDIUM | P3 |
| Multi-region deployment | LOW — UAE-only at launch | HIGH | P3 |

**Priority key:**
- P1: Required before any beta user touches the platform
- P2: Required before public launch (add during staging validation window)
- P3: Future consideration — scale/convenience, not safety

---

## Operational Risk Assessment ("What Pages You at 3am")

| Missing Feature | Incident Scenario | Wake-Up Severity |
|-----------------|-------------------|------------------|
| No staging | Bad migration drops a column → all new orders fail in production | CRITICAL — data loss |
| No Neon branch migration | `prisma migrate deploy` runs directly on prod → drops FK → order table corrupted | CRITICAL — data loss |
| No `/healthz` | Deploy hangs → Fly routes traffic to dead instance → 100% 503 for all users | CRITICAL — full outage |
| Stripe webhook no sig verify | Attacker POSTs fake `payment_intent.succeeded` → payout triggered → financial loss | CRITICAL — financial |
| Rate limiting in-memory | OTP brute-forced after redeploy resets counter → account takeover | HIGH — security |
| Upstash PAYG not Fixed Plan | BullMQ polling accumulates $300+ bill → payment method fails → Redis down → all BullMQ jobs stop → no notifications, no payouts | HIGH — cascade failure |
| R2 CORS not configured | Washer photo upload returns 403 → order cannot complete → all washer-completed orders stuck | HIGH — business-critical feature broken |
| CORS wildcard + credentials | Safari blocks all cross-origin authenticated requests → payment page broken for iOS users | HIGH — Safari/iOS is primary device in UAE |
| Sentry no source maps | 500 errors tracked but stack traces unreadable → hours to diagnose which line broke | HIGH — operational blindness |
| No EAS Build production | Cannot test push notifications or GPS background on device → ship with unverified critical features | HIGH — known untested requirement |
| BullMQ on API machine | API redeploy kills in-flight payout job mid-transfer → company payout missing → dispute | MEDIUM — financial integrity |
| No uptime monitoring | Platform down 2+ hours before anyone notices → companies miss orders → churn | MEDIUM — revenue loss |
| No log drain | Post-incident: cannot reconstruct what happened → no explanation for affected users | MEDIUM — trust |
| No EAS OTA channels | JS bug in washer app → 24-72h App Store review wait → washers using broken app during review | MEDIUM — operations |
| No rollback procedure documented | Broken deploy → 20 minutes of panic to remember the rollback command | LOW — recovery time |

---

## Sources

- Fly.io docs — health checks and seamless deployments: https://fly.io/docs/blueprints/seamless-deployments/
- Fly.io docs — secrets management: https://fly.io/docs/apps/secrets/
- Neon docs — Prisma migrations with branching: https://neon.com/docs/guides/prisma-migrations
- Neon docs — connection pooling (DIRECT_URL requirement): https://neon.com/docs/connect/connection-pooling
- Prisma docs — Neon integration: https://www.prisma.io/docs/orm/overview/databases/neon
- Stripe docs — webhook signature verification and replay prevention: https://docs.stripe.com/webhooks
- Stripe docs — signature verification errors: https://docs.stripe.com/webhooks/signature
- Sentry docs — Fastify integration: https://docs.sentry.io/platforms/javascript/guides/fastify/
- Sentry docs — source maps for Fastify: https://docs.sentry.io/platforms/javascript/guides/fastify/sourcemaps/
- Expo docs — EAS Update deployment channels: https://docs.expo.dev/eas-update/deployment/
- Expo blog — production OTA update playbook: https://expo.dev/blog/the-production-playbook-for-ota-updates
- Expo docs — distributing for review (TestFlight + Play): https://docs.expo.dev/review/overview/
- Expo docs — EAS Submit: https://docs.expo.dev/submit/introduction/
- Cloudflare R2 docs — CORS configuration: https://developers.cloudflare.com/r2/buckets/cors/
- Cloudflare R2 docs — presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Turborepo docs — GitHub Actions CI: https://turborepo.dev/docs/guides/ci-vendors/github-actions
- Better Stack — log management: https://betterstack.com/log-management
- WebSearch: solo developer secrets management — GitHub native environment secrets sufficient for single-repo single-developer (Vault overkill per community consensus)
- WebSearch: Upstash BullMQ PAYG polling cost — documented issue, Fixed Plan required
- WebSearch: Cloudflare R2 AllowedHeaders `*` does not work (differs from AWS S3) — community confirmed

---

*Feature research for: Cleanly — v1.1 production deployment pipeline*
*Researched: 2026-04-09*

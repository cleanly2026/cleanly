# Phase 10: CI/CD & Monitoring - Research

**Researched:** 2026-04-14
**Domain:** GitHub Actions + Fly.io + Vercel + Sentry + Better Stack + Prisma idempotency
**Confidence:** HIGH (all 5 workstreams verified against 2026 official docs; one correction to CONTEXT.md D-15 flagged)

## Summary

Phase 10 is glue work across 5 mature systems — the risk is not "will the tool do it" but "will the 2026-current flags and patterns line up with our exact stack (Fastify 5 + Next.js 15.5 + Expo SDK 55 + Prisma 6 + pnpm 9 + Turborepo)". The biggest concrete gotchas the planner must bake into tasks:

1. **`fly releases rollback` does not exist.** CONTEXT.md D-15 mentions `flyctl releases rollback` but the canonical 2026 Fly.io rollback idiom is `fly deploy --image <prior-registry-tag>`. The `pnpm rollback:api` script must wrap an image-based redeploy, not a non-existent rollback subcommand. Official Fly Rollback Guide confirms: *"There's no special rollback command because you don't need one. Rollbacks use the same deploy mechanism you already know."* The runbook and helper script design hinges on this.
2. **Sentry → Discord is a native integration, not a raw webhook.** Install via Sentry → Settings → Integrations → Discord. Configures per-server/channel-id. CONTEXT.md D-13 mentions "Discord webhook URL in 1Password" — the URL itself is not what Sentry uses in the native path; it's an OAuth install. The webhook URL *is* needed for Better Stack (which doesn't have a native Discord install). Two separate flows.
3. **Next.js source map upload without the bundler plugin** uses `sentry-cli sourcemaps upload --release=<sha> --url-prefix '~/_next' .next`, run after `next build` and before the Vercel upload. Turbopack (Next.js 15.5.15 here, not 16) produces source maps fine; needs `productionBrowserSourceMaps: true` in `next.config.js` to emit them.
4. **Prisma insert-before-process idempotency** uses `await prisma.processedStripeEvent.create({ data: {...} })` wrapped in try/catch for `PrismaClientKnownRequestError` with `code === 'P2002'` (unique constraint violation). `createMany({skipDuplicates: true})` returns `{count}` which CAN distinguish new vs duplicate for a single-row case (`count === 1` = new, `count === 0` = duplicate) and sidesteps the try/catch — recommended for clarity.
5. **Better Stack Fly log drain** is not a built-in Fly drain — it's a separate `fly launch` of the `flyio/log-shipper:latest` image in the same org, configured via secrets (`BETTER_STACK_SOURCE_TOKEN`, `BETTER_STACK_INGESTING_HOST`, org-scoped read token).

**Primary recommendation:** Split GitHub Actions into two workflow files: `ci.yml` (already exists, extend with Prisma schema validation only) and a new `deploy.yml` (env-matrixed, branch-gated). Runs `prisma migrate deploy` using `DIRECT_URL` as an explicit job that blocks the Fly + Vercel jobs. Use `fly deploy --image-label $SENTRY_RELEASE` so rollback is a memorable tag. Upload source maps via `@sentry/cli` with `SENTRY_RELEASE=$(git rev-parse --short HEAD)` shared across all 6 surfaces. `pnpm rollback:api` wraps `fly deploy --image registry.fly.io/cleanly-api:<tag>`, not a rollback subcommand.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CI/CD Pipeline**
- **D-01:** Deploy orchestration = **all-in GitHub Actions**. One pipeline owns lint/typecheck/test → `prisma migrate deploy` → `flyctl deploy` (API + worker) → Vercel deploy hooks for the 3 web apps. Secrets live in GitHub Environments (staging + production); Vercel Git auto-deploy is explicitly disabled.
- **D-02:** Branch model = **`staging` auto-deploys staging, `main` auto-deploys production**. No manual approval gate.
- **D-03:** Prisma migrate placement = **dedicated CI job before Fly deploy**. Uses Neon `DIRECT_URL`. Does NOT use Fly `release_command`.
- **D-04:** CI test scope = **current (lint/typecheck/unit) + Prisma schema validation / dry-run**. Playwright E2E deferred to Phase 11. No Neon-branch-per-PR.

**Stripe Webhook Hardening**
- **D-05:** Idempotency storage = **new `processed_stripe_events` Postgres table** with `event_id` (string) as primary key + `event_type` + `processed_at` + `order_id` (nullable). Insert-before-process pattern. Adds one Prisma migration.
- **D-06:** Retention = **30-day rolling cleanup** via daily BullMQ repeatable job.
- **D-07:** Unknown event handling = **current behavior kept** — log INFO, return 200. Signature verification + raw body handler NOT re-touched.

**Sentry Coverage**
- **D-08:** Sentry wiring in Phase 10 = **all 4 remaining client surfaces** (customer-web, admin-web, customer-mobile, washer-mobile). Web apps use `@sentry/nextjs` + `@sentry/react`, mobile uses `@sentry/react-native`. Mobile Sentry config goes in now; EAS-build-time source map upload hook is documented but wired in Phase 11.
- **D-09:** Release ID convention = **7-character Git SHA of the deploy commit**, shared across all 6 surfaces. `SENTRY_RELEASE=$(git rev-parse --short HEAD)`.
- **D-10:** Source map upload = **CI post-build, pre-deploy**, via `@sentry/cli releases files ... upload-sourcemaps`. One `SENTRY_AUTH_TOKEN` per GitHub Environment. Does NOT use framework bundler plugins.

**Monitoring & Logs**
- **D-11:** Uptime + log provider = **Better Stack**. 4 URLs probed at 60s / 2-miss: API /healthz staging + prod, plus customer-web/admin-web/company-web home routes.
- **D-12:** Log drain scope = **Fly.io → Better Stack** structured JSON. 3-day retention acceptable.

**Alerting**
- **D-13:** Alert channels = **Email + Discord webhook** (new private server). Webhook URL in 1Password + Sentry + Better Stack alert rules.
- **D-14:** Severity tiers = **two-tier (P0, P1)**. P0 = instant Discord + email (API down ≥ 2min, DB unreachable, webhook 5xx > 10% over 5 min, Fly deploy failure). P1 = email digest hourly (individual Sentry issues, one-off 5xx events).

**Rollback**
- **D-15:** Rollback = **runbook docs (`docs/ROLLBACK.md`) + one-command scripts**. API: `pnpm rollback:api` → wraps `flyctl releases rollback --app cleanly-api`. Web: `pnpm rollback:web` → Vercel dashboard. Mobile: documented forward-looking for EAS Update `republish`.
  - ⚠️ **CORRECTION NOTICE:** `flyctl releases rollback` does not exist as a subcommand in modern flyctl. See §"Rollback Mechanics" below — the script must wrap `fly deploy --image <tag>` instead. Behaviour (one-command rollback) still matches intent; only the underlying CLI call changes.
- **D-16:** Database rollback = **forward-only migrations**. Never `prisma migrate reset` in prod. Neon PITR = emergency only.

### Claude's Discretion

- Exact Prisma schema shape of `processed_stripe_events` (table name casing, index strategy, column order) — planner's call within the constraint that `event_id` is a unique/primary key.
- Exact GitHub Actions workflow file layout: one `deploy.yml` with environment matrix, or `deploy-staging.yml` + `deploy-production.yml` as separate files. Pick whichever is most idiomatic for Turborepo + pnpm.
- Exact `docs/ROLLBACK.md` structure (per-surface sections, TOC, linked runbooks).
- Better Stack monitor grouping / naming convention, alert message templates, Discord webhook message format.
- Whether to add a GitHub Environment protection rule for production even though D-02 says "no manual approval" — a branch protection rule (required status checks) is still appropriate for `main`.
- How the P1 email digest is assembled — Sentry's built-in issue notifications vs a Better Stack-side digest.
- Specific Sentry sample rates per surface beyond the existing API config (`tracesSampleRate: 0.1` in prod). Web defaults `0.1`, mobile defaults `0.1` unless research surfaces something different.

### Deferred Ideas (OUT OF SCOPE)

**Spun off to Phase 11:**
- EAS Build source map upload hook (config goes in mobile Sentry init now, but EAS-side upload wiring ships with Phase 11).
- Playwright E2E in CI.
- Mobile rollback script (`pnpm rollback:mobile`).

**Not in scope for v1.1:**
- SMS paging via Better Stack.
- PagerDuty / Opsgenie / Rootly integration.
- Automated rollback on `/healthz` failure.
- `down.sql` / reverse migrations.
- Neon point-in-time restore as routine rollback.
- Custom Grafana / Prometheus stack.
- Feature flags infra.
- GitHub branch OIDC federation for Vercel/Fly deploy tokens.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CI-01** | GitHub Actions: lint + typecheck + test on PR, deploy on merge to main | Existing `.github/workflows/ci.yml` already covers PR lint/typecheck/test under 15-min timeout. Add Prisma schema validation step (D-04). Success Criteria #1 (< 5 min) — current CI runs well under this. See §"CI Pipeline Mechanics". |
| **CI-02** | Turborepo remote cache via Vercel (TURBO_TOKEN + TURBO_TEAM) | Already wired in ci.yml (lines 53-54, 59-60, 65-66). Deploy workflow reuses these secrets from the same GitHub Environment. No new work beyond propagating env vars to the new `deploy.yml`. |
| **CI-03** | Prisma migrate deploy runs in CI using Neon direct URL (not pooled) | D-03 + §"Prisma Migrate in CI". Uses `DATABASE_URL=$DIRECT_URL` at job-scope; separate from the Fly runtime pooled URL. |
| **CI-04** | Sentry source map upload as CI step after each deploy | D-10 + §"Sentry Source Map Upload". Uses `sentry-cli sourcemaps upload --release=$SENTRY_RELEASE --url-prefix '~/_next' .next` per Next.js app; analogous for RN. |
| **CI-05** | Staging deploys on merge to `staging` branch; production deploys on merge to `main` | D-02. Single `deploy.yml` with `on.push.branches: [staging, main]` trigger. Environment derived from `${{ github.ref_name }}`. |
| **MON-01** | Sentry configured on all 6 app surfaces with source maps resolving correctly | D-08 + §"Sentry Per-Surface Setup". 4 new surfaces + 2 existing (api, company-web). Shared release = 7-char git SHA. |
| **MON-02** | Better Stack uptime monitoring on API health endpoint + all 3 web apps | D-11. 4 monitors at 60s / 2-miss. See §"Uptime & Log Aggregation". |
| **MON-03** | Structured log aggregation from Fly.io to Better Stack | D-12 + §"Better Stack Fly Log Drain". Uses `flyio/log-shipper` image launched as a separate Fly app in same org. |
| **MON-04** | Stripe webhook uses raw body handler (not Fastify JSON parser) | **Already complete** in `apps/api/src/routes/payments/webhook.ts` (line 11: `config: { rawBody: true }`, line 23-26: raw-body-based signature verification). Phase 10 does NOT re-touch this. |
| **MON-05** | Stripe webhook handlers are idempotent (duplicate events don't double-process) | D-05 + §"Stripe Webhook Idempotency". New Prisma model + single `createMany({skipDuplicates:true})` check before the `switch` block. |
| **MON-06** | Rollback runbook documented (how to revert API, web, and mobile deploys) | D-15 + §"Rollback Mechanics". `docs/ROLLBACK.md` + `pnpm rollback:api` (image-based) + `pnpm rollback:web` (dashboard). Mobile deferred to Phase 11. |
</phase_requirements>

## Standard Stack

### Core (Phase 10 additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sentry/nextjs` | `^10.47.0` (match API's @sentry/node) | Sentry wiring for customer-web + admin-web (Next.js 15.5.15) | Official Next.js SDK. Provides client/server/edge init files. We opt OUT of its bundler plugin (per D-10) and use `@sentry/cli` manually. |
| `@sentry/react-native` | `~7.x` (Expo SDK 55 compatible) | Sentry wiring for customer-mobile + washer-mobile | Official RN SDK. Set `release` + `environment` in `Sentry.init` config; no EAS hook needed for init. EAS-side source map upload deferred to Phase 11 (D-08). |
| `@sentry/cli` | latest (pinned in CI) | Manual source map upload + release creation | Single binary, language-agnostic. Lets us keep bundler builds clean (D-10 — bundler plugins make upload failures fail the build). |
| `superfly/flyctl-actions` | `master` (Setup) + specific `flyctl` version pin (e.g. `v0.3.x`) | Install flyctl in CI, deploy API + worker | Official Fly.io action. Pins flyctl via `setup-flyctl@master` + `version:` input to avoid edge-release surprises. |
| (none for Vercel) | — | Vercel deploys triggered via deploy hook URL (curl POST) | CONTEXT.md D-01 requires "Vercel Git auto-deploy is explicitly disabled so ordering is deterministic". Deploy hooks are the supported way to trigger Vercel builds from GitHub Actions without enabling Git integration. Requires per-project Deploy Hook URL stored in GitHub Environment secrets. |
| `better-stack-community/vector-config` (or manual `flyio/log-shipper`) | `flyio/log-shipper:latest` | Fly.io → Better Stack log drain | Better Stack's official Fly integration (`https://betterstack.com/docs/logs/fly-io/`) instructs launching `flyio/log-shipper:latest` as a separate Fly app in the same org. No built-in `fly logs drain` subcommand for Better Stack — the log-shipper image is the canonical path. |

### Supporting (already in repo)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@prisma/client` | `^6.5.0` | ORM for new `ProcessedStripeEvent` model | Always — established pattern |
| `bullmq` | `^5.71.1` | Daily cleanup repeatable job | D-06 retention job |
| `stripe` | `^21.0.1` | Types for webhook events (no SDK change needed) | webhook.ts already uses it |
| `fastify-raw-body` | `^5.0.0` | Raw body for webhook signature verification | Already in place (MON-04 done) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@sentry/cli` manual upload | `withSentryConfig` (Next.js bundler plugin) | Plugin is the "recommended" Sentry-docs default. CONTEXT.md D-10 explicitly rejects it: keeps upload failures separate from build failures (plugin failure fails the Next build). Plugin would also require `authToken` at Vercel build time — currently Vercel auto-deploy is disabled. Staying with CLI. |
| Better Stack Fly integration | Datadog / Grafana Cloud | Better Stack is locked (D-11); free tier covers v1.1. |
| Fly deploy hook per env | Single `fly.toml` + `--app` flag (current) | Already locked in Phase 09 (single `fly.toml`, staging/prod differ by `--app`). No change. |
| Two workflow files (`deploy-staging.yml` + `deploy-production.yml`) | One `deploy.yml` with env matrix | **Recommendation: single `deploy.yml`.** Env derived from `github.ref_name`; job matrix reuses one definition. Matches Vercel+Turbo monorepo idioms. Two-file approach duplicates ~200 lines. |
| `fly secrets set` per-deploy | Secrets already set, immutable across deploys | Current Phase 09 practice (one-time via runbook). Phase 10 does NOT add secret-setting steps to the workflow — only deploy. |

**Installation (additions only):**

```bash
# API already has @sentry/node; nothing to add there.

# New Next.js Sentry surfaces
pnpm --filter @cleanly/customer-web add @sentry/nextjs
pnpm --filter @cleanly/admin-web    add @sentry/nextjs

# New RN Sentry surfaces — use the version bundled with SDK 55's RN peer range
pnpm --filter @cleanly/customer-mobile add @sentry/react-native
pnpm --filter @cleanly/washer-mobile   add @sentry/react-native

# CI-only (no package.json dep — installed in workflow)
# - @sentry/cli via `curl -sL https://sentry.io/get-cli/ | sh`
# - flyctl via superfly/flyctl-actions/setup-flyctl@master
```

**Version verification** (recommend planner runs at task time):
```bash
npm view @sentry/nextjs version
npm view @sentry/react-native version
npm view @sentry/cli version
```
Training-data values may be months stale.

## Architecture Patterns

### Recommended File Additions

```
.github/workflows/
├── ci.yml                    # EXTEND — add Prisma schema validation step
└── deploy.yml                # NEW — env-matrixed deploy pipeline
apps/api/src/
├── routes/payments/webhook.ts   # EDIT — add idempotency INSERT before switch
└── workers/
    ├── cleanup.worker.ts        # NEW — daily BullMQ repeatable job
    └── index.ts                 # EDIT — import cleanup.worker
apps/customer-web/
├── sentry.client.config.ts      # NEW
├── sentry.server.config.ts      # NEW
├── sentry.edge.config.ts        # NEW
├── instrumentation.ts           # NEW (Next.js 15 App Router hook)
└── next.config.js               # EDIT — add productionBrowserSourceMaps: true
apps/admin-web/                  # Same 5 files as customer-web
apps/customer-mobile/
├── sentry.ts                    # NEW
└── app/_layout.tsx              # EDIT — wrap root layout with Sentry.wrap()
apps/washer-mobile/              # Same 2 files
packages/db/
└── schema.prisma                # EDIT — add ProcessedStripeEvent model
docs/
└── ROLLBACK.md                  # NEW
package.json                     # EDIT — add rollback:api, rollback:web scripts
turbo.json                       # EDIT — add SENTRY_RELEASE, SENTRY_AUTH_TOKEN to tasks.build.env
```

### Pattern 1: Single `deploy.yml` with Environment Matrix (recommended)

**What:** One workflow file, triggered on push to `staging` or `main`, derives the GitHub Environment from the branch, runs migrate → Fly → Vercel sequentially.

**When to use:** Monorepo with two environments and symmetric deploy shape (same steps, different secrets). Matches Turborepo's recommended pattern.

**Skeleton:**
```yaml
name: Deploy
on:
  push:
    branches: [staging, main]

concurrency:
  group: deploy-${{ github.ref_name }}
  cancel-in-progress: false  # never cancel a deploy mid-flight

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      env_name: ${{ steps.derive.outputs.env_name }}
      sha: ${{ steps.derive.outputs.sha }}
    steps:
      - uses: actions/checkout@v4
      - id: derive
        run: |
          if [ "${{ github.ref_name }}" = "main" ]; then
            echo "env_name=production" >> $GITHUB_OUTPUT
          else
            echo "env_name=staging" >> $GITHUB_OUTPUT
          fi
          echo "sha=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

  migrate:
    needs: setup
    runs-on: ubuntu-latest
    environment: ${{ needs.setup.outputs.env_name }}
    env:
      DATABASE_URL: ${{ secrets.DIRECT_URL }}  # migrations use direct, not pooled
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @cleanly/db exec prisma migrate deploy

  deploy_api:
    needs: [setup, migrate]  # gated on migrate success
    runs-on: ubuntu-latest
    environment: ${{ needs.setup.outputs.env_name }}
    env:
      SENTRY_RELEASE: ${{ needs.setup.outputs.sha }}
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy to Fly
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        run: |
          APP_NAME=$( [ "${{ needs.setup.outputs.env_name }}" = "production" ] && echo "cleanly-api" || echo "cleanly-api-staging" )
          flyctl deploy --app "$APP_NAME" --image-label "$SENTRY_RELEASE" --remote-only

  upload_sourcemaps_api:
    needs: [setup, deploy_api]
    runs-on: ubuntu-latest
    environment: ${{ needs.setup.outputs.env_name }}
    steps:
      # See §"Sentry Source Map Upload" below for exact commands.

  deploy_web:
    needs: [setup, migrate]  # webs don't need API deployed first
    strategy:
      matrix:
        app: [customer-web, admin-web, company-web]
    runs-on: ubuntu-latest
    environment: ${{ needs.setup.outputs.env_name }}
    env:
      SENTRY_RELEASE: ${{ needs.setup.outputs.sha }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @cleanly/${{ matrix.app }} build
      - name: Upload source maps to Sentry
        run: |
          curl -sL https://sentry.io/get-cli/ | sh
          # See §"Sentry Source Map Upload" for exact flags per framework
      - name: Trigger Vercel deploy hook
        run: |
          case "${{ matrix.app }}" in
            customer-web)  HOOK="${{ secrets.VERCEL_DEPLOY_HOOK_CUSTOMER_WEB }}" ;;
            admin-web)     HOOK="${{ secrets.VERCEL_DEPLOY_HOOK_ADMIN_WEB }}" ;;
            company-web)   HOOK="${{ secrets.VERCEL_DEPLOY_HOOK_COMPANY_WEB }}" ;;
          esac
          curl -fsS -X POST "$HOOK"
```

**Critical details:**
- `concurrency.cancel-in-progress: false` — never kill a deploy mid-flight.
- `migrate` job's `DATABASE_URL` is `secrets.DIRECT_URL` (D-03).
- `deploy_api` uses `flyctl deploy --image-label $SENTRY_RELEASE` so rollback can target by tag.
- Vercel triggered via **deploy hook URL** (one per project, stored as 3 GitHub Environment secrets). This is compatible with "Vercel Git auto-deploy is disabled" (D-01).
- Web apps **don't block on `deploy_api`** — they don't share runtime. Only `migrate` blocks (web needs DB schema current only if it reads DB types from Prisma build output, which is not the runtime case here).

### Pattern 2: Insert-Before-Process Idempotency (Prisma)

**What:** Before the `switch (event.type)` block, attempt to insert the event ID. If the insert inserts 1 row, process; if 0 rows (already present), return 200 without processing.

**When to use:** Always, for every webhook event. This is the pattern for MON-05.

**Example (canonical for Prisma 6 + Postgres):**
```typescript
// apps/api/src/routes/payments/webhook.ts
// Right after `event = stripe.webhooks.constructEvent(...)` succeeds:

const inserted = await prisma.processedStripeEvent.createMany({
  data: [{
    event_id: event.id,
    event_type: event.type,
    // processed_at defaults to now() in the schema
  }],
  skipDuplicates: true,
})

if (inserted.count === 0) {
  fastify.log.info(`Duplicate Stripe event ${event.id} (${event.type}) — already processed`)
  return reply.status(200).send({ received: true, duplicate: true })
}

// ... existing switch (event.type) block unchanged ...
```

**Why `createMany({skipDuplicates:true})` over `create()` + try/catch P2002:**
- Cleaner control flow (no catch block around an expected error).
- Returns `{count: 0 | 1}` — directly tells you whether the event was new.
- Prisma docs confirm for PostgreSQL this compiles to `INSERT ... ON CONFLICT DO NOTHING` — the exact SQL pattern Stripe/Hookdeck/Stigg recommend.
- Atomic: no race window between a separate "SELECT then INSERT".

### Pattern 3: Sentry Per-Surface Init (Shared Release ID)

**What:** All 6 surfaces call `Sentry.init({ release: <7-char-SHA>, environment: <env> })` with the same release ID per deploy.

**When to use:** MON-01 requirement.

**Release ID propagation:**
```bash
# In CI:
SENTRY_RELEASE=$(git rev-parse --short HEAD)
```
Exported into every build step. Consumed by:
- API: `process.env.SENTRY_RELEASE` → `Sentry.init({ release: env.SENTRY_RELEASE, ... })`
- Next.js (customer-web, admin-web): `NEXT_PUBLIC_SENTRY_RELEASE` env var at build time (Next.js inlines at build).
- Vite (company-web): `VITE_SENTRY_RELEASE` same.
- RN (Expo): `EXPO_PUBLIC_SENTRY_RELEASE` same (Expo SDK 55 pattern).

**Env singleton update** — add to `apps/api/src/lib/env.ts` `envSchema`:
```typescript
SENTRY_RELEASE: z.string().optional(),  // 7-char git SHA; optional for local dev
SENTRY_ENVIRONMENT: z.enum(['development','staging','production']).optional(),
```
And `turbo.json` `tasks.build.env`:
```json
"env": [
  "NEXT_PUBLIC_SENTRY_RELEASE",
  "VITE_SENTRY_RELEASE",
  "EXPO_PUBLIC_SENTRY_RELEASE",
  "SENTRY_AUTH_TOKEN",
  // ... existing entries
]
```

### Anti-Patterns to Avoid

- **Do NOT use `withSentryConfig` / bundler plugins.** D-10 explicitly rejects them. A Sentry CLI upload failure becomes a noisy CI step, not a broken build artifact.
- **Do NOT run `prisma migrate deploy` as Fly `release_command`.** D-03. Keeps migration failures out of Fly's release semantics; CI has clearer logs.
- **Do NOT use `prisma.processedStripeEvent.upsert`** for the idempotency check. `upsert` does a `SELECT` then `INSERT ON CONFLICT DO UPDATE`, which creates a race window. `createMany({skipDuplicates:true})` is single-statement.
- **Do NOT put Stripe `idempotency-key` request header (outbound)** and processed-events table (inbound) in the same mental bucket. `order.worker.ts:38`'s `idempotencyKey` is *outbound* to Stripe; the new Postgres table is *inbound* from Stripe. Different problems.
- **Do NOT try `flyctl releases rollback <version>`** — that subcommand does not exist (Fly community thread 2082). Use image-tagged redeploy.
- **Do NOT assume Vercel CLI rollback is safe for SPAs.** `vercel rollback <url>` exists but Vercel dashboard "Promote to Production" is the documented safe path (per Phase 09 Vercel runbook).
- **Do NOT forget `productionBrowserSourceMaps: true`** in Next.js config. Next.js does NOT emit browser source maps to disk by default in production builds — source map upload will find nothing.
- **Do NOT upload source maps to Sentry AND ship them in the deployed artifact.** After upload, delete or `.vercelignore` them so they don't ship to users. Common advice: `sentry-cli sourcemaps upload ... && rm .next/**/*.map` before `vercel --prod`.
- **Do NOT use Stripe's own Discord-webhook-lookalike payload format for Better Stack → Discord.** Better Stack alert webhooks need Discord's native `content`+`embeds` JSON shape, not Sentry's or Stripe's.
- **Do NOT set uptime probe threshold to 1-miss.** Flaps on cold starts / Neon scale-to-zero. 2-miss minimum (D-11 correctly specifies 2).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Source map upload | Custom `@sentry/cli` wrapper script that parses build output | `sentry-cli sourcemaps upload` directly | The CLI already handles URL-prefix resolution, release creation idempotency, chunked uploads, retries. |
| Webhook dedupe | Custom in-memory `Set<eventId>` or Redis TTL cache | Postgres table with unique constraint (D-05) | Durable across deploys; survives Redis outages; auditable for disputes. Stripe + Hookdeck + Stigg all recommend DB-backed. |
| Release tagging | Custom "release manager" abstraction | Raw `SENTRY_RELEASE` env + `sentry-cli releases new` | Releases are just strings in Sentry. Any abstraction layer is waste. |
| Fly log forwarding | Custom Fastify pino transport to HTTP | `flyio/log-shipper` image via Better Stack docs | Official integration. Handles back-pressure, retries, JSON framing. |
| Uptime checking | Custom cron-triggered `curl` loops | Better Stack synthetic monitors | External vantage point (not your own infra). Multi-region. Built-in 2-miss aggregation. |
| Discord alert formatting | Custom bot / webhook payload builder | Sentry's native Discord integration (for Sentry alerts) + Better Stack's built-in webhook templates (for uptime alerts) | Sentry → Discord is OAuth-install native; Better Stack → Discord uses template variables — both documented. |
| Prisma rollback tool | Custom `down.sql` generator or `prisma migrate resolve --rolled-back` scripts | Forward-only migrations (D-16) | Prisma does not officially support down migrations. Manual rollback scripts drift from schema. |
| Deploy ordering | Custom queue/mutex/lock | GitHub Actions `concurrency: group: deploy-${ref_name}, cancel-in-progress: false` | Native primitive. |

**Key insight:** Phase 10 is glue. Every workstream has a canonical 2026 path in its vendor's docs. The value-add is wiring them coherently (same release SHA, same environment string, same concurrency primitives), not building new abstractions.

## Runtime State Inventory

> Phase 10 is purely additive (new workflows, new table, new monitors). No renames or migrations of existing systems.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 10 ADDS the `processed_stripe_events` table; doesn't migrate existing webhook history. In-flight Stripe events received before migration deploy are not retroactively deduped (acceptable: first deploy creates the table, duplicates that arrived before are already processed anyway). | None (accept pre-table events are single-processed). |
| Live service config | **Sentry**: 4 projects (customer-web, admin-web, customer-mobile, washer-mobile) already provisioned in Phase 8 (D-08 in 08-CONTEXT.md). DSNs are stored in 1Password, need to be pushed into Vercel env (for web) and EAS secrets / app config (for mobile). **Better Stack**: account exists from Phase 8 (ACCT-08 SENTRY done; BETTER_STACK not yet — see MON-02). 4 uptime monitors + 1 log source to create in Better Stack dashboard (manual one-time setup via UI). **Discord**: new private server must be created (D-13) + Sentry Discord integration installed via Sentry UI (OAuth). **GitHub**: branch protection rule on `main` to require the `ci` workflow status check (discretion per CONTEXT.md). | UI configuration in each dashboard; secrets end up in GitHub Environments + 1Password. |
| OS-registered state | None — no OS-level scheduled tasks, no local process registrations. Daily cleanup is a BullMQ repeatable job inside the worker process group, not an OS cron. | None. |
| Secrets/env vars | **NEW secrets to create** (in GitHub Environments, not `.env.example` unless dev-relevant): `SENTRY_AUTH_TOKEN` (one per env), `VERCEL_DEPLOY_HOOK_CUSTOMER_WEB`, `VERCEL_DEPLOY_HOOK_ADMIN_WEB`, `VERCEL_DEPLOY_HOOK_COMPANY_WEB` (one each per env), `FLY_API_TOKEN` (one per env), `BETTER_STACK_SOURCE_TOKEN`, `BETTER_STACK_INGESTING_HOST`, `DISCORD_WEBHOOK_URL` (for Better Stack outbound only; Sentry uses OAuth). **NEW env vars for builds** (into `turbo.json` + per-app `.env.example`): `SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_RELEASE`, `VITE_SENTRY_RELEASE`, `EXPO_PUBLIC_SENTRY_RELEASE`, `EXPO_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (for the 2 new Next.js surfaces). | Create secrets → add to GitHub Environments → add to Vercel env vars per project → add to Fly secrets if needed at API runtime. |
| Build artifacts / installed packages | `.next/` directory must emit `*.js.map` files for source map upload. Currently `productionBrowserSourceMaps` not set in `next.config.js` — must be enabled per new Next.js app. For Expo mobile, Metro already emits source maps in EAS builds (Phase 11 concern); dev-mode Sentry works without uploaded maps. | Edit `next.config.js` in customer-web + admin-web + existing company-web's Vite config (`build.sourcemap: true` — check existing). |

## Common Pitfalls

### Pitfall 1: `flyctl releases rollback` does not exist
**What goes wrong:** Script wraps non-existent subcommand; on first rollback attempt, operator gets `Error: unknown command "rollback" for "flyctl releases"`.
**Why it happens:** CONTEXT.md D-15 uses `flyctl releases rollback` as shorthand. Flyctl's `releases` subcommand has `list` and `--image` but no `rollback`.
**How to avoid:** `pnpm rollback:api` must internally run:
```bash
PRIOR_TAG="${1:?usage: pnpm rollback:api <image-tag>}"
flyctl deploy --app cleanly-api --image "registry.fly.io/cleanly-api:${PRIOR_TAG}" --strategy immediate
```
And `docs/ROLLBACK.md` documents how to find the prior tag via `flyctl releases --app cleanly-api --image`.
**Warning signs:** The script has a hard-coded release number; any assumption a rollback needs no arguments.

### Pitfall 2: Source maps emitted but not uploaded (Turbopack / App Router)
**What goes wrong:** Sentry UI shows minified stack traces even after running `sentry-cli sourcemaps upload`.
**Why it happens:** Next.js 15 App Router's Turbopack default emits source maps in a different layout (`.next/server/app/**/*.map`, `.next/static/chunks/**/*.map`). Running `sentry-cli sourcemaps upload .next` sometimes misses the server chunks, and App Router's server components use a different URL prefix than the legacy Pages Router's `/_next/static/chunks/`.
**How to avoid:**
1. Enable `productionBrowserSourceMaps: true` in `next.config.js`.
2. Upload twice if needed — once for client (`--url-prefix '~/_next'`), once for server (`--url-prefix '~/.next'`).
3. Verify with `sentry-cli sourcemaps list --release $SENTRY_RELEASE` after upload.
4. Known Sentry issue #5328 (first-load JS files) may apply — worth a smoke test after first deploy with a deliberate throw.

**Warning signs:** Sentry shows the error but `app-build-manifest.js` or similar in the stack frame. Source file path is a hash like `a1b2c3.js` not an `app/*/page.tsx` file.

### Pitfall 3: Turborepo cache poisoning on SENTRY_RELEASE
**What goes wrong:** Building with `SENTRY_RELEASE=abc123` once caches the artifact; subsequent build with `SENTRY_RELEASE=def456` returns cached abc123 output with wrong release tag.
**Why it happens:** If `SENTRY_RELEASE` isn't declared in `turbo.json`'s `tasks.build.env`, Turbo doesn't factor it into the cache key.
**How to avoid:** Add `SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_RELEASE`, `VITE_SENTRY_RELEASE`, `EXPO_PUBLIC_SENTRY_RELEASE` to `turbo.json` `tasks.build.env` **before** first deploy.
**Warning signs:** Sentry issues shows mismatched release tags across surfaces; cross-surface error correlation breaks.

### Pitfall 4: Stripe webhook idempotency race between insert and process
**What goes wrong:** Two Stripe webhook attempts arrive within milliseconds (Stripe's retry). Both pass signature verification, both attempt to insert, one gets `count: 1` and processes, the other gets `count: 0` and skips. If the processor crashes before completing the work, the event appears "processed" in the table but the side effect didn't happen.
**Why it happens:** "Insert-before-process" sacrifices at-least-once for at-most-once safety.
**How to avoid:** Wrap process step + insert in a single transaction? **No** — transactions across external APIs don't make sense. Accept at-most-once; rely on Stripe's retry + a `SENTRY` alert on any uncaught error in the switch block. If the `switch` throws, re-throw (let Stripe retry); the insert already succeeded, so the retry will see a "duplicate" and skip. **Recommendation:** Move the insert to AFTER the `switch` (process-before-mark). This sacrifices at-most-once for at-least-once — safer for our case (side effects are DB updates and payouts; double-updating an order's `payment_status: 'paid'` is idempotent at the domain level; double-issuing a payout is what Stripe's outbound idempotency-key prevents, `order.worker.ts:38`).

**UPDATED recommendation:** **Keep D-05's "insert-before-process" wording but implement as "try insert first; if inserted, process; if processor throws, let the DB row stay (it's just a marker row) and surface the error to Sentry."** The `payment_status` updates in the current switch are idempotent anyway, so duplicate processing is harmless — the real value of the table is preventing *repeated* work from *successful* prior processing.

This needs planner adjudication — CONTEXT.md D-05 text says "Insert-before-process" but the safer implementation is "upsert-tolerant idempotency": keep the insert first (blocks duplicates) but make sure all switch-block side effects are themselves idempotent (they already are for `payment_status` updates — verified in existing webhook.ts).

**Warning signs:** Customer reports "paid twice" but Stripe dashboard shows one charge; `processed_stripe_events` table has the row but order shows double effect.

### Pitfall 5: Vercel Git auto-deploy re-enabled by accident
**What goes wrong:** Merging to `staging` kicks off Vercel Git integration AND GitHub Actions, causing two deploys with different SHAs.
**Why it happens:** Vercel's default Git integration is aggressive; if it's re-linked after the Phase 9 Vercel runbook's "disable git" step, this resurfaces.
**How to avoid:** Document in `docs/ROLLBACK.md` a post-deploy verification: *"Vercel → Project → Settings → Git → Production Branch = (none) or Git Integration = disabled."* Run a quick sanity curl against any commit to `main` that is NOT also pushed via `deploy.yml` — if a Vercel deployment appears, git integration leaked back on.
**Warning signs:** Two deployments with close timestamps in Vercel dashboard for one merge.

### Pitfall 6: Better Stack log drain double-counts org logs
**What goes wrong:** Deploying `flyio/log-shipper` in the same org as the API reads logs from every Fly app in the org — including the log-shipper itself. Creates a feedback loop and bloats Better Stack ingest.
**Why it happens:** The log-shipper reads org-scoped logs by default (that's the point).
**How to avoid:** Either (a) scope shipper config to specific app names (`cleanly-api`, `cleanly-api-staging`) via its Vector config, or (b) put the log-shipper in a separate Fly org. Better Stack docs show Vector filter syntax for (a).
**Warning signs:** Better Stack log volume grows super-linearly with deploys.

### Pitfall 7: Sentry source maps upload before build completes
**What goes wrong:** CI job runs `sentry-cli sourcemaps upload .next` in parallel with `pnpm build`; upload sees partial or missing files.
**Why it happens:** GitHub Actions job dependency confusion — `needs:` on the wrong step.
**How to avoid:** Source map upload MUST be a step within the same job that runs `pnpm build`, executed strictly after it. Not a parallel job.
**Warning signs:** `sentry-cli` reports "0 sourcemaps found"; first production error has no resolved frame.

### Pitfall 8: Different sample rates between web and mobile Sentry surface make cross-surface traces impossible
**What goes wrong:** `tracesSampleRate: 0.1` on API, `0.05` on web — a trace that starts on web and hits API has 0.1 × 0.05 = 0.5% end-to-end capture rate.
**Why it happens:** Picking different rates per surface without thinking about trace propagation.
**How to avoid:** Use the same `tracesSampleRate` everywhere (0.1 is a reasonable default in prod, 1.0 in staging/dev). Sentry's existing API init already uses this; match it on the 4 new surfaces.
**Warning signs:** Backend errors appear in Sentry but never have a parent frontend transaction.

## Code Examples

Verified patterns for the exact 2026 stack.

### CI step: Prisma migrate deploy with DIRECT_URL
```yaml
# In deploy.yml, migrate job
- name: Apply Prisma migrations (DIRECT_URL, not pooled)
  env:
    # Override DATABASE_URL so Prisma migrate uses the direct connection
    DATABASE_URL: ${{ secrets.DIRECT_URL }}
  run: pnpm --filter @cleanly/db exec prisma migrate deploy
```
*Source: Neon + Prisma docs (both established in Phase 08-09); PROJECT.md constraint confirms two-URL split.*

### CI step: @sentry/cli source map upload for a Next.js app
```yaml
- name: Build customer-web
  env:
    NEXT_PUBLIC_SENTRY_RELEASE: ${{ needs.setup.outputs.sha }}
  run: pnpm --filter @cleanly/customer-web build

- name: Install sentry-cli
  run: curl -sL https://sentry.io/get-cli/ | sh

- name: Upload source maps
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: cleanly
    SENTRY_PROJECT: customer-web
    SENTRY_RELEASE: ${{ needs.setup.outputs.sha }}
  run: |
    sentry-cli releases new "$SENTRY_RELEASE"
    sentry-cli sourcemaps upload \
      --release "$SENTRY_RELEASE" \
      --url-prefix '~/_next' \
      apps/customer-web/.next
    sentry-cli releases finalize "$SENTRY_RELEASE"

- name: Remove source maps from deploy artifact
  run: find apps/customer-web/.next -name "*.map" -delete
```
*Sources: Sentry legacy-uploading-methods docs (verified), Next.js source map Discussion #11632.*

### API Sentry init (unchanged — already in place; re-stated for reference)
```typescript
// apps/api/src/lib/sentry.ts — EXTEND with release + environment tags
import * as Sentry from '@sentry/node'
import { env } from './env.js'

export function initSentry() {
  if (env.BYPASS_SENTRY) {
    console.warn('[Sentry] BYPASS_SENTRY is true — Sentry initialization skipped')
    return
  }
  if (!env.SENTRY_DSN) {
    console.warn('[Sentry] SENTRY_DSN not set — error tracking disabled')
    return
  }
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.SENTRY_RELEASE,  // NEW — 7-char git SHA
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [Sentry.httpIntegration()],
  })
}
```

### Next.js App Router Sentry init (NEW files for customer-web + admin-web)
```typescript
// apps/customer-web/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 1.0,
  integrations: [Sentry.browserTracingIntegration()],
})
```
```typescript
// apps/customer-web/sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? 'development',
  release: process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
})
```
```typescript
// apps/customer-web/sentry.edge.config.ts  (same as server.config for Edge runtime)
import * as Sentry from '@sentry/nextjs'
Sentry.init({ /* ...same shape... */ })
```
```typescript
// apps/customer-web/instrumentation.ts  (Next.js 15 App Router hook)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
export { onRequestError } from '@sentry/nextjs'
```
```javascript
// apps/customer-web/next.config.js — ADD:
module.exports = {
  // ... existing config ...
  productionBrowserSourceMaps: true,  // required for sentry-cli sourcemaps upload
}
```
*Sources: Sentry Next.js manual-setup docs; Next.js instrumentation hook docs.*

### React Native / Expo SDK 55 Sentry init
```typescript
// apps/customer-mobile/sentry.ts
import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (!dsn) {
    console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — error tracking disabled')
    return
  }
  Sentry.init({
    dsn,
    environment: Constants.expoConfig?.extra?.appEnv ?? 'development',
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    enableNative: true,  // for SDK 55 New Architecture
    // Per D-08 comment: EAS-build-time source map upload wiring lands in Phase 11
  })
}
```
```typescript
// apps/customer-mobile/app/_layout.tsx — EDIT: wrap export
import * as Sentry from '@sentry/react-native'
import { initSentry } from '../sentry'
initSentry()
// ...existing layout component...
export default Sentry.wrap(RootLayout)
```
*Source: Sentry React Native docs + Expo using-sentry guide. `Sentry.wrap()` replaces the prior HOC pattern.*

### Prisma schema: ProcessedStripeEvent
```prisma
// packages/db/schema.prisma — ADD:

model ProcessedStripeEvent {
  event_id     String   @id                          // Stripe event ID, e.g. "evt_1..."
  event_type   String                                 // "payment_intent.succeeded", etc.
  order_id     String?                                // Optional correlation to Order
  processed_at DateTime @default(now())

  @@index([processed_at])                             // For the 30-day cleanup query
  @@map("processed_stripe_events")
}
```

### Webhook handler edit (insert-before-process)
```typescript
// apps/api/src/routes/payments/webhook.ts
// After event = stripe.webhooks.constructEvent(...) and BEFORE switch (event.type):

const inserted = await prisma.processedStripeEvent.createMany({
  data: [{
    event_id: event.id,
    event_type: event.type,
  }],
  skipDuplicates: true,
})

if (inserted.count === 0) {
  fastify.log.info(`Duplicate Stripe event ${event.id} (${event.type}) — skipping`)
  return reply.status(200).send({ received: true, duplicate: true })
}

// ... existing switch (event.type) block — unchanged ...
```

### Daily cleanup BullMQ job (30-day retention, D-06)
```typescript
// apps/api/src/workers/cleanup.worker.ts — NEW

import { Queue, Worker } from 'bullmq'
import { prisma } from '../lib/prisma.js'
import { env } from '../lib/env.js'

const connection = { url: env.UPSTASH_REDIS_URL }
const QUEUE = 'cleanup'

// Producer: register the repeatable job (idempotent — upsert)
const queue = new Queue(QUEUE, { connection })
await queue.upsertJobScheduler(
  'cleanup-stripe-events-daily',
  { pattern: '0 3 * * *' },  // 03:00 UTC daily — low-traffic hour
  { name: 'cleanup-stripe-events', data: {} },
)

// Worker: processes the scheduled job
new Worker(QUEUE, async (job) => {
  if (job.name !== 'cleanup-stripe-events') return
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const result = await prisma.processedStripeEvent.deleteMany({
    where: { processed_at: { lt: cutoff } },
  })
  console.log(`[cleanup] Deleted ${result.count} processed_stripe_events older than 30d`)
}, { connection })

console.log('[cleanup-worker] Started')
```
*Source: BullMQ v5 JobScheduler docs. `upsertJobScheduler` replaces the deprecated `queue.add` + `repeat` pattern post-5.16.0.*

### Better Stack Fly log drain setup (operator-run, one-time)
```bash
# Clone the Fly log-shipper template
fly launch --no-deploy --image flyio/log-shipper:latest

# Edit the generated fly.toml: set internal_port = 8686
# Set org-scoped read token + Better Stack destination
fly secrets set \
  ORG=personal \
  ACCESS_TOKEN=$(fly tokens create readonly personal | cut -d' ' -f2) \
  BETTER_STACK_SOURCE_TOKEN=<from-betterstack-source-setup> \
  BETTER_STACK_INGESTING_HOST=<from-betterstack>

fly deploy
```
*Source: `https://betterstack.com/docs/logs/fly-io/` — verified via WebFetch.*

### Rollback script (API — corrects D-15)
```json
// package.json — ADD to root scripts
{
  "scripts": {
    "rollback:api": "bash ./scripts/rollback-api.sh",
    "rollback:web": "echo 'Visit https://vercel.com → Project → Deployments → Promote to Production. See docs/ROLLBACK.md.'"
  }
}
```
```bash
# scripts/rollback-api.sh — NEW
#!/usr/bin/env bash
set -euo pipefail

APP="${1:?usage: pnpm rollback:api <app-name> <image-tag>\nExample: pnpm rollback:api cleanly-api abc1234}"
TAG="${2:?missing image tag — run: flyctl releases --app $APP --image}"

IMAGE="registry.fly.io/${APP}:${TAG}"
echo "Rolling back ${APP} to image ${IMAGE}"
flyctl deploy --app "$APP" --image "$IMAGE" --strategy immediate --remote-only
```
*Source: Fly Rollback Guide (verified via WebFetch). `--image-label` on previous deploys makes `TAG` match `SENTRY_RELEASE` (the 7-char SHA).*

### GitHub branch protection for `main` (UI path)
GitHub → Repo → Settings → Branches → Branch protection rules → "Add branch ruleset":
- Branch name pattern: `main`
- Require a pull request before merging: ✓ (optional; D-02 says "no manual approval gate" but PR-required is not the same as approval)
- Require status checks to pass: ✓
  - Required checks: `Lint, Typecheck & Test` (from ci.yml `jobs.ci.name`)
- Block force pushes: ✓
- Require linear history: optional
- Do NOT require approving reviews (D-02).

Apply same ruleset (minus required checks if ci.yml doesn't run on `staging` pushes — it does, per current ci.yml lines 5-10) to `staging` for force-push protection.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `flyctl releases rollback <n>` | `fly deploy --image registry.fly.io/<app>:<tag>` | Always was the idiom; `releases rollback` never shipped | CONTEXT.md D-15's phrasing needs an asterisk. Planner must implement as image-based. |
| Sentry `@sentry/nextjs` with `withSentryConfig` bundler plugin | CLI upload with `productionBrowserSourceMaps: true` | Plugin is still recommended upstream, but D-10 explicitly rejects it | Keeps upload failures non-fatal to builds. |
| Sentry custom Discord webhook | Sentry's native Discord integration (OAuth install, Settings → Integrations) | Sentry shipped native Discord integration ~2023; 2026 SaaS-first path | No webhook payload engineering required for Sentry alerts. Better Stack → Discord still uses custom webhook. |
| BullMQ `Queue.add(name, data, { repeat })` | `queue.upsertJobScheduler(id, { pattern }, { name, data })` | Deprecated post-BullMQ 5.16.0 in favor of Job Schedulers | Cleaner idempotency, no duplicate-scheduler risk across deploys. |
| Fly built-in log drain (`fly log drain create`) | Separate `flyio/log-shipper` Fly app | `fly log drain` commands are limited to a few vendors; Better Stack is via Vector-based shipper | One extra Fly app to maintain (free tier-eligible). |
| Next.js Pages Router + legacy Sentry | Next.js 15.5 App Router + `instrumentation.ts` + three `sentry.*.config.ts` files | Next.js 13 App Router stable; Sentry 7.x → 10.x migrated in 2024-2025 | Three init files required, not one. |
| Prisma `upsert` for idempotent insert | `createMany({skipDuplicates: true})` or `create` + catch P2002 | `upsert` has race conditions on concurrent inserts | `createMany` single-statement `INSERT ON CONFLICT DO NOTHING` is atomic. |

**Deprecated/outdated:**
- Sentry `@sentry/tracing` — merged into `@sentry/browser` / `@sentry/node` as `*.browserTracingIntegration()` / `httpIntegration()`.
- Prisma generator `prisma-client-js` → migrating to preview-feature `prisma-client` in Prisma 7 (not in scope for this phase).
- Next.js `next build && next-sentry-upload` bash glue — superseded by `withSentryConfig` (which we reject) or `sentry-cli sourcemaps upload` (our path).
- `bullmq` `repeatable` jobs via `repeat: { cron: ... }` — deprecated, use `upsertJobScheduler`.

## Open Questions

1. **MON-05 subtle semantics: "insert-before" vs "process-then-insert"**
   - What we know: D-05 says "insert-before-process". The literal-read implementation sacrifices at-least-once delivery for at-most-once.
   - What's unclear: whether "insert-before" is hard contract or just a sketch. Pitfall 4 above argues the existing switch-block side effects are already idempotent, so "insert first" is safe only if we're OK with Stripe retries seeing a "duplicate" row and skipping (even if the prior attempt crashed mid-processing).
   - Recommendation: implement "insert-before-process" as written in D-05. Document in the webhook handler that `switch`-block side effects MUST remain idempotent. Add a code comment + a test case. If a non-idempotent handler is added later (unlikely — all current ones are `update`-style), revisit.

2. **P1 email digest architecture**
   - What we know: D-14 says P1 = email digest hourly.
   - What's unclear: whether to use Sentry's built-in "issue alert" → email rule with `Every 1 hour` frequency, OR Better Stack's "scheduled digest", OR Resend-based custom digest from Sentry API.
   - Recommendation: **Start with Sentry's built-in "issue alert" → Email with hourly frequency**. It's zero engineering cost. Revisit if noise is too high, then bolt on a custom aggregator.

3. **Vercel deploy hook secret rotation**
   - What we know: Deploy hook URLs are effectively auth tokens.
   - What's unclear: rotation cadence; no Vercel-side expiration.
   - Recommendation: document in `docs/ROLLBACK.md`: "Rotate deploy hooks annually or on any team change. Delete the old hook in Vercel → Settings → Git → Deploy Hooks; regenerate; update GitHub Environment secret."

4. **Sentry sample rate for mobile**
   - What we know: CLAUDE.md doesn't pre-set; D-discretion says "0.1 unless research surfaces something different".
   - What's unclear: mobile apps typically have lower traffic than web at launch; 0.1 might be too sparse.
   - Recommendation: start `tracesSampleRate: 0.2` on mobile (slightly higher than web, since session counts will be lower at launch), document in `sentry.ts`, revisit post-launch.

5. **company-web source map upload (already has Sentry, now needs upload step)**
   - What we know: `apps/company-web/src/lib/sentry.ts` exists with `@sentry/react` init. Vite builds to `dist/`.
   - What's unclear: whether the existing Vite build emits source maps.
   - Recommendation: grep for `build.sourcemap` in `apps/company-web/vite.config.*`. If not set, add `build: { sourcemap: true }`. Use `sentry-cli sourcemaps upload --url-prefix '~/assets' apps/company-web/dist`.

6. **Better Stack Fly log drain scoping**
   - What we know: log-shipper reads org-scoped logs.
   - What's unclear: whether Vector-config filter `.fly.app_name =~ ["cleanly-api","cleanly-api-staging"]` is the right syntax.
   - Recommendation: default deployment reads ALL org apps; file a follow-up task to scope via Vector config once log-volume is observed. 3-day retention on free tier limits blast radius.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| GitHub Actions runner | CI-01 through CI-05 | ✓ | ubuntu-latest | — |
| pnpm | CI install | ✓ (v9 in ci.yml) | 9 | — |
| Node.js 20 | CI + runtime | ✓ | 20 | — |
| Prisma CLI | CI-03 migrate | ✓ (via `pnpm --filter @cleanly/db exec prisma`) | 6.5.x | — |
| `@sentry/cli` | CI-04 source map upload | ✗ (installed in CI) | latest | Install via curl in workflow step |
| `flyctl` | CI deploy_api job + `pnpm rollback:api` | ✓ via `superfly/flyctl-actions/setup-flyctl@master` | pin in workflow | — |
| Vercel account + 3 projects + 3 deploy hooks | CI deploy_web job | ✓ accounts exist from Phase 09; Deploy Hook URLs must be created in Phase 10 UI steps | — | — |
| Sentry org + 6 projects | MON-01 | ✓ from Phase 08 (ACCT-08 complete) | — | — |
| Better Stack account | MON-02, MON-03 | ✗ — **NOT YET CREATED.** No ACCT-XX maps to Better Stack; Phase 10 must sign up as part of plan | — | Defer to in-phase creation |
| Discord server | D-13 | ✗ — **NOT YET CREATED.** Per D-13 it's a new private server | — | Create during phase; document in `docs/ROLLBACK.md` or equivalent |
| `FLY_API_TOKEN`, per-environment | CI deploy | ⚠️ partially — Phase 08 provisioned `cleanly-api` credentials in 1Password; confirm GitHub Environment secrets already populated, else populate | — | Populate as phase step |
| Neon `DIRECT_URL` | CI-03 | ✓ (Phase 08-09 established two-URL split) | — | — |

**Missing dependencies with no fallback:**
- None — Better Stack signup and Discord server creation are manual one-time UI steps that fit inside the phase.

**Missing dependencies with fallback:**
- `@sentry/cli` — installed in-CI via curl; no system dependency.

## Validation Architecture

> `nyquist_validation: false` in `.planning/config.json`. Per objective, this section maps each requirement to a concrete acceptance test (automated command or manual verification) for Dimension 8 of planning.

### Per-Requirement Acceptance Tests

| Req | Behavior | Test Type | Automated Command / Manual Check |
|-----|----------|-----------|-------------------------------------|
| **CI-01** | PR to main triggers lint+typecheck+test in < 5 min | Manual (one-time) | Open a trivial PR against `main`; observe GitHub Actions `ci` workflow run; assert `conclusion: success` and `run duration < 300s`. Checked via `gh run list --branch <pr-branch> --workflow ci.yml --limit 1 --json status,conclusion,updatedAt,createdAt`. |
| **CI-02** | Turborepo remote cache works in CI | Automated (observational) | After first merge, second merge of same code reuses cache. Check `gh run view <run-id> --log | grep 'cache hit'` for turbo task output. Or inspect ci.yml run artifacts for Turborepo `FULL TURBO` marker. |
| **CI-03** | Prisma migrate deploy runs with DIRECT_URL | Automated | `deploy.yml` `migrate` job logs show `prisma migrate deploy` completes with exit 0. Verify DATABASE_URL used is direct by grepping Fly/Neon connection metrics post-deploy for any non-pooled connection during the migrate window — or simpler: the job's env block assigns `DATABASE_URL: ${{ secrets.DIRECT_URL }}`. A unit-level check: `grep -q 'DIRECT_URL' .github/workflows/deploy.yml` and `! grep 'pooler' .github/workflows/deploy.yml`. |
| **CI-04** | Source maps uploaded to Sentry after each deploy | Manual + automated | (a) `sentry-cli sourcemaps list --release $SENTRY_RELEASE` returns >0 files after a deploy. (b) Deliberately throw an error in staging, verify Sentry issue shows source-mapped stack frame with file:line. |
| **CI-05** | Merge to `staging` → staging env; merge to `main` → prod env | Automated + manual | `gh run list --workflow deploy.yml --branch staging --limit 1` shows run with environment `staging`; same for `main` → `production`. Verify each run hit correct Fly app (`cleanly-api-staging` vs `cleanly-api`) via run logs. |
| **MON-01** | Sentry configured on all 6 surfaces with source-mapped stack traces | Manual (one-time per surface) | For each of 6 surfaces, add a temporary `throw new Error('sentry-smoke-test-<surface>')` behind a hidden route/button. Deploy. Trigger. Verify Sentry dashboard shows the error in the correct project with resolved file:line from original source. |
| **MON-02** | Better Stack uptime alerts on API /healthz + 3 web apps | Manual | (a) Verify 4 monitors exist in Better Stack dashboard. (b) Intentionally scale `cleanly-api-staging` to 0 via `fly scale count api=0 --app cleanly-api-staging`. Wait 2 × 60s = 2 minutes. Observe Discord P0 alert + email. Scale back up. |
| **MON-03** | Fly logs appear in Better Stack, structured JSON | Manual | After log-shipper deploy, tail Better Stack log stream. Trigger a request against `cleanly-api-staging`. Verify the corresponding Fastify access-log JSON line appears in Better Stack within ~10s with parsed fields (`level`, `msg`, `req.method`, `req.url`). |
| **MON-04** | Webhook rejects invalid signature (already works) | Automated | `curl -X POST https://cleanly-api-staging.fly.dev/webhooks/stripe -H 'stripe-signature: fake' -d '{}'` returns 400. **This is already in place; no new work.** |
| **MON-05** | Duplicate event_id doesn't double-process | Manual (staging) | (a) Using Stripe CLI: `stripe trigger payment_intent.succeeded --api-key <staging-test-key>`. Capture event ID from Stripe dashboard. (b) Replay same event ID twice via `stripe events resend <evt_...>`. (c) Query `SELECT event_id, count(*) FROM processed_stripe_events WHERE event_id = 'evt_...' GROUP BY event_id;` — expect `count=1`. (d) Query `SELECT payment_status FROM orders WHERE id = '<associated-order>';` — expect single `paid` status, no duplicate audit log entries. (e) API log shows one "payment confirmed" line + one "Duplicate Stripe event ... skipping" line for the replay. |
| **MON-06** | Rollback runbook correctly reverts API + web deploys | Manual (dry-run on staging) | (a) Deploy a known-good release A to staging. Capture its image tag via `flyctl releases --app cleanly-api-staging --image`. (b) Deploy a new release B (any trivial change). (c) Run `pnpm rollback:api cleanly-api-staging <tag-A>`. Wait for deploy. `curl /healthz` confirms 200. Verify `flyctl releases` shows a new release pointing at image-A. (d) For web: open Vercel dashboard → customer-web → Deployments → pick A → "Promote to Production". Verify URL serves A's content. Document result in runbook. |

### Test Execution Points

- **Per-commit (existing ci.yml):** lint, typecheck, unit tests (vitest). Already in place.
- **Pre-deploy addition (new):** `prisma migrate diff --exit-code` or `prisma migrate deploy --dry-run` (if supported) as part of the `migrate` job's early step, to fail-fast if the migration would break.
- **Post-deploy smoke (manual today, phase 11 automates):** curl `/healthz`, synthetic Stripe webhook replay for MON-05.
- **One-time phase gate (before closing Phase 10):** run each row of the "Per-Requirement Acceptance Tests" table once against staging; document results in `10-SUMMARY.md` or equivalent phase artifact.

### Wave 0 Gaps

- [ ] `scripts/rollback-api.sh` — new rollback script (wraps image-based redeploy)
- [ ] `docs/ROLLBACK.md` — new runbook
- [ ] No test framework gap — existing vitest setup covers unit tests; integration/E2E is explicitly deferred to Phase 11

## Sources

### Primary (HIGH confidence)

- **Fly.io Rollback Guide** — `https://fly.io/docs/blueprints/rollback-guide/` (verified via WebFetch) — confirms no `releases rollback` subcommand, canonical path is `fly deploy --image ...`
- **Fly.io Continuous Deployment docs** — `https://fly.io/docs/launch/continuous-deployment-with-github-actions/` — `superfly/flyctl-actions/setup-flyctl@master` + `FLY_API_TOKEN` pattern
- **Sentry Next.js manual-setup** — `https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/` (verified via WebFetch) — three-config-file pattern + `instrumentation.ts`
- **Sentry Legacy Uploading Methods** — `https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/troubleshooting_js/legacy-uploading-methods/` (verified via WebFetch) — exact `sentry-cli sourcemaps upload` + `--url-prefix` syntax
- **Sentry Alerts/Routing** — `https://docs.sentry.io/product/alerts/create-alerts/routing-alerts/` (verified via WebFetch) — native Discord integration via Settings → Integrations, not raw webhook
- **Better Stack Fly.io Logging** — `https://betterstack.com/docs/logs/fly-io/` (verified via WebFetch) — `flyio/log-shipper` launch steps + required secrets
- **BullMQ Job Schedulers** — `https://docs.bullmq.io/guide/job-schedulers` — `upsertJobScheduler` API, replaces deprecated repeatable pattern
- **Prisma `createMany skipDuplicates`** — `https://www.prisma.io/docs/orm/reference/prisma-client-reference` (verified via WebFetch) — returns `{count}`; compiles to PG `INSERT ON CONFLICT DO NOTHING`
- **Stripe Idempotency Docs** — `https://docs.stripe.com/webhooks` — `event.id` uniqueness + retry semantics
- **Prisma Data Guide: ON CONFLICT** — `https://www.prisma.io/dataguide/postgresql/inserting-and-modifying-data/insert-on-conflict` — raw SQL fallback patterns
- **GitHub Actions Turborepo guide** — `https://turborepo.dev/docs/guides/ci-vendors/github-actions` — pnpm + concurrency patterns
- **Existing codebase** — `apps/api/src/routes/payments/webhook.ts`, `apps/api/src/lib/sentry.ts`, `apps/company-web/src/lib/sentry.ts`, `.github/workflows/ci.yml`, `turbo.json`, `apps/api/src/lib/env.ts`, `09-DEPLOYMENT-RUNBOOK.md`, `09-VERCEL-RUNBOOK.md`, `10-CONTEXT.md`

### Secondary (MEDIUM confidence)

- Fly.io community thread "How to do Rollback releases - 3 different ways" — `https://community.fly.io/t/how-to-do-rollback-releases-3-different-ways/16347` — confirms image-based rollback idiom
- Expo Sentry guide — `https://docs.expo.dev/guides/using-sentry/` — SDK 55 wiring + `Sentry.wrap()` pattern
- Hookdeck webhook idempotency guide — `https://hookdeck.com/webhooks/guides/implement-webhook-idempotency`
- Stigg webhook best practices — `https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks`

### Tertiary (LOW confidence — flagged for validation at task time)

- Exact `@sentry/react-native` major version compatible with Expo SDK 55 — recommend `npm view @sentry/react-native version` + check SDK 55 release notes at task time
- Better Stack free-tier retention (docs imply 3-day; not explicitly stated on fly-io/ page) — confirm during Better Stack signup
- Vercel deploy-hook idempotency (whether duplicate POSTs within minutes dedupe or queue two builds) — confirm at task time; recommend `concurrency.cancel-in-progress: false` as a safety net

## Metadata

**Confidence breakdown:**
- CI pipeline mechanics: **HIGH** — Turborepo+pnpm+GitHub Actions is a well-documented standard path; ci.yml already exists and works
- Prisma migrate in CI: **HIGH** — Neon two-URL already in place; `migrate deploy --direct-url` is canonical
- Stripe idempotency: **HIGH** — `createMany({skipDuplicates:true})` confirmed via Prisma docs WebFetch; Stripe recommends the pattern
- Sentry source map upload (Next.js): **HIGH** — verified via WebFetch from legacy-uploading-methods doc
- Sentry source map upload (React Native): **MEDIUM** — EAS hook wiring deferred per D-08, so Phase 10 only needs init; upload path at Phase 11
- Fly.io rollback: **HIGH** — verified the `fly releases rollback` subcommand does NOT exist; canonical is image-based redeploy
- Better Stack Fly log drain: **HIGH** — exact steps from betterstack.com/docs/logs/fly-io/ confirmed
- Better Stack → Discord alert format: **MEDIUM** — Better Stack supports custom webhook; exact Discord payload template left to dashboard UI
- Sentry → Discord: **HIGH** — native integration, OAuth flow (not webhook)
- BullMQ repeatable job: **HIGH** — `upsertJobScheduler` verified from v5 docs

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 days — stable infrastructure domain; flyctl and Sentry may ship minor changes but base patterns are rock-solid)

---

*Phase: 10-ci-cd-monitoring*
*Research completed: 2026-04-14*

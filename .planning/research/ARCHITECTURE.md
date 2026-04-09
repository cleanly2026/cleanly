# Architecture Research

**Domain:** On-demand cleaning services marketplace (multi-role, multi-surface)
**Researched:** 2026-04-09 (v1.1 production deployment update)
**Confidence:** HIGH

---

## Production Deployment Topology

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (5 surfaces)                         │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│ Customer Web │ Customer     │ Company Web  │ Washer       │ Admin Web   │
│ Next.js      │ Mobile       │ Vite SPA     │ Mobile       │ Next.js     │
│ Vercel       │ Expo/EAS     │ Vercel       │ Expo/EAS     │ Vercel      │
│              │              │              │              │             │
│ customer.    │ app stores   │ company.     │ app stores   │ admin.      │
│ cleanly.ae   │ EAS Update   │ cleanly.ae   │ EAS Update   │ cleanly.ae  │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────┘
       │              │              │              │              │
       └──────────────┴──────────────┴──────────────┴──────────────┘
                                     │
                            HTTPS + WSS
                            (Cloudflare DNS proxy)
                                     │
                            api.cleanly.ae
                         Cloudflare → Fly.io bom
                                     │
┌────────────────────────────────────┼────────────────────────────────────┐
│                          FLY.IO APP: cleanly-api                         │
│                                                                           │
│  PROCESS GROUP: api                 PROCESS GROUP: worker                │
│  ┌─────────────────────────────┐    ┌──────────────────────────────┐    │
│  │  Fastify 5 + Socket.io 4    │    │  BullMQ Workers               │    │
│  │  Port 8080 (HTTP + WS)      │    │  No HTTP port (internal)      │    │
│  │  1 machine min (256MB)      │    │  1 machine min (128MB)        │    │
│  │  npm run start              │    │  npm run start:worker         │    │
│  └──────────────┬──────────────┘    └──────────────────────────────┘    │
│                 │                                                         │
│         Shared Docker Image (same Dockerfile, different CMD)             │
└─────────────────┼───────────────────────────────────────────────────────┘
                  │
┌─────────────────┼───────────────────────────────────────────────────────┐
│                      EXTERNAL DATA SERVICES                               │
│                                                                           │
│  Neon PostgreSQL        Upstash Redis         Cloudflare R2              │
│  (Bahrain region)       (Fixed Plan)          (global CDN)               │
│  +pooler for app        BullMQ + rate limit   before/after photos        │
│  +direct for migrate    Socket.io adapter     presigned URLs             │
│                         session cache                                     │
│                                                                           │
│  Stripe / Connect    Twilio         360dialog      Resend                │
│  Payments + payouts  OTP SMS        WhatsApp       Transactional email   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fly.io Region Note

**IMPORTANT:** Fly.io does NOT have a Bahrain region. The closest available region is `bom` (Mumbai, India), which adds approximately 100-150ms latency versus the Gulf (vs Neon Bahrain at <20ms for DB). This is a meaningful discovery — the API host will not be Gulf-local even though the database is.

**Confirmed Fly.io regions (2025):** ams, arn, bom, cdg, dfw, ewr, fra, gru, iad, jnb, lax, lhr, nrt, ord, sin, sjc, syd, yyz. No Middle East region exists.

**Mitigation options:**
- Use `bom` (Mumbai) as primary — best available for Gulf latency on Fly.io
- Use Railway Singapore (`sin` equivalent) as an alternative — similar latency, simpler ops
- Consider Render.com (has Singapore) or DigitalOcean App Platform (has Bangalore)
- For v1.2: Re-evaluate if Fly.io has added a Middle East region, or switch to a provider with UAE/Bahrain presence (Azure UAE North, AWS Bahrain `me-south-1`, or GCP Dubai)

**Practical implication:** Neon Bahrain is the right call for DB latency. The API tier on `bom` adds ~100ms per request versus a hypothetical Bahrain API. For a cleaning services marketplace, this is acceptable at launch but worth monitoring.

---

## Fly.io Machine Layout: Process Groups

**Verdict: Single Fly.io app with two process groups from the same Docker image.**

This is the correct pattern. Not two separate Fly apps, and not running API + worker on the same machine.

```toml
# apps/api/fly.toml
app = "cleanly-api"
primary_region = "bom"

[processes]
  api    = "node dist/server.js"
  worker = "node dist/worker.js"

[[services]]
  internal_port = 8080
  protocol      = "tcp"
  processes     = ["api"]           # Only the api process group gets HTTP traffic

  [[services.ports]]
    port     = 80
    handlers = ["http"]
  [[services.ports]]
    port     = 443
    handlers = ["tls", "http"]

  [services.http_checks]
    interval      = "10s"
    timeout       = "2s"
    grace_period  = "5s"
    method        = "GET"
    path          = "/health"

[http_service]
  internal_port = 8080
  force_https   = true
  processes     = ["api"]

# Worker has NO [[services]] — it pulls from BullMQ queue, no inbound HTTP
# Scale independently:
# fly scale count api=1 worker=1 --app cleanly-api
# fly scale vm shared-cpu-1x --memory 256 --process-group api
# fly scale vm shared-cpu-1x --memory 128 --process-group worker
```

**Rationale:**
- Single Docker image reduces build complexity (one Dockerfile, one push)
- Process groups run in separate Fly machines — no resource contention
- Worker never receives HTTP traffic → no health check needed for Fly proxy
- Independent scaling: scale API machines for traffic, worker machines for queue depth
- BullMQ workers need persistent process — serverless deployment is incompatible

**Machine sizing at launch:**
- API: `shared-cpu-1x` with 256MB RAM (Socket.io sessions are memory-resident)
- Worker: `shared-cpu-1x` with 128MB RAM (queue processing is CPU-light)

---

## Vercel Project Structure: 3 Web Apps

**Verdict: Three separate Vercel projects, all linked to the same monorepo.**

```
GitHub Repo: cleanly (monorepo)
    │
    ├─── Vercel Project: cleanly-customer-web
    │    Root Directory: apps/customer-web
    │    Build Command: turbo build --filter=customer-web
    │    Ignored Build Step: npx turbo-ignore --fallback=HEAD^1
    │    Environment: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STRIPE_KEY, etc.
    │
    ├─── Vercel Project: cleanly-admin-web
    │    Root Directory: apps/admin-web
    │    Build Command: turbo build --filter=admin-web
    │    Ignored Build Step: npx turbo-ignore --fallback=HEAD^1
    │    Environment: NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, etc.
    │
    └─── Vercel Project: cleanly-company-web
         Root Directory: apps/company-web
         Build Command: turbo build --filter=company-web
         Ignored Build Step: npx turbo-ignore --fallback=HEAD^1
         Environment: VITE_API_URL, etc.
```

**How turbo-ignore works:**
`npx turbo-ignore --fallback=HEAD^1` checks the Turborepo dependency graph to determine if the app or any of its workspace dependencies changed since the last successful Vercel deployment. If nothing changed, the build is skipped entirely. This prevents all 3 Vercel projects from rebuilding when only `apps/api` changed.

**Vercel + Turborepo remote cache:**
Vercel hosts the remote cache automatically for Turborepo projects deployed to Vercel. Link locally with `turbo login && turbo link`. The same cache is shared between Vercel builds and GitHub Actions CI via `TURBO_TOKEN` + `TURBO_TEAM` secrets.

**Domain mapping:**
| App | Vercel Project Domain | Custom Domain |
|-----|-----------------------|---------------|
| customer-web | cleanly-customer.vercel.app | cleanly.ae (root) |
| admin-web | cleanly-admin.vercel.app | admin.cleanly.ae |
| company-web | cleanly-company.vercel.app | company.cleanly.ae |

---

## Build Pipeline: Turborepo + GitHub Actions

**Pipeline architecture: fan-out CI with targeted deployments.**

```yaml
# .github/workflows/ci.yml — runs on every push and PR
name: CI
on:
  push:
    branches: [main, staging]
  pull_request:

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  lint-typecheck-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2      # turbo needs prior commit for change detection
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck test --filter=[HEAD^1]
        # [HEAD^1] = only tasks in packages changed since previous commit

  deploy-api:
    needs: lint-typecheck-test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=api
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            flyctl deploy --remote-only --app cleanly-api --config apps/api/fly.toml
          else
            flyctl deploy --remote-only --app cleanly-api-staging --config apps/api/fly.staging.toml
          fi
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  # Vercel deployments are handled automatically by Vercel's GitHub integration
  # turbo-ignore in each Vercel project's "Ignored Build Step" skips unchanged apps
  # No explicit deploy job needed for Vercel projects in CI
```

**Key points:**
- Turborepo `--filter=[HEAD^1]` runs lint/typecheck/test ONLY for changed packages — on a monorepo with 6 apps, this is critical for CI speed
- Vercel web deployments are driven by Vercel's native GitHub integration (push to main → Vercel builds) — do not duplicate this in GitHub Actions
- Only the Fly.io API deployment needs an explicit GitHub Actions job
- `TURBO_TOKEN` and `TURBO_TEAM` shared between CI and Vercel ensures remote cache hits across both systems
- GitHub Environments (`staging` / `production`) gate secrets per environment

**Build order enforced by Turborepo `turbo.json`:**
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```
`^build` means: build all workspace dependencies first. This ensures `packages/db`, `packages/types`, `packages/ui` etc. are built before any app that imports them.

---

## Database Migration Flow: Neon Branching

**Verdict: Neon main branch = production. Separate Neon branch = staging. Prisma migrate deploy in CI, never manually.**

```
Neon Project: cleanly
├── Branch: main (production)
│   Connection: DATABASE_URL (pooler) + DATABASE_URL_DIRECT (direct)
│   Protected: YES — no writes except via prisma migrate deploy on main push
│
└── Branch: staging
    Connection: DATABASE_URL_STAGING (pooler) + DATABASE_URL_STAGING_DIRECT (direct)
    Created from: main branch (copy-on-write, shared storage)
    Reset: Periodically with `neonctl branches reset staging --parent main`
```

**Two connection strings are mandatory:**
- `DATABASE_URL` — uses `-pooler.` subdomain, goes through PgBouncer — for Fastify app runtime
- `DATABASE_URL_DIRECT` — direct connection, bypasses PgBouncer — for `prisma migrate deploy` only

**Migration workflow in CI:**
```yaml
# In deploy-api job, before flyctl deploy:
- name: Run migrations (staging)
  if: github.ref == 'refs/heads/staging'
  run: pnpm --filter=@cleanly/db exec prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_STAGING_DIRECT }}

- name: Run migrations (production)
  if: github.ref == 'refs/heads/main'
  run: pnpm --filter=@cleanly/db exec prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_DIRECT }}
```

**Promotion workflow (staging → production):**
1. Developer runs `prisma migrate dev --name feature-xyz` locally against a local dev DB
2. Migration file committed to `packages/db/migrations/`
3. PR created → CI runs `prisma migrate deploy` against staging Neon branch
4. Staging validated (app works, no broken queries)
5. PR merged to main → CI runs `prisma migrate deploy` against production Neon branch
6. Fly.io deployment follows immediately after successful migration

**CRITICAL: Neon requires `prisma migrate deploy` (not `migrate dev`) in production.** `migrate dev` also runs `db push` which can drop data in ambiguous situations. `migrate deploy` only applies pending migration files — never generates new ones.

**For PR preview environments (optional, v1.2+):**
Neon's GitHub Actions integration can create a branch-per-PR automatically:
```yaml
- uses: neondatabase/create-branch-action@v6
  with:
    project_id: ${{ secrets.NEON_PROJECT_ID }}
    api_key: ${{ secrets.NEON_API_KEY }}
    branch_name: preview/pr-${{ github.event.number }}
```

---

## Environment Variable Flow

**Three-tier: development → staging → production. GitHub Environments gate secrets per tier.**

### Secret Inventory by Service

| Variable | dev | staging | prod | Notes |
|----------|-----|---------|------|-------|
| `DATABASE_URL` | `.env.local` | GitHub Env: staging | GitHub Env: production | Pooler URL |
| `DATABASE_URL_DIRECT` | `.env.local` | GitHub Env: staging | GitHub Env: production | Direct URL for migrations |
| `REDIS_URL` | `.env.local` | GitHub Env: staging | GitHub Env: production | Upstash TLS URL |
| `JWT_SECRET` | `.env.local` | GitHub Env: staging | GitHub Env: production | 32-byte random |
| `STRIPE_SECRET_KEY` | `.env.local` (test) | GitHub Env: staging (test) | GitHub Env: production (live) | Different key per tier |
| `STRIPE_WEBHOOK_SECRET` | `.env.local` | staging | production | Differs per endpoint |
| `TWILIO_ACCOUNT_SID` | `.env.local` | staging | production | Same account, different numbers OK |
| `RESEND_API_KEY` | `.env.local` | staging | production | |
| `CLOUDFLARE_R2_*` | `.env.local` | staging | production | Separate R2 buckets per env |
| `FLY_API_TOKEN` | n/a | GitHub Secret | GitHub Secret | Repo-level, not env-scoped |
| `TURBO_TOKEN` | n/a | GitHub Secret | GitHub Secret | Repo-level (same token) |

### Mobile App Environment Variables

Expo/EAS handles mobile env vars separately from server env vars:

```json
// eas.json
{
  "build": {
    "staging": {
      "environment": "preview",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-staging.cleanly.ae"
      }
    },
    "production": {
      "environment": "production",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.cleanly.ae"
      }
    }
  }
}
```

`EXPO_PUBLIC_` prefix variables are baked into the app bundle at build time. They are readable by end users — never put secrets here (only public API URLs, Stripe publishable key, etc.).

Sensitive secrets (Stripe publishable key is public by design) go through EAS environment variables in the EAS dashboard, not hardcoded in `eas.json`.

### Web App Environment Variables (Vercel)

In each Vercel project dashboard, configure:
- Environment: Production / Preview / Development
- Variables: set per environment

`NEXT_PUBLIC_*` variables are inlined by Next.js at build time (public). Other variables are server-side only. Vercel handles injection at build time — no `.env` files in production.

### Turborepo Cache and Environment Variables

Turborepo hashes environment variables as part of cache keys. Declare public build-time variables in `turbo.json` to prevent accidentally using staging cache in production:

```json
{
  "pipeline": {
    "build": {
      "env": ["NEXT_PUBLIC_API_URL", "VITE_API_URL"]
    }
  }
}
```

---

## DNS and Networking: How Clients Reach the API

### Domain Structure

```
cleanly.ae              → customer-web (Vercel)
www.cleanly.ae          → redirect to cleanly.ae
api.cleanly.ae          → Fly.io cleanly-api (bom region)
api-staging.cleanly.ae  → Fly.io cleanly-api-staging (bom region)
company.cleanly.ae      → company-web (Vercel)
admin.cleanly.ae        → admin-web (Vercel)
```

All DNS hosted on Cloudflare. Web apps (Vercel) use Cloudflare's proxy (orange cloud). API (Fly.io) DNS configuration requires care.

### Cloudflare + Fly.io: Critical Configuration

**SSL mode MUST be "Full (strict)"** — not Flexible. Flexible mode causes redirect loops between Cloudflare and Fly.io's auto-HTTPS.

**WebSocket consideration:** Cloudflare supports WebSocket proxying, but imposes a 100-second idle timeout. Socket.io must be configured to send heartbeats under 100 seconds:

```typescript
// apps/api/src/server.ts
const io = new Server(fastify.server, {
  pingInterval: 25000,   // send ping every 25s
  pingTimeout: 20000,    // timeout after 20s if no pong
  // Both within Cloudflare's 100s idle timeout
})
```

**Alternative for API:** Disable Cloudflare proxy (grey cloud) for `api.cleanly.ae` and use DNS-only mode. This bypasses Cloudflare's WebSocket timeout issue at the cost of losing Cloudflare DDoS protection on the API. For launch, DNS-only for `api.` is acceptable.

**Wildcard certificates:** Not supported through Cloudflare proxy without DNS-01 challenge. Use per-subdomain certificates (one per subdomain) instead.

### How Mobile Apps Reach the API

Mobile apps (Expo) use `EXPO_PUBLIC_API_URL` set at EAS build time:

```
Staging builds: EXPO_PUBLIC_API_URL = https://api-staging.cleanly.ae
Production builds: EXPO_PUBLIC_API_URL = https://api.cleanly.ae
```

No special networking needed. Standard HTTPS to the custom domain. Socket.io WebSocket upgrades work the same way — the client connects to `wss://api.cleanly.ae/socket.io/`.

CORS must be configured in Fastify to allow:
- `https://cleanly.ae`
- `https://company.cleanly.ae`
- `https://admin.cleanly.ae`
- `https://api-staging.cleanly.ae` (staging)
- `http://localhost:*` (development)

Mobile apps do not trigger CORS (React Native / Expo does not use browser CORS). CORS is only relevant for web apps.

---

## Deployment Topology Diagram (Full)

```
Developer pushes to `staging` branch:
  1. GitHub Actions: lint + typecheck + test (changed packages only, Turbo cache)
  2. GitHub Actions: prisma migrate deploy → Neon staging branch
  3. GitHub Actions: flyctl deploy → cleanly-api-staging (bom)
  4. Vercel: auto-detects push, runs turbo-ignore per project, builds changed web apps
  5. EAS: (manual trigger) eas build --profile staging

Developer pushes to `main` branch (after staging validation):
  1. GitHub Actions: lint + typecheck + test (changed packages only, Turbo cache)
  2. GitHub Actions: prisma migrate deploy → Neon production branch
  3. GitHub Actions: flyctl deploy → cleanly-api (bom)
  4. Vercel: auto-detects push, deploys all changed web apps to production
  5. EAS: (manual trigger) eas build --profile production → TestFlight + Play Store

Request path (production):
  Customer Web → Cloudflare (cleanly.ae) → Vercel Edge Network → Next.js SSR
  Mobile App → DNS (api.cleanly.ae) → Cloudflare (or DNS-only) → Fly.io bom → Fastify
  Company Web → Cloudflare (company.cleanly.ae) → Vercel CDN → Vite SPA static files
  WebSocket → wss://api.cleanly.ae → Cloudflare (or DNS-only) → Fly.io → Socket.io
```

---

## Component Responsibilities (Deployment View)

| Component | Host | Deploy Trigger | Config File |
|-----------|------|----------------|-------------|
| apps/api (Fastify + Socket.io) | Fly.io bom (api process group) | GitHub Actions push to main/staging | apps/api/fly.toml |
| apps/api (BullMQ workers) | Fly.io bom (worker process group) | Same deploy as api | apps/api/fly.toml |
| apps/customer-web | Vercel | Git push (Vercel GitHub integration) | apps/customer-web/vercel.json |
| apps/admin-web | Vercel | Git push (Vercel GitHub integration) | apps/admin-web/vercel.json |
| apps/company-web | Vercel | Git push (Vercel GitHub integration) | apps/company-web/vercel.json |
| apps/customer-mobile | EAS Build | Manual trigger (eas build) | eas.json |
| apps/washer-mobile | EAS Build | Manual trigger (eas build) | eas.json |
| packages/db (migrations) | Neon (via CI) | GitHub Actions pre-deploy step | packages/db/schema.prisma |

---

## Deployment Order (Dependency Sequence)

When deploying for the first time or after breaking changes:

```
1. Neon database (already exists — Bahrain region)
   └─ Create staging branch from main
   └─ Configure pooler + direct connection strings

2. Upstash Redis (already exists — Fixed Plan)
   └─ No changes needed for production

3. Cloudflare DNS
   └─ Add A/AAAA records for api.cleanly.ae → Fly.io IPs
   └─ Add CNAME for customer, company, admin → Vercel
   └─ Set SSL mode to Full (strict)

4. Fly.io cleanly-api
   └─ flyctl launch --no-deploy (generates fly.toml)
   └─ fly secrets set DATABASE_URL=... REDIS_URL=... (all secrets)
   └─ flyctl deploy (first deploy)
   └─ prisma migrate deploy runs before first deploy in CI

5. Vercel projects (3 separate projects)
   └─ Import monorepo, set Root Directory per project
   └─ Configure environment variables per project
   └─ Enable Ignored Build Step with turbo-ignore

6. EAS Build (mobile apps)
   └─ eas build --profile staging (TestFlight + Android Internal)
   └─ Human testing on staging before production build

7. Production promotion
   └─ Merge staging to main
   └─ CI runs migrations on production Neon branch
   └─ CI deploys to Fly.io production
   └─ Vercel promotes automatically on main push
   └─ eas build --profile production → App Store submission
```

---

## Application Architecture (Existing — v1.0)

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (5 surfaces)                        │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│  Customer    │  Customer    │  Company     │  Washer      │  Admin           │
│  Web         │  Mobile      │  Web         │  Mobile      │  Web             │
│  (Next.js)   │  (Expo)      │  (Vite/React)│  (Expo)      │  (Next.js)       │
│              │              │              │              │                  │
│  Book, Track │  Book, Track │  Manage      │  Jobs, GPS,  │  Platform        │
│  Pay, Review │  Pay, Review │  Orders,     │  Photos,     │  oversight,      │
│              │              │  Analytics   │  Checklist   │  Config, Data    │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴────────┬────────┘
       │              │              │              │                │
       └──────────────┴──────────────┴──────────────┴────────────────┘
                                     │ HTTPS + WSS
┌────────────────────────────────────┼────────────────────────────────────────┐
│                             API GATEWAY LAYER                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │          Fastify API Server (single process, modular plugins)         │   │
│  │  Auth Plugin │ Rate Limiting │ CORS │ Request Logging │ Error Handler │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       Socket.io Server (same process)                 │   │
│  │  /orders namespace │ /tracking namespace │ /notifications namespace   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬───────────────────────────────────────-┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                             SERVICE LAYER                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │   Auth     │ │   Order    │ │  Payment   │ │  Location  │ │  Notify   │ │
│  │  Service   │ │  Service   │ │  Service   │ │  Service   │ │  Service  │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                             DATA LAYER                                       │
│  ┌─────────────────────┐  ┌────────────────────┐  ┌───────────────────────┐ │
│  │  Neon PostgreSQL     │  │  Upstash Redis     │  │  Cloudflare R2        │ │
│  │  (Bahrain region)    │  │  Fixed Plan        │  │  (photos, signed      │ │
│  │  Primary datastore   │  │  BullMQ + GPS      │  │   URLs, CDN)          │ │
│  │  Prisma ORM          │  │  cache + sessions  │  │                       │ │
│  └─────────────────────┘  └────────────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Notes |
|-----------|---------------|-------|
| Customer Web (Next.js) | Browsing, booking, payment, real-time tracking, reviews | App Router; SSR for SEO on service pages |
| Customer Mobile (Expo) | Same as web + push notifications, location permission | Uses shared `@cleanly/api-client` package |
| Company Web (Vite React) | Order management, washer assignment, analytics, onboarding | SPA only — no SSR needed |
| Washer Mobile (Expo) | Job list, GPS broadcasting, camera for photos, checklists | GPS runs as background task when active |
| Admin Web (Next.js) | Platform oversight, company approval, config, reports | Next.js for auth pages (SSR needed) |
| Fastify API | All business logic, REST endpoints, WebSocket upgrade | Single process; Fastify plugins for modularity |
| Socket.io Server | Real-time GPS push, order state events, notifications | Runs embedded in Fastify process |
| BullMQ Workers | Async jobs: payment capture, push dispatch, photo processing | Separate Fly.io process group from API |
| Neon PostgreSQL | Persistent source of truth for all entities | 15 core tables; Prisma ORM |
| Upstash Redis | Ephemeral: GPS cache, BullMQ queues, rate limits, sessions | Fixed Plan mandatory for BullMQ |
| Cloudflare R2 | Object storage for before/after photos | Presigned URLs; CDN delivery |

---

## Architectural Patterns

### Pattern 1: Modular Monolith (not microservices)

**What:** Single Fastify process with internally-separated modules (plugins/services). All services share one DB connection and one Redis connection.

**When to use:** Always for a solo developer at this scale. Below 10 developers, monoliths decisively win.

**Trade-offs:**
- Pro: Deploy as one unit, debug in one place, no inter-service networking
- Pro: Shared Prisma transaction scope across services (atomic order + payment updates)
- Con: Cannot scale individual services independently — not a concern for UAE launch scale

**Migration path:** When GPS writes become a bottleneck, extract the Location Service to a separate lightweight process first.

### Pattern 2: Order State Machine with Explicit Transition Guards

**What:** Order lifecycle modeled as a finite state machine. Transition logic lives server-side only.

```typescript
// packages/types/order.ts
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:         ['accepted', 'cancelled'],
  accepted:        ['washer_assigned', 'cancelled'],
  washer_assigned: ['en_route', 'cancelled'],
  en_route:        ['arrived'],
  arrived:         ['in_progress'],
  in_progress:     ['completed', 'disputed'],
  completed:       [],
  cancelled:       [],
  disputed:        ['completed', 'cancelled'],
}
```

### Pattern 3: GPS Location via Redis Cache + Socket.io Broadcast

**What:** Washer GPS → Redis `loc:{washerId}` TTL 60s → Socket.io room `order:{orderId}` broadcast.

### Pattern 4: Presigned URL Photo Upload (client-direct-to-R2)

**What:** API issues presigned PUT URL. Mobile client uploads direct to R2. API never handles bytes.

### Pattern 5: Stripe Connect Destination Charges with Auth + Capture

**What:** PaymentIntent created with `capture_method: manual`. Captured on order completion. Transfer to company Connect account minus commission.

### Pattern 6: Multi-Role JWT with Role Claim

**What:** Single JWT with `role` claim. Fastify `preHandler` hook enforces role per route.

---

## Data Flow

### Critical Flow: Order Booking to Real-Time Tracking

```
Customer books → POST /orders
  → DB: order (pending) + Stripe PaymentIntent (authorized)
  → BullMQ: enqueue notify_company

Stripe webhook → payment_intent.succeeded
  → DB: payment_status = authorized

Company accepts → PATCH /orders/:id/accept
  → State machine: pending → accepted
  → Socket.io: emit to customer `order:{id}` { status: accepted }
  → BullMQ: push notification to customer

Washer marks en_route → GPS starts broadcasting
  → POST /location/:washerId → Redis SET + Socket.io broadcast
  → Customer map updates every 4-5 seconds

Order completed → Stripe capture + Connect Transfer
  → BullMQ: receipt email + push notification
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | Server-side PaymentIntent + Stripe Elements on client | Never pass raw card data to API |
| Stripe Connect | Destination charges + Transfer API | Companies must complete KYC |
| Twilio | REST API for SMS OTP | Rate limit: 3/phone/15min |
| Resend | REST API (resend-js SDK) | Transactional only |
| 360dialog | WhatsApp Business API | Template messages only |
| Expo Push | Expo Push Notifications API | Batch sends; prune invalid tokens |
| Cloudflare R2 | S3-compatible SDK with presigned URLs | `@aws-sdk/client-s3` with R2 endpoint |
| Google SSO | OAuth2 — Auth.js v5 | Admin surface only |
| Neon | Prisma + PgBouncer pooler for runtime; direct for migrations | Two connection strings required |
| Upstash Redis | ioredis + BullMQ + (future) socket.io redis-adapter | All three share one Upstash instance |

### Internal Component Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Route handler ↔ Service | Direct function call (same process) | No HTTP between internal modules |
| Service ↔ DB | Prisma client from `@cleanly/db` | Single shared PrismaClient instance |
| Service ↔ Redis | ioredis singleton from `lib/redis.ts` | Shared by BullMQ + Socket.io |
| API process ↔ Worker process | BullMQ Queue via Redis | Only communication channel between process groups |
| Client apps ↔ API | REST over HTTPS via `/api/` prefix | |
| Client apps ↔ Socket.io | WSS upgrade on `/socket.io/` | JWT in handshake query param |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 orders/day | Single Fastify process + single worker process. UAE launch target. |
| 500-5k orders/day | Add read replica on Neon. Cache company listings in Redis. Monitor slow queries. |
| 5k-50k orders/day | Extract GPS location service. Add second API machine + Redis adapter for Socket.io. |
| 50k+ orders/day | Extract notification worker. Consider Kafka. Post-Series A scale — don't build now. |

### Scaling Priorities

1. **First bottleneck: PostgreSQL connection count.** Use pooler connection string from day 1.
2. **Second bottleneck: Socket.io GPS fan-out.** `@socket.io/redis-adapter` already enables horizontal scaling.
3. **Third bottleneck: Notification volume.** BullMQ rate-limiting per queue — never synchronous.

---

## Anti-Patterns

### Anti-Pattern 1: Single Fly.io Machine for API + Worker

**What people do:** Run Fastify API and BullMQ workers in the same process or same machine.

**Why it's wrong:** A spike in BullMQ job processing saturates CPU/memory and degrades API response times. Workers that block the event loop affect real-time Socket.io latency.

**Do this instead:** Fly.io process groups — same Docker image, separate machines, independent scaling.

### Anti-Pattern 2: Single Vercel Project for Multiple Apps

**What people do:** Deploy all Next.js and Vite apps from one Vercel project.

**Why it's wrong:** Vercel projects are per-app. One project cannot serve multiple different root directories.

**Do this instead:** Three separate Vercel projects, all linked to the same GitHub repo, each with its own Root Directory configured.

### Anti-Pattern 3: Using `prisma migrate dev` in Production CI

**What people do:** Run `prisma migrate dev` in the deployment pipeline.

**Why it's wrong:** `migrate dev` is interactive and can prompt to delete migration history. It also runs `db push` as a fallback, which may drop schema elements in ambiguous cases.

**Do this instead:** `prisma migrate deploy` only in CI. Generate migrations locally with `migrate dev`, commit the migration file, then deploy applies it.

### Anti-Pattern 4: Hardcoding API URLs in Mobile App Bundles

**What people do:** Use a `.env` file committed to the repo or hardcode `https://api.cleanly.ae` in the source.

**Why it's wrong:** Cannot point staging builds at the staging API. Breaks the staging environment entirely.

**Do this instead:** EAS build profiles with `EXPO_PUBLIC_API_URL` per profile. Staging builds automatically point to `api-staging.cleanly.ae`.

### Anti-Pattern 5: Cloudflare Proxy on API Subdomain Without Socket.io Heartbeat Config

**What people do:** Enable Cloudflare orange-cloud proxy on `api.cleanly.ae` without configuring Socket.io heartbeats.

**Why it's wrong:** Cloudflare's 100-second idle timeout drops WebSocket connections that haven't sent any frames in 100 seconds. Socket.io default pingInterval is 25s, but needs verification.

**Do this instead:** Either (a) configure Socket.io `pingInterval: 25000` explicitly, or (b) use grey-cloud DNS-only mode for the API subdomain to bypass Cloudflare's timeout entirely.

### Anti-Pattern 6: Sharing Stripe Keys Across Environments

**What people do:** Use the same Stripe test key in staging and production, or accidentally ship test keys to production.

**Why it's wrong:** Real charges on test keys are rejected. Test charges on live keys create real charges.

**Do this instead:** GitHub Environments — staging environment contains `sk_test_*` key, production environment contains `sk_live_*` key. GitHub enforces environment protection so production secrets require reviewer approval.

---

## Sources

- Fly.io process groups docs: https://fly.io/docs/launch/processes/
- Fly.io regions (confirmed no Bahrain): https://fly.io/docs/reference/regions/
- Fly.io continuous deployment with GitHub Actions: https://fly.io/docs/launch/continuous-deployment-with-github-actions/
- Vercel Turborepo deployment docs: https://vercel.com/docs/monorepos/turborepo
- Vercel monorepo FAQ (separate projects per app): https://vercel.com/docs/monorepos/monorepo-faq
- Turborepo GitHub Actions CI guide: https://turborepo.dev/docs/guides/ci-vendors/github-actions
- Neon branching practical guide: https://neon.com/blog/practical-guide-to-database-branching
- Neon + Prisma migrations guide: https://neon.com/docs/guides/prisma-migrations
- Prisma migrate deploy docs: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
- GitHub Actions environments for secrets: https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
- EAS environment variables: https://docs.expo.dev/eas/environment-variables/
- Cloudflare + Fly.io SSL configuration: https://fly.io/docs/networking/understanding-cloudflare/
- Cloudflare WebSocket timeout (100s idle): https://developers.cloudflare.com/network/websockets/
- Neon preview branches with GitHub Actions: https://github.com/neondatabase/preview-branches-with-vercel

---

*Architecture research for: Cleanly — On-demand cleaning services marketplace*
*v1.0 application architecture: 2026-03-30*
*v1.1 production deployment topology: 2026-04-09*

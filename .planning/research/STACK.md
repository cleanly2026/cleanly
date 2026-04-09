# Stack Research

**Domain:** On-demand cleaning services marketplace — v1.1 Deployment Infrastructure
**Researched:** 2026-04-09
**Confidence:** MEDIUM-HIGH (core tooling verified via official docs; Fly.io Bahrain region status is a critical finding below)

---

## CRITICAL FINDING: Fly.io Bahrain Region Does Not Exist

The v1.0 STACK.md stated "Fly.io has Bahrain/Middle East regions" — **this is incorrect**.

Research confirms Fly.io executed a region consolidation project (documented on their blog) that removed ~17 regions. The final network covers North America, Europe, Asia-Pacific, South America, and Africa — **no Middle East or Bahrain region exists**. The original blueprint assumption was based on stale training data.

**Closest available Fly.io region to UAE:** `bom` (Mumbai, India) — approximately 1,700km, +60-80ms latency over direct Gulf hosting.

**Decision required:** Either accept Mumbai latency on Fly.io, or use Railway (Singapore, ~150ms) for simpler DX, or use a Gulf-native provider. For a marketplace at launch scale, Mumbai on Fly.io is acceptable — real-world user latency will be dominated by mobile network delays, not the 60-80ms routing overhead.

**Recommendation: Use Fly.io Mumbai (`bom`) for the API.** Fly.io has 61ms average global latency (vs Railway's 381ms in independent benchmarks), persistent VMs, and a Bahrain region may be added in future.

---

## Recommended Deployment Stack

### Compute (Persistent Processes)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Fly.io | flyctl latest | Host Fastify API + Socket.io + BullMQ worker | Persistent VMs required for Socket.io WebSocket connections and BullMQ long-lived polling. Fly.io has 61ms average latency vs Railway's 381ms (independent 2025 benchmark). Mumbai region (`bom`) is closest to UAE. Two separate machines from same Docker image: API process and worker process. |
| flyctl | latest CLI | Deploy and manage Fly.io machines | `fly tokens create deploy` for GitHub Actions; `fly deploy --remote-only` builds on Fly.io infrastructure without local Docker. |

**Machine sizing for API (Socket.io + Fastify):**
- `shared-cpu-1x` with **512MB RAM** — starting point for Node.js API with Socket.io connections
- Node.js heap is typically 150-300MB at launch scale; 512MB leaves headroom
- If GPS tracking concurrent connections grow past 100, upgrade to `shared-cpu-2x` with 1GB
- Set `NODE_OPTIONS=--max-old-space-size=400` in fly.toml env to prevent heap OOM with 512MB

**Machine sizing for BullMQ worker:**
- `shared-cpu-1x` with **512MB RAM** — BullMQ workers are CPU-light, memory-bound by job payload size
- Worker machine must have `auto_stop_machines = "off"` (or `"suspend"`) — BullMQ polls Redis continuously via HTTP, not incoming TCP connections, so Fly's autostop mechanism (which monitors inbound connections) will kill a worker that has no jobs but is waiting
- Use `min_machines_running = 1` to always keep worker alive

### Web Hosting (Static / SSR)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel | — | customer-web (Next.js), admin-web (Next.js) | Zero-config Next.js deployment. Turborepo monorepo is natively supported — set Root Directory per project, `turbo-ignore` handles skipping unchanged apps. Preview deployments on every PR. |
| Vercel (or Netlify) | — | company-web (Vite SPA) | Static SPA deploys trivially. Deploying on Vercel alongside the Next.js apps gives one dashboard for three web surfaces. Set Root Directory to `apps/company-web`, build command to `turbo build`. |

**Vercel project setup per app (create 3 separate Vercel projects):**
```
Project 1: cleanly-customer-web
  Root Directory: apps/customer-web
  Framework: Next.js
  Build Command: turbo build
  Ignored Build Step: npx turbo-ignore --fallback=HEAD^1

Project 2: cleanly-admin-web
  Root Directory: apps/admin-web
  Framework: Next.js
  Build Command: turbo build
  Ignored Build Step: npx turbo-ignore --fallback=HEAD^1

Project 3: cleanly-company-web
  Root Directory: apps/company-web
  Framework: Vite
  Build Command: turbo build
  Output Directory: dist
  Ignored Build Step: npx turbo-ignore --fallback=HEAD^1
```

### Mobile Distribution

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| EAS Build | eas-cli latest | Build iOS (.ipa) and Android (.apk/.aab) binaries | Cloud build service — no local Xcode/Android Studio required. Handles signing certificates. SDK 55 default build image is Xcode 26.2 (per EAS docs). Integrates with GitHub Actions for automated builds on merge. |
| EAS Submit | eas-cli latest | Submit iOS to TestFlight, Android to internal track | Automated store submission from CI. Wraps `eas submit --platform ios` (uploads to App Store Connect → TestFlight) and `eas submit --platform android --track internal`. |
| EAS Update | eas-cli latest | OTA JavaScript updates | Push JS-only fixes without App Store approval. Critical for solo dev — fixes bugs in hours not days. Requires `expo-updates` in app config. |

### CI/CD

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| GitHub Actions | — | Lint, typecheck, test, deploy on merge | Turborepo remote cache integration eliminates rebuilding unchanged packages. Official Vercel and Fly.io GitHub Actions available. Store `TURBO_TOKEN` + `TURBO_TEAM` as repo secrets for Vercel remote cache. |
| Turborepo Remote Cache | via Vercel | Share build artifacts across CI runs | Set `TURBO_TOKEN` (Vercel scoped token) and `TURBO_TEAM` (Vercel team slug) as GitHub secrets. Each workflow run re-uses cached build outputs from previous runs. Alternative: `rharkor/caching-for-turbo` action uses GitHub Actions Cache API as backing store (free, no Vercel account required). |

### Error Monitoring

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Sentry | @sentry/nextjs 10.x, @sentry/react-native 6.x, @sentry/node 8.x | Error tracking across all 5 surfaces | Per-app DSN — create 5 Sentry projects: customer-web, admin-web, company-web, customer-mobile, washer-mobile. Source maps auto-upload during EAS Build (via `@sentry/react-native/expo` plugin) and Vercel builds (via `withSentryConfig` in next.config.ts). |

**Sentry project mapping for monorepo:**
```
Sentry org: cleanly
  Project: cleanly-customer-web      DSN → NEXT_PUBLIC_SENTRY_DSN_CUSTOMER_WEB
  Project: cleanly-admin-web         DSN → NEXT_PUBLIC_SENTRY_DSN_ADMIN_WEB
  Project: cleanly-company-web       DSN → VITE_SENTRY_DSN_COMPANY_WEB
  Project: cleanly-customer-mobile   DSN → SENTRY_DSN_CUSTOMER_MOBILE
  Project: cleanly-washer-mobile     DSN → SENTRY_DSN_WASHER_MOBILE
```

### DNS + CDN + Storage

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Cloudflare | Free tier | DNS, DDoS protection, R2 storage | Domain DNS proxied through Cloudflare for free DDoS mitigation. R2 bucket for photos requires domain to be in Cloudflare account to attach custom domain (e.g. `assets.cleanly.ae`). |
| Cloudflare R2 | — | Before/after photos, company logos | Already in v1.0 stack. Create bucket, attach custom subdomain via R2 Settings → Custom Domains → Add. Domain must be in same Cloudflare account. |

---

## Dockerfile Pattern (Turborepo + pnpm + Fastify)

The Turborepo `turbo prune` command creates a pruned monorepo containing only the target app and its workspace dependencies — this is the correct pattern for Docker builds in a monorepo (not copying the entire repo).

The `--docker` flag produces two directories:
- `out/json` — package.json files only (for dependency install layer caching)
- `out/full` — full source code (separate layer, rebuilt only when source changes)

```dockerfile
# Stage 1: Prune the monorepo to just the API and its deps
FROM node:20-alpine AS pruner
RUN npm install -g turbo
WORKDIR /app
COPY . .
RUN turbo prune api --docker

# Stage 2: Install dependencies (this layer is cached unless lockfile changes)
FROM node:20-alpine AS installer
RUN npm install -g pnpm
WORKDIR /app
# Copy pruned package.json files only (for cache layer)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Stage 3: Build TypeScript
FROM node:20-alpine AS builder
RUN npm install -g pnpm turbo
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
RUN turbo build --filter=api

# Stage 4: Production runner (minimal image)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy only built output and prod node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Important notes for this stack:**
- `turbo prune api` assumes `"api"` matches the `name` field in `apps/api/package.json`
- Prisma requires a post-install generate step: add `RUN pnpm prisma generate` in the builder stage after copying full source
- The `sharp` package requires native binaries — use `node:20-alpine` consistently across stages (not mixing Debian and Alpine)

---

## fly.toml Pattern (API Machine with Socket.io)

```toml
app = "cleanly-api"
primary_region = "bom"  # Mumbai — closest to UAE

[build]
  dockerfile = "apps/api/Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"
  NODE_OPTIONS = "--max-old-space-size=400"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "suspend"
  auto_start_machines = true
  min_machines_running = 1  # always 1 API machine up

  [http_service.concurrency]
    type = "connections"
    hard_limit = 500
    soft_limit = 400

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

**For the BullMQ worker machine (separate fly.toml at `apps/worker/fly.toml`):**

```toml
app = "cleanly-worker"
primary_region = "bom"

[build]
  dockerfile = "apps/api/Dockerfile"  # same image, different CMD

[env]
  NODE_ENV = "production"
  # No http_service section — worker has no inbound HTTP
  # This means autostop won't trigger (no connection monitoring)

[processes]
  worker = "node dist/worker.js"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

**Socket.io WebSocket on Fly.io:** Fly.io handles WebSocket transparently — TLS is terminated at the edge, and the app sees plain HTTP/TCP on the internal port. No special `fly.toml` configuration needed for WebSocket beyond ensuring the service uses TCP protocol. Sticky sessions are NOT natively supported by Fly.io (as of 2025). Since the API runs as a single machine at launch, this is not an issue. When adding a second API machine, add `@socket.io/redis-adapter` to Upstash Fixed Plan Redis simultaneously.

---

## eas.json Pattern (Expo SDK 55)

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "development",
        "API_URL": "http://localhost:3000"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "env": {
        "APP_ENV": "staging",
        "API_URL": "https://api-staging.cleanly.ae"
      }
    },
    "production": {
      "env": {
        "APP_ENV": "production",
        "API_URL": "https://api.cleanly.ae"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "APPLE_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json",
        "track": "internal"
      }
    }
  }
}
```

**EAS Build notes for SDK 55:**
- Default build image for SDK 55: Xcode 26.2 (auto-selected when no `image` key specified)
- `preview` profile with `distribution: internal` generates APK (Android) for direct install, not AAB
- iOS ad hoc internal distribution caps at 100 registered device UDIDs per year — register devices with `eas device:create` before building preview
- Push notifications require a development build (`eas build --profile development`) — Expo Go cannot receive push notifications from SDK 52+
- `appVersionSource: remote` means EAS manages version bumps, not local package.json

---

## GitHub Actions Workflow Structure

**Recommended: 3-job CI pipeline**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  lint-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: [lint-typecheck, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      # Vercel deployment is handled automatically via Vercel Git integration
      # (push to main triggers Vercel deploy — no manual step needed here)

      # Fly.io API deploy
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only --config apps/api/fly.toml
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      # Fly.io Worker deploy
      - run: flyctl deploy --remote-only --config apps/api/fly.worker.toml
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_WORKER_API_TOKEN }}
```

**Required GitHub Secrets:**
```
TURBO_TOKEN          — Vercel scoped access token (for remote cache)
TURBO_TEAM           — Vercel team slug (e.g., "cleanly-team")
FLY_API_TOKEN        — fly tokens create deploy -x 999999h (API machine)
FLY_WORKER_API_TOKEN — fly tokens create deploy -x 999999h (worker machine)
```

**Alternative remote cache (no Vercel account):** Use `rharkor/caching-for-turbo@v1.9` action which spins up a local cache server backed by GitHub Actions Cache API. Free, no external account required.

---

## Environment Variable Management

**Pattern: per-app .env files, never at monorepo root**

```
cleanly/
  apps/
    api/           .env.local, .env.staging, .env.production
    customer-web/  .env.local, .env.staging, .env.production
    admin-web/     .env.local, .env.staging, .env.production
    company-web/   .env.local, .env.staging, .env.production
    customer-mobile/ .env.local, .env.staging, .env.production
    washer-mobile/ .env.local, .env.staging, .env.production
  packages/        (NO .env files in shared packages)
```

**turbo.json must declare env vars to prevent cache poisoning:**
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "env": ["NODE_ENV", "NEXT_PUBLIC_*", "VITE_*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    }
  }
}
```

**Staging vs Production:**
- Vercel: set env vars per environment (Development / Preview / Production) in Vercel dashboard per project
- Fly.io: `fly secrets set KEY=value --app cleanly-api` for production; use a separate `cleanly-api-staging` app for staging
- EAS Build: use `env` block per profile in eas.json (shown above); sensitive values via `eas secret:create`

**Critical: Do NOT put `SENTRY_AUTH_TOKEN` in .env files** — it's a build-time secret. Set it as a Vercel env var (not exposed to browser) and as an EAS secret (`eas secret:create --name SENTRY_AUTH_TOKEN`).

---

## Sentry Configuration Patterns

**Next.js (customer-web, admin-web) — next.config.ts:**
```typescript
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = { /* ... */ };

export default withSentryConfig(nextConfig, {
  org: "cleanly",
  project: "cleanly-customer-web",  // or cleanly-admin-web
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
});
```

**instrumentation-client.ts (client-side init):**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

**Expo / React Native (app.json plugin addition):**
```json
{
  "plugins": [
    [
      "@sentry/react-native/expo",
      {
        "url": "https://sentry.io/",
        "organization": "cleanly",
        "project": "cleanly-customer-mobile"
      }
    ]
  ]
}
```

**Known issue (SDK 55 + Sentry):** There is a documented GitHub issue (`expo/expo#42494`) where Android EAS builds with Sentry Gradle integration fail due to Gradle 9 incompatibility in some SDK 55 configurations. If this occurs, set `SENTRY_DISABLE_AUTO_UPLOAD=true` and upload source maps manually, or add `SENTRY_ALLOW_FAILURE=true` to allow the build to succeed without source map upload.

---

## Cloudflare R2 Setup Steps

1. Create bucket: Cloudflare Dashboard → R2 → Create bucket (name: `cleanly-photos`)
2. Attach custom domain: Bucket Settings → Custom Domains → Add → enter `assets.cleanly.ae`
   - Domain must be in the same Cloudflare account and have Cloudflare as nameserver
   - Custom domain creation adds a CNAME record automatically
3. Keep bucket private — do not enable public access via r2.dev subdomain
4. Access via presigned URLs from Fastify API (already implemented in v1.0)
5. CORS configuration needed for direct browser upload (washer photo evidence):
   ```json
   [{ "AllowedOrigins": ["https://cleanly.ae", "https://company.cleanly.ae"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["Content-Type", "Content-Length"] }]
   ```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Fly.io Mumbai | Railway Singapore | Railway has simpler DX (no fly.toml, no Docker required). Use Railway if Fly.io operational complexity is blocking for solo dev. Tradeoff: 381ms avg latency vs Fly.io's 61ms. |
| Fly.io Mumbai | Render | Render is even simpler but slower (451ms) and no Middle East/India regions. Avoid. |
| Vercel Remote Cache | GitHub Actions Cache (rharkor/caching-for-turbo) | Use GitHub Cache if not on Vercel paid plan. Zero cost, stores in GitHub. Slower first-time hits vs Vercel CDN. |
| EAS Build (Expo cloud) | Local builds | Local builds require Xcode (Mac only) and Android Studio. Not viable for solo AI-assisted dev on Windows. EAS is non-negotiable. |
| 5 separate Sentry projects | 1 shared Sentry project | Single project reduces noise during development. But separate projects give cleaner error assignment and separate alerting rules per surface. Separate projects are the production pattern. |

---

## What NOT to Do

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fly.io` Bahrain region (`bah`) | Does not exist — was never launched, consolidated project removed hypothetical plans | Use `bom` (Mumbai) as nearest available region |
| Deploying API to Vercel/Netlify serverless | Socket.io WebSockets require persistent connections; serverless cold-starts + 10-30s timeouts kill WebSocket sessions | Fly.io or Railway persistent VMs |
| `auto_stop_machines = "stop"` on BullMQ worker | BullMQ polls Redis constantly — no inbound HTTP traffic means Fly considers worker "idle" and stops it, killing all pending job processing | Set `auto_stop_machines = "off"` for worker machine |
| Building Expo apps with Expo Go for production testing | Push notifications don't work in Expo Go from SDK 52+. GPS background tracking is unreliable in Expo Go. | Always use `eas build --profile development` for device testing |
| Committing `.env` files with secrets | Obvious security issue, but also breaks Turborepo cache invalidation if env values change between machines | Use per-platform secret management (Vercel dashboard, `fly secrets`, EAS secrets) |
| Single Sentry project for all 5 surfaces | Can't distinguish between API errors, mobile crashes, and web errors without surface-specific DSNs | Create 5 Sentry projects, 5 DSNs |
| iOS ad hoc distribution for >100 testers | Apple caps ad hoc provisioning at 100 device UDIDs per year; exceeding requires rebuilding | For wider beta, use TestFlight (production profile + EAS Submit → TestFlight) |
| `turbo prune` without checking workspace name | `turbo prune api` fails silently if the workspace `name` in package.json is `@cleanly/api` not `api` | Use exact `name` field value from the app's package.json |

---

## Version Compatibility (Deployment Tools)

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| EAS CLI 12.x | Expo SDK 55 | SDK 55 default image: Xcode 26.2. Use `sdk-55` image alias in eas.json if explicit version needed. |
| @sentry/nextjs 10.x | Next.js 15+ | v8 minimum requirement for Next.js integration. v10 is current as of 2026. |
| @sentry/react-native 6.x | Expo SDK 55, React Native 0.83 | Expo plugin config via `@sentry/react-native/expo`. Known Gradle 9 incompatibility with some SDK 55 Android builds (see PITFALLS). |
| flyctl latest | Fly Machines API | Always use latest flyctl — breaking changes happen frequently. Pin version in CI only if a specific release is required. |
| superfly/flyctl-actions | flyctl latest | Use `@master` for latest. Pin to a tag only if CI stability is paramount. |
| Turborepo 2.4.1+ | Next.js Skew Protection | Required if using Vercel Skew Protection. Versions below 2.4.1 cause asset-missing issues in production with Skew Protection enabled. |

---

## Sources

- Fly.io region consolidation blog (fly.io/blog/the-region-consolidation-project/) — confirmed no Bahrain/Middle East region, Mumbai (bom) is nearest — MEDIUM confidence (page fetched, confirms network covers NA/EU/APAC/SA/Africa only)
- Fly.io WebSocket blog (fly.io/blog/websockets-and-fly/) — WebSocket handled transparently, TLS terminated at edge — HIGH confidence
- Fly.io community forum — BullMQ worker autostop issue documented, `auto_stop_machines = "off"` required for workers — MEDIUM confidence (community posts, no official docs)
- Vercel Turborepo docs (vercel.com/docs/monorepos/turborepo) — Root Directory per app, turbo-ignore for ignored builds, build command patterns — HIGH confidence (official docs fetched)
- EAS Build docs (docs.expo.dev/build/eas-json/) — profile structure, distribution modes, SDK 55 image — HIGH confidence (official docs fetched)
- EAS internal distribution docs (docs.expo.dev/build/internal-distribution/) — ad hoc 100 UDID cap, APK vs AAB — HIGH confidence
- Sentry Next.js docs (docs.sentry.io) — withSentryConfig pattern, instrumentation-client.ts — HIGH confidence (official docs fetched)
- Sentry monorepo best practices (github.com/getsentry/sentry-docs/issues/10631) — separate DSN per app recommended — MEDIUM confidence (GitHub issue, community consensus)
- GitHub Actions Fly.io docs (fly.io/docs/launch/continuous-deployment-with-github-actions/) — full workflow YAML, FLY_API_TOKEN setup — HIGH confidence (official docs fetched)
- Turborepo GitHub Actions docs (turborepo.dev/docs/guides/ci-vendors/github-actions) — TURBO_TOKEN/TURBO_TEAM pattern — HIGH confidence
- Cloudflare R2 custom domain docs (developers.cloudflare.com/r2/buckets/public-buckets/) — custom domain setup steps — HIGH confidence
- Openstatus latency benchmark (openstatus.dev/blog/monitoring-latency-cf-workers-fly-koyeb-raylway-render) — Fly.io 61ms vs Railway 381ms — MEDIUM confidence (independent benchmark, 2025)
- expo/expo#42494 GitHub issue — SDK 55 + Sentry Gradle 9 incompatibility — HIGH confidence (active GitHub issue)
- Turborepo 2.4.1 Skew Protection fix (vercel docs) — requirement for Next.js Skew Protection — MEDIUM confidence (docs note)

---

*Stack research for: Cleanly — v1.1 deployment infrastructure*
*Researched: 2026-04-09*
*Supersedes: Infrastructure & DevOps section of STACK.md v1.0 (researched 2026-03-30)*

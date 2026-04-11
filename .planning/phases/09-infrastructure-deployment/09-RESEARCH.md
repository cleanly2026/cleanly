# Phase 9: Infrastructure Deployment - Research

**Researched:** 2026-04-11
**Domain:** Deployment infrastructure (Fly.io + Vercel + Cloudflare R2 CORS)
**Confidence:** HIGH

## Summary

Phase 9 deploys the v1.0 codebase to two real environments (staging + production). The stack is already scaffolded — Fastify 5 + BullMQ + Socket.io + ioredis + Upstash are installed, `@fastify/rate-limit` already wires in Redis, a `/health` endpoint already exists (but needs upgrading to `/healthz` with Prisma + Redis ping), and CORS already uses env-var origins. No Dockerfile or fly.toml exists anywhere in the repo — everything in this phase is additive.

The four load-bearing risks are:
1. **Worker process group config on Fly** — the CLAUDE.md requirement "BullMQ worker has `auto_stop_machines = off`" is fulfilled automatically by NOT giving the worker a `[[services]]` block. A worker with no `[[services]]` entry is invisible to Fly Proxy, so Fly Proxy can never auto-stop it. Trying to add `auto_stop_machines = "off"` to a worker `[[services]]` block it doesn't need creates confusion and surface area for mistakes.
2. **Turborepo cache poisoning on Vercel** — `NEXT_PUBLIC_*` / `VITE_*` vars are inlined into client bundles at build time. Turborepo 2.x framework-inference SHOULD auto-detect these, but explicitly declaring them in `turbo.json` `env` / `globalEnv` is the documented safety net. Cache poisoning is the failure mode where a staging build is reused for production.
3. **R2 bucket CORS** — a wildcard `"*"` in `AllowedHeaders` will fail preflight for presigned PUT uploads in some browsers. `content-type` MUST be listed explicitly.
4. **Two separate Fly apps for staging/prod** — not two environments in one app. Each app gets its own `fly.toml` (or one file with `--app` flag), its own secrets, its own Upstash Redis, and its own Neon branch.

**Primary recommendation:** Build one `Dockerfile` using `turbo prune --docker api` + pnpm, one `fly.toml` per environment (or one file deployed with `--app`), use `[http_service]` (not `[[services]]`) for the API, omit any `[[services]]` block for the worker, and import secrets with `fly secrets import` from a dotenv file stored in GitHub Environments (never committed). Wire `/healthz` to ping Prisma + Redis and return 503 on failure. Use Vercel's default Turborepo detection for the three web apps — manual Root Directory + Build Command override only if auto-detection fails.

<user_constraints>
## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for Phase 9 (research is running standalone before `/gsd:discuss-phase`). Constraints are sourced from CLAUDE.md, STATE.md, REQUIREMENTS.md, and the phase ROADMAP section.

### Locked Decisions (from STATE.md + CLAUDE.md)

- **Fly.io region: Mumbai (`bom`)** — per STATE.md: "Fly.io Mumbai region (bom) — no Bahrain/Middle East region exists on Fly.io". This supersedes the older CLAUDE.md reference to Bahrain region. Mumbai is the closest Fly.io region to Gulf users (~120-160ms to UAE).
- **Platform subdomains for beta** — staging at `cleanly-api-staging.fly.dev`, production at `cleanly-api.fly.dev`. Web apps use `*.vercel.app`. No custom domain in v1.1.
- **Staging-first deployment** — staging must be green before production.
- **Two Fly apps, not one** — `cleanly-api-staging` and `cleanly-api` are separate Fly apps (confirmed by success criteria URLs).
- **Two process groups** — `api` (HTTP on port 8080) and `worker` (BullMQ, no HTTP).
- **BullMQ worker must never auto-stop** — stopping the worker stalls the queue (documented in STATE.md).
- **Upstash Redis Fixed Plan ($10/mo)** — CLAUDE.md "What NOT to Use": PAYG Redis with BullMQ blows up billing.
- **ioredis with `tls: {}`** for all Upstash connections (confirmed by existing `apps/api/src/lib/redis.ts`).
- **Rate limiting must survive deploys** — must be Redis-backed, not in-memory (FLY-07 + success criteria #5).
- **Turborepo env vars declared in `turbo.json`** — prevent cache poisoning (STATE.md decision).
- **Neon: pooled URL for runtime, direct URL for migrations** — two-URL config, already enforced by `env.ts` Zod schema.
- **CORS production allowlist only** — no wildcards (FLY-05 already uses env vars).
- **R2 CORS: explicit `content-type` header** (VCL-06) — not wildcard `*`.
- **Solo-dev operability** — no Kubernetes, no HashiCorp Vault, no blue-green, no multi-region. Fly.io + GitHub Environments + Fly secrets are sufficient.

### Claude's Discretion (research options and recommend)

- Whether `[http_service]` or `[[services]]` is right for Socket.io (answer: `[http_service]` — it handles WebSocket upgrades natively on standard ports).
- Whether to use one `fly.toml` with `--app` flag or two separate files (`fly.staging.toml` + `fly.production.toml`). Recommendation below.
- How staging API's Socket.io should handle the Redis adapter — the codebase ALREADY uses `@socket.io/redis-adapter`. This means both staging and production need separate Upstash instances (or pub/sub namespacing), OR the adapter should be removed until horizontal scaling is needed. Recommendation below.
- Whether to use `@fastify/rate-limit` nameSpace to namespace staging vs prod keys in a shared Upstash, or use separate Upstash instances.
- Exact Dockerfile Node image (`node:20-alpine` vs `node:20-slim`).
- Whether `turbo-ignore` is still needed on Vercel (Vercel's newer built-in skip-unaffected may have replaced it).
- Exact health check path naming (`/health` already exists — upgrade to `/healthz` or extend existing `/health`).

### Deferred Ideas (OUT OF SCOPE)

- Custom domain (v1.2).
- Kubernetes / container orchestration.
- HashiCorp Vault / external secrets manager.
- Prometheus / Grafana.
- Multi-region API deployment.
- Blue-green deployments (Fly rolling deploys are sufficient).
- CI/CD automation (that's Phase 10 — this phase deploys manually via `fly deploy` and Vercel dashboard).
- Sentry / Better Stack (Phase 10).
- Prisma migrate deploy in CI (Phase 10 — in this phase migrations run manually).
- Wildcard CORS origin (`*`).
- In-memory rate limiting.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLY-01 | Dockerfile using `turbo prune api` for minimal production image | Canonical multi-stage Dockerfile in [Code Examples](#dockerfile-for-turborepo--pnpm--api) below, sourced from Turborepo official docs |
| FLY-02 | fly.toml with two process groups: `api` (HTTP, port 8080) and `worker` (BullMQ, no HTTP) | `[processes]` table + `[http_service]` filtering by `processes = ["api"]`; worker gets no services block |
| FLY-03 | BullMQ worker machine has `auto_stop_machines = "off"` — never auto-stopped | **Correction:** workers with no `[[services]]` block are invisible to Fly Proxy and cannot be auto-stopped. The requirement is satisfied automatically. Add an explicit comment in fly.toml to make this clear to future readers. |
| FLY-04 | API machine has `min_machines_running = 1` — always available | Set in `[http_service]` alongside `auto_stop_machines = "stop"` and `auto_start_machines = true` |
| FLY-05 | Health check endpoint (`/healthz`) returning DB + Redis connectivity status | Existing `/health` is a stub — upgrade with Prisma `SELECT 1` + `redis.ping()`, return 200/503. See [Health Check Pattern](#fastify-healthz-pattern) |
| FLY-06 | Socket.io WebSocket connections verified working through Fly.io proxy | `[http_service]` natively handles WS upgrades — no extra config. Existing `setupSocketHandlers` already attaches to the Fastify HTTP server. |
| FLY-07 | Rate limiting backed by Upstash Redis — survives deploys | Already wired in `apps/api/src/plugins/rate-limit.ts`. Verify `nameSpace` set so staging/prod don't collide if sharing Upstash. |
| FLY-08 | Staging API deployed and reachable at `cleanly-api-staging.fly.dev` | `fly apps create cleanly-api-staging --org personal --region bom` |
| FLY-09 | Production API deployed and reachable at `cleanly-api.fly.dev` | `fly apps create cleanly-api --org personal --region bom` |
| VCL-01 | Customer-web Vercel project: Root Directory `apps/customer-web` + turbo-ignore | Vercel auto-detects Turborepo; default settings work. Manual override if needed — see [Vercel Config](#vercel-project-settings) |
| VCL-02 | Admin-web Vercel project: Root Directory `apps/admin-web` + turbo-ignore | Same as VCL-01, different filter |
| VCL-03 | Company-web Vercel project: Root Directory `apps/company-web` + turbo-ignore | Vite SPA — Framework Preset: Vite, Output Directory: `dist` |
| VCL-04 | Turborepo env declarations in turbo.json for NEXT_PUBLIC_* and VITE_* vars | Turbo 2.x framework inference AUTO-detects these, but explicit declaration is still recommended as safety. See [turbo.json env patterns](#turbojson-env-declarations) |
| VCL-05 | CORS production config on API allows only deployed Vercel origins | Existing code already uses env-var allowlist — set `CUSTOMER_WEB_URL`, `COMPANY_WEB_URL`, `ADMIN_WEB_URL` to real Vercel URLs in Fly secrets. Also apply to Socket.io CORS (separate config in `lib/socket.ts`) |
| VCL-06 | Cloudflare R2 CORS policy uses explicit `content-type` header | Bucket CORS JSON `AllowedHeaders: ["content-type"]` — never `["*"]`. See [R2 CORS section](#cloudflare-r2-cors-policy) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

CLAUDE.md is authoritative for stack decisions. Directives relevant to this phase:

| Directive | Source | Phase 9 Implication |
|-----------|--------|---------------------|
| **Fastify 5.8.4 on Node 20+** | Recommended Stack | Dockerfile base image must be `node:20-*` |
| **Upstash Redis Fixed Plan — NEVER PAYG** | "What NOT to Use" | When provisioning staging Upstash, use Fixed Plan. Phase 8 already handles this in ACCT-04. |
| **Fly.io region preference** | CLAUDE.md says `bah`, but STATE.md overrides to `bom` (Mumbai) because Bahrain region was discontinued/never existed | Use `bom`. Do NOT use `bah` — it will fail at deploy time. |
| **Serverless is incompatible with API** | "What NOT to Use" | Do NOT deploy API to Vercel functions. Fly machines only for API + worker. |
| **Prisma + `@prisma/adapter-neon`** | "What NOT to Use" (Prisma without neon adapter exhausts pool) | Already wired. Health check must use the Prisma client (which uses the adapter), not raw SQL. |
| **PgBouncer pooled URL for runtime, direct URL for migrations** | Database section | `DATABASE_URL` and `DIRECT_URL` enforced by `env.ts` Zod schema — production secrets must also enforce this. |
| **Socket.io single-server at launch** | Real-Time section: "no Redis adapter needed" | **Codebase already uses the Redis adapter** (see `apps/api/src/lib/socket.ts` line 45). This is not a blocker but is inconsistent with CLAUDE.md guidance. Phase 9 should NOT revert this — the adapter is installed, tested, and working. Document it. |
| **TLS for all Upstash connections** | Redis section | `rediss://` URL + `tls: {}` ioredis option — already enforced in `env.ts` Zod refine |
| **Use `@fastify/rate-limit` with Redis** | Supporting Libraries | Already wired in `plugins/rate-limit.ts` — verify it gets tested in this phase |
| **Solo-builder operability** | Constraints | Prefer one fly.toml with `--app` flag (simpler) over two files |
| **No Kubernetes** | Out of Scope | No k8s probes — use Fly's built-in HTTP health check in `[http_service.http_checks]` |

## Runtime State Inventory

> Phase 9 is a greenfield deployment — no rename/refactor/migration involved. This section documents what runtime state the deployment WILL create so Phase 10 (CI/CD) and Phase 11 (staging validation) know what exists to act on.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None being renamed.** The phase CREATES Neon staging/prod branches (already done in Phase 8 ACCT-03), Upstash instances (Phase 8 ACCT-04), and an R2 bucket `cleanly-photos` (Phase 8 ACCT-09). No existing records are being modified. | None — code edit only |
| Live service config | Vercel project settings (3), Fly app config (2), R2 bucket CORS (1) — all created/modified in this phase. These live in dashboards, NOT in git. | Document in `.planning/phases/09-infrastructure-deployment/09-DEPLOYMENT-RUNBOOK.md` (to be created by planner) |
| OS-registered state | **None.** No Windows Task Scheduler, pm2, launchd, or systemd registrations. Fly's supervisor is internal to the machine. | None — verified by CLAUDE.md constraint "solo builder, no Kubernetes" |
| Secrets and env vars | `fly secrets set` will register: `DATABASE_URL`, `DIRECT_URL`, `UPSTASH_REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `TWILIO_*` (4), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `DIALOG360_API_KEY`, `R2_*` (5), `SENTRY_DSN`, `ADMIN_EXCHANGE_SECRET`, plus the URL allowlist `CUSTOMER_WEB_URL`/`COMPANY_WEB_URL`/`ADMIN_WEB_URL`/`ALLOWED_ORIGINS`. Staging and production MUST use DIFFERENT values for: `DATABASE_URL`, `DIRECT_URL`, `UPSTASH_REDIS_URL`, `STRIPE_SECRET_KEY` (test vs live), `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`. `JWT_SECRET` SHOULD also differ between environments. | Bulk import via `fly secrets import --app cleanly-api-staging < .env.staging` then `--app cleanly-api < .env.production`. Never commit either file. |
| Build artifacts / installed packages | Dockerfile builds the `api` image once per deploy. Vercel builds three web apps per deploy (one per project). No persistent artifacts outside the Fly image registry and Vercel's CDN. | None — managed by Fly/Vercel |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `flyctl` CLI | FLY-01..09 | Unknown (user must install) | latest | — |
| Docker (local, for test build) | Dockerfile verification | Optional | any | Rely on Fly remote builders (`fly deploy` builds remotely) |
| Fly.io account | FLY-08, FLY-09 | Must exist (Phase 8 ACCT-10) | — | — |
| Vercel account + CLI (optional) | VCL-01..03 | Must exist (Phase 8 ACCT-11) | — | Vercel dashboard-only workflow works |
| GitHub repo | Vercel import | Exists | — | — |
| Neon pooled + direct URLs | FLY-05 health check | Must exist (Phase 8 ACCT-03) | Neon serverless | — |
| Upstash Redis instances | FLY-05, FLY-07 | Must exist (Phase 8 ACCT-04) | Fixed Plan | — |
| Cloudflare R2 bucket | VCL-06 | Must exist (Phase 8 ACCT-09) | — | — |
| Node 20+ locally (for building) | Dockerfile | Must exist | 20 LTS | — |
| pnpm 9+ locally | Dockerfile | Must exist | 9.15.0 (from package.json) | — |
| turbo 2.9.1 | Dockerfile | Installed as devDep | 2.9.1 | — |

**Missing dependencies with no fallback:** None (assuming Phase 8 completed accounts).

**Missing dependencies with fallback:** Local Docker — `fly deploy` uses Fly remote builders by default.

**Blocking prerequisite:** Phase 8 must be complete. In particular ACCT-03 (Neon production branch), ACCT-04 (Upstash), ACCT-09 (R2 + CORS), ACCT-10 (Fly apps), ACCT-11 (Vercel projects). If any of these are incomplete, Phase 9 cannot start.

## Standard Stack

### Core (confirmed from repo inspection)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | 5.8.4 | HTTP server | Already installed. Fastify 5 requires Node 20+. |
| Node.js | 20 LTS | Runtime | Required by Fastify 5 + required for `@prisma/adapter-neon`. Docker base: `node:20-alpine` |
| Turborepo | 2.9.1 | Monorepo orchestration | Already installed. 2.x uses `tasks` key (not `pipeline`). `turbo prune --docker` is production-ready. |
| pnpm | 9.15.0 | Package manager | Declared in root `package.json` as `packageManager`. Dockerfile must use the same version. |
| Prisma | 6.5+ | ORM | Already installed. Prisma adapter-neon is version 7.6.0 in `apps/api/package.json` — this is unusual (adapter version > Prisma version) but npm-valid. |
| `@prisma/adapter-neon` | 7.6.0 | Neon connection pooling | Already installed |
| BullMQ | 5.71.1 | Job queue | Already installed |
| ioredis | 5.10.1 | Redis client for BullMQ + Fastify rate-limit + Socket.io adapter | Already installed |
| Socket.io | 4.8.3 | WebSockets | Already installed; attached in `server.ts` after `listen()` |
| `@socket.io/redis-adapter` | 8.3.0 | Cross-instance pub/sub | Already installed and wired — see note about CLAUDE.md divergence above |
| `@fastify/cors` | 11.2.0 | CORS | Already wired |
| `@fastify/rate-limit` | 10.3.0 | Rate limit with Redis store | Already wired |

### Deployment-only (to be added this phase)

| Tool | Version | Purpose | Why Needed |
|------|---------|---------|-----------|
| flyctl | latest (2026) | Fly.io CLI | Creates apps, sets secrets, deploys |
| Fly.io | (SaaS) | API + worker host | Solo-dev operability, Mumbai region for Gulf latency |
| Vercel | (SaaS) | Web app host | Next.js-native; handles Vite SPAs too |

**Installation:**
```bash
# flyctl (one-time, user machine)
curl -L https://fly.io/install.sh | sh

# Vercel CLI (optional — can use dashboard)
pnpm add -g vercel
```

**Version verification performed 2026-04-11:**
- `turbo@2.9.1` — pinned in root `package.json`, matches 2.x schema
- `fastify@5.8.4` — matches CLAUDE.md
- `@fastify/rate-limit@10.3.0` — matches npm latest (verified via fastify-rate-limit npm page)
- `bullmq@5.71.1` — matches CLAUDE.md
- `node:20-alpine` — Node 20 is LTS through April 2026 per Node release schedule

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fly.io | Railway | Railway has a Singapore region (+50ms latency vs Mumbai). Simpler UI but less control. CLAUDE.md already evaluated and chose Fly.io for region + control. |
| `[http_service]` | `[[services]]` | `[[services]]` is needed only for non-HTTP ports or custom handlers. Socket.io works over standard HTTP upgrade, which `[http_service]` handles natively. Use `[http_service]` unless you hit a concrete limit. |
| Two `fly.toml` files | One `fly.toml` + `--app` flag | Two files is more explicit but duplicates config. One file with `fly deploy --app cleanly-api-staging --config fly.toml` is simpler. **Recommendation: one file**. |
| `fly secrets set` (per-secret) | `fly secrets import` (bulk from stdin) | Import is much faster for 20+ secrets and avoids shell escaping issues. **Recommendation: `fly secrets import`**. |
| Vercel for company-web | Netlify | Vercel is already chosen for Next.js apps; adding Netlify for one Vite SPA adds surface area. Vercel handles Vite builds fine via Framework Preset. |
| `turbo-ignore` (explicit) | Vercel's built-in skip-unaffected | Vercel docs say: "Vercel has improved Turborepo such that you no longer need to use turbo-ignore. Instead, they encourage you to use the new setting to automatically ignore projects without changes." **Recommendation: start with Vercel's default, add `turbo-ignore` only if default fails.** But requirement VCL-01/02/03 explicitly mentions `turbo-ignore` — the planner should make this call. Both satisfy the intent. |

## Architecture Patterns

### Recommended Project Structure (additions this phase)

```
repo root/
├── apps/
│   └── api/
│       └── Dockerfile              # NEW — at apps/api (not root)
├── fly.toml                        # NEW — at repo root
├── .dockerignore                   # NEW — at repo root
└── turbo.json                      # MODIFY — add env declarations
```

**Dockerfile location:** Place at `apps/api/Dockerfile`, not at repo root. Deploy with `fly deploy --dockerfile apps/api/Dockerfile --config fly.toml` from repo root. The Docker build context is the repo root (so `turbo prune` sees the whole monorepo). This is the standard Turborepo+Docker pattern.

**Single `fly.toml` vs two:** Use ONE `fly.toml` at repo root. The app name in `fly.toml` (`app = "cleanly-api"`) is overridden by the CLI flag `--app cleanly-api-staging`. Keep staging and production identical except for secrets.

### Pattern 1: Turborepo Multi-Stage Docker Build

**What:** Four-stage build — prune, install, build, runtime — that produces a minimal image containing only `apps/api` and its transitive workspace deps.

**When to use:** Any Dockerized deploy of a single app from a monorepo.

**Why:** Each stage is cached independently. Changing `apps/api/src/foo.ts` rebuilds only the `builder` stage — the `installer` stage is cached because `apps/api/package.json` didn't change.

### Pattern 2: Fly Process Groups with Mixed HTTP/Non-HTTP

**What:** `[processes]` table defines multiple commands. `[http_service]` filters by `processes = ["api"]` so only the api machine receives HTTP traffic. The worker machine has NO service block, making it invisible to Fly Proxy.

**Why this satisfies FLY-03:** Fly Proxy can only auto-stop machines that have services routing to them. A machine not referenced by any `[[services]]` / `[http_service]` block is never touched by the proxy's autostop logic. Setting `auto_stop_machines = "off"` on such a machine is a no-op (and not valid syntax at process-group level).

### Pattern 3: Two Fly Apps for Staging/Production Isolation

**What:** `fly apps create cleanly-api-staging` and `fly apps create cleanly-api`. Each app has its own secret vault, scale, and billing. Deploys target with `--app`.

**Why:** Fly.io official "Staging and production isolation" blueprint recommends multiple organizations for maximum isolation, but two apps in one org is the practical pattern for solo dev. Each app's secrets are separate by default.

### Anti-Patterns to Avoid

- **Single Fly app with "env" switch**: Do not try to run staging + production in the same Fly app. Fly has no first-class environment concept — use two apps.
- **Worker in `[[services]]`** for the purpose of setting `auto_stop_machines = "off"`: Unnecessary and misleading. Workers without HTTP get no `[[services]]` block; they're automatically never auto-stopped because Fly Proxy doesn't know about them.
- **Mounting source code at runtime**: Dockerfile must `COPY` built output. Never `npm install` at container start — it breaks cold starts and makes images non-reproducible.
- **Using `NEXT_PUBLIC_*` or `VITE_*` as secrets**: These are baked into client bundles at build time — they're public. Put only publishable keys here (e.g., Stripe `pk_live_*`, public Sentry DSN).
- **Relying on in-memory state in Fastify**: The codebase has in-memory rate limit fallback on cold start. Confirm the Redis config path is hit in production (health check should verify Redis is connected).
- **Wildcard `AllowedHeaders: ["*"]` in R2 CORS**: Some browsers reject preflight for presigned PUT when `content-type` is sent but not listed. List it explicitly.
- **CORS `origin: true`**: Fastify CORS `origin: true` reflects any origin. Never use in production. Use an explicit array of strings.
- **Reusing the BullMQ Redis connection for Socket.io pub/sub**: Already correctly separated in `apps/api/src/lib/socket.ts` — `pubClient = new Redis(...)` not the `redis` singleton. BullMQ requires `maxRetriesPerRequest: null` which conflicts with pub/sub clients.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monorepo Docker dep pruning | Custom `COPY apps/api apps/api && COPY packages packages` | `turbo prune --docker api` | Pruning handles transitive workspace deps, creates pruned lockfile, and caches optimally. Manual COPY misses indirect deps and defeats Docker layer caching. |
| Redis-backed rate limiting | Custom token bucket + Redis SETEX | `@fastify/rate-limit` with `redis` option | Already wired. Handles key generation, race conditions, plugin lifecycle, and `skipOnError` fallback. |
| Health check logic | Custom probe endpoint | Plain Fastify route calling `prisma.$queryRaw'SELECT 1'` + `redis.ping()` with `Promise.allSettled` | A full library is overkill for one endpoint, but the pattern is standard — don't reinvent how to format the 503 response. |
| Env var validation | Runtime `if (!process.env.X) throw` | `zod` schema in `lib/env.ts` | Already done — just need to add any new production-only vars (e.g., `R2_BUCKET_CORS_ORIGINS`). |
| CORS allowlist | Regex matching on `origin` header | Array of strings in `@fastify/cors` | Already done — just point env vars at real Vercel URLs. |
| Bulk secret upload to Fly | Loop with `fly secrets set` | `fly secrets import < .env.production` | Single-command, atomic, no shell escaping hell. |
| Staging-vs-prod config switching | `if (NODE_ENV === 'staging')` branches | Two Fly apps, two secret vaults, same code | Branches in code are a smell; environment is config, not code. |

**Key insight:** Everything on this list is already wired in the codebase or is a 10-line idiom. The deployment work is almost entirely configuration — fly.toml, turbo.json env section, Vercel dashboard settings, R2 CORS JSON — not code.

## Common Pitfalls

### Pitfall 1: Worker machine gets auto-stopped despite `auto_stop_machines = "off"`
**What goes wrong:** Developer adds a `[[services]]` block for the worker to set `auto_stop_machines = "off"`. The block has no real purpose (worker has no HTTP), but by adding it, they make the worker visible to Fly Proxy — which then DOES start applying autostop logic, and the "off" value may not be honored correctly at the service level if misconfigured.
**Why it happens:** CLAUDE.md and requirement FLY-03 say "worker has `auto_stop_machines = off`" — naturally you look for where to write that string.
**How to avoid:** Do NOT create a services block for the worker at all. A worker with no services is untouchable by the proxy. Add a comment in fly.toml explaining this.
**Warning signs:** Worker process appears in `fly status` as "stopped" unexpectedly; BullMQ queue backs up.

### Pitfall 2: Turborepo cache poisoning between staging and production builds
**What goes wrong:** Staging build caches a bundle containing `NEXT_PUBLIC_API_URL=https://cleanly-api-staging.fly.dev`. Production build reuses the cached bundle. Production web app calls the staging API. Chaos.
**Why it happens:** Turbo doesn't know that `NEXT_PUBLIC_API_URL` affects the build output unless you tell it. Next.js inlines the variable as a string literal in the bundle — but Turbo hashes inputs, not outputs.
**How to avoid:** Declare all `NEXT_PUBLIC_*` and `VITE_*` vars in `turbo.json` `globalEnv` (or per-task `env`). Turbo 2.x framework inference is supposed to auto-detect `NEXT_PUBLIC_*` and `VITE_*` — but explicit declaration is the documented insurance. Also: use `globalEnv: ["NODE_ENV", "VERCEL_ENV"]` so the cache key differs between Vercel preview/production.
**Warning signs:** Customer web app in production hits the staging API domain; Stripe test keys appear in production bundle (inspect `view-source:` on prod site).

### Pitfall 3: Rate limiting reverts to in-memory after deploy
**What goes wrong:** Fastify's rate-limit plugin falls back to in-memory if Redis connection fails at registration time. Deployment succeeds, limits "work" in local testing, but after a deploy or cold start the limits reset per machine.
**Why it happens:** `@fastify/rate-limit`'s `skipOnError` option defaults to `false`, but if the Redis client isn't ready when the plugin registers, it may enter a degraded state without crashing.
**How to avoid:** Confirm `redis.ping()` succeeds in `/healthz` at startup. If Redis isn't connected at plugin registration, crash the process (`skipOnError: false` + startup failure). Also: set an explicit `nameSpace` in the rate-limit config so you can tell apart staging and production keys in the Upstash console.
**Warning signs:** Rate limiter "works" in dev but OTP endpoints can be hammered in staging; `fastify-rate-limit-` keys don't appear in Upstash `SCAN`.

### Pitfall 4: R2 presigned PUT fails with CORS error only in certain browsers
**What goes wrong:** Washer tries to upload before-photo from iOS Safari. Upload fails with CORS preflight error. Desktop Chrome works fine.
**Why it happens:** R2 bucket CORS has `AllowedHeaders: ["*"]`. Some browsers (especially Safari) are strict — when a PUT preflight sends `Content-Type: image/jpeg`, the browser requires `content-type` to be listed explicitly in `AllowedHeaders`, not just matched by wildcard.
**How to avoid:** Always list `content-type` explicitly: `AllowedHeaders: ["content-type"]`. If additional custom headers are used (e.g., `x-amz-meta-*`), list each explicitly. This is documented in Cloudflare R2 docs: "Cross-origin requests that include custom headers should specify these headers as AllowedHeaders."
**Warning signs:** Uploads work for some users, fail for others; error is `Preflight response is not successful` in Safari console.

### Pitfall 5: Socket.io CORS is separate from @fastify/cors
**What goes wrong:** Developer adds production origins to `@fastify/cors` but Socket.io connections from the browser get rejected with "origin not allowed".
**Why it happens:** Socket.io manages its own CORS config (`new Server(http, { cors: {...} })`), completely independent of `@fastify/cors`. The existing code in `apps/api/src/lib/socket.ts` already reads origin from env vars — but make sure production secrets set all four URL vars (`CUSTOMER_WEB_URL`, `COMPANY_WEB_URL`, `CUSTOMER_MOBILE_URL`, `WASHER_MOBILE_URL`).
**How to avoid:** In Phase 9 verification, test a Socket.io connection from the deployed customer-web to the deployed API — not just an HTTP request. Also: the mobile URLs should be set to the real Expo dev client URLs or platform URL schemes in staging.
**Warning signs:** HTTP API works, Socket.io `connect_error` in browser console with "origin not allowed".

### Pitfall 6: Fly machines start with outdated secrets after `fly secrets set`
**What goes wrong:** You run `fly secrets set X=new` then `fly deploy`. The machines have the OLD value for `X`.
**Why it happens:** By default `fly secrets set` queues the change and triggers a restart. But race conditions between set + deploy can result in the deploy using pre-update config.
**How to avoid:** Use `fly secrets set --stage X=new Y=new` to stage multiple changes without restarting, then `fly deploy` applies them. Or run `fly secrets deploy` after import.
**Warning signs:** Application behaves as if it's using old env vars even after secret change; `fly logs` show old DB URL connection.

### Pitfall 7: Neon pooled URL used for migrations (silent corruption)
**What goes wrong:** `prisma migrate deploy` runs through the pooled (PgBouncer) URL. Transactional DDL statements are silently non-transactional; partial migrations leave the schema in an inconsistent state.
**Why it happens:** PgBouncer in transaction mode doesn't support all Postgres features that Prisma migrate needs (prepared statements, advisory locks).
**How to avoid:** Already enforced by Zod schema in `env.ts` — `DATABASE_URL` must contain `-pooler`, `DIRECT_URL` must NOT. Phase 9 migration runs manually must use `DIRECT_URL`. Phase 10 CI/CD will automate this.
**Warning signs:** Prisma migrate hangs or succeeds partially; schema drift between environments.

### Pitfall 8: Vercel rebuilds every app on every commit
**What goes wrong:** Changing `apps/api/src/foo.ts` triggers rebuilds of all three web apps on Vercel. Build minutes quota exhausts; preview deploys take 15+ minutes.
**Why it happens:** Without a proper "Ignored Build Step", Vercel rebuilds any project on any commit to any branch it's watching.
**How to avoid:** Set Ignored Build Step to `npx turbo-ignore` (optionally with `--fallback=HEAD^1`). Each Vercel project auto-reads its own `package.json` name to determine the workspace. Turbo traces the dep graph and cancels the build if nothing downstream of this project changed.
**Warning signs:** Vercel preview builds on every push; minutes budget exhausted fast.

## Code Examples

### Dockerfile for Turborepo + pnpm + api

```dockerfile
# apps/api/Dockerfile
# Build context: repo root (fly deploy handles this automatically from fly.toml)

# syntax=docker/dockerfile:1.7

# ---- base ----
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ---- prune ----
FROM base AS prune
COPY . .
# Install turbo globally for pruning only (avoids pulling repo devDeps)
RUN pnpm dlx turbo@2.9.1 prune api --docker

# ---- installer (only package.jsons + lockfile) ----
FROM base AS installer
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# ---- builder ----
FROM base AS builder
COPY --from=installer /app .
COPY --from=prune /app/out/full/ .
# Generate Prisma client first (db package) then build api
RUN pnpm --filter @cleanly/db exec prisma generate
RUN pnpm turbo run build --filter=@cleanly/api

# ---- runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Fly uses PORT 8080 by convention
ENV PORT=8080
ENV HOST=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nodeapp

# Copy pruned, installed, built tree
COPY --from=builder --chown=nodeapp:nodejs /app .

USER nodeapp
EXPOSE 8080

# The command is overridden per process group by fly.toml [processes].
# Default command here runs the api (so the image also works outside Fly).
CMD ["node", "apps/api/dist/server.js"]
```

```
# .dockerignore at repo root
node_modules
**/node_modules
.next
**/.next
dist
**/dist
.turbo
**/.turbo
.env
**/.env
**/.env.local
.git
.github
.planning
.claude
.vercel
**/out.log
*.log
coverage
**/coverage
```

**Sources:** [Turborepo Docker guide](https://turborepo.dev/docs/guides/tools/docker), [Turborepo prune reference](https://turborepo.dev/docs/reference/prune)

### fly.toml (single file for both environments)

```toml
# fly.toml — deploy with:
#   fly deploy --app cleanly-api-staging --config fly.toml
#   fly deploy --app cleanly-api            --config fly.toml
# The `app` key below is a default for `fly deploy` without --app.
app = "cleanly-api-staging"
primary_region = "bom"   # Mumbai — closest Fly region to Gulf
kill_signal = "SIGINT"
kill_timeout = 30

[build]
  dockerfile = "apps/api/Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"
  HOST = "0.0.0.0"
  LOG_LEVEL = "info"

# --- Process groups ---
# `api`   — HTTP server (receives Fly Proxy traffic on 8080)
# `worker`— BullMQ worker. NO services block -> Fly Proxy cannot see it ->
#           auto_stop_machines cannot apply -> always running (satisfies FLY-03).
[processes]
  api    = "node apps/api/dist/server.js"
  worker = "node apps/api/dist/workers/index.js"

# --- HTTP service (API only) ---
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1   # FLY-04 — API always available
  processes = ["api"]          # FLY-02 — only api gets HTTP traffic

  [http_service.concurrency]
    type = "requests"
    soft_limit = 200
    hard_limit = 250

# --- Health check (FLY-05) ---
  [[http_service.checks]]
    interval   = "15s"
    timeout    = "5s"
    grace_period = "20s"
    method = "GET"
    path = "/healthz"

# --- VM sizing ---
[[vm]]
  processes = ["api"]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1

[[vm]]
  processes = ["worker"]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

**Notes:**
- No `[[services]]` for worker — this is intentional. Comment above is load-bearing.
- `workers/index.ts` must be a new entry file that imports and starts both `order.worker.ts` and `notification.worker.ts`. The repo has those worker files but no unified entry — the planner must add one.
- `force_https = true` redirects HTTP to HTTPS at the Fly proxy level.
- `[http_service]` handles WebSocket upgrades natively — nothing extra needed for Socket.io (FLY-06).
- `[[http_service.checks]]` wires the Fly-side health check to `/healthz`. Fly will mark the machine unhealthy and route traffic elsewhere if it returns non-200.

**Sources:** [Fly.io app configuration reference](https://fly.io/docs/reference/configuration/), [Fly.io autostop/autostart](https://fly.io/docs/launch/autostop-autostart/), [Fly.io multiple processes](https://fly.io/docs/launch/processes/)

### Fastify `/healthz` pattern

```typescript
// apps/api/src/routes/health.ts
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { redis } from '../lib/redis.js'

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Liveness — lightweight, no deps. Use this for Fly's own [[http_service.checks]].
  fastify.get('/healthz', async (_req, reply) => {
    const [dbResult, redisResult] = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      redis.ping(),
    ])

    const db    = dbResult.status    === 'fulfilled' ? 'ok' : 'error'
    const cache = redisResult.status === 'fulfilled' ? 'ok' : 'error'
    const ok    = db === 'ok' && cache === 'ok'

    const body = {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        db:    { status: db,    error: dbResult.status    === 'rejected' ? String(dbResult.reason).slice(0, 200)    : undefined },
        redis: { status: cache, error: redisResult.status === 'rejected' ? String(redisResult.reason).slice(0, 200) : undefined },
      },
    }

    reply.code(ok ? 200 : 503).send(body)
  })

  // Readiness — same as healthz at launch scale. Split later if needed.
  fastify.get('/readyz', async (_req, reply) => {
    reply.code(200).send({ status: 'ok' })
  })
}
```

Register in `server.ts`:

```typescript
// Replace the existing stub `/health` route
await server.register(healthRoutes)
```

**Why `Promise.allSettled` not `Promise.all`:** With `Promise.all`, a single rejected promise short-circuits and we lose the status of the other component. `allSettled` runs both checks and reports both.

**Why 503 not 500:** 503 "Service Unavailable" is the standard for "app is up but dependency is down". Fly Proxy + uptime monitors know to treat 503 as unhealthy.

**Sources:** Standard Fastify pattern (see [fastify-healthcheck](https://www.npmjs.com/package/fastify-healthcheck) for an alternative library approach). Pattern adapted for this codebase's existing `prisma` / `redis` singletons.

### Rate limiting with Upstash (already wired — verify in Phase 9)

```typescript
// apps/api/src/plugins/rate-limit.ts — CURRENT state is minimal.
// Recommend these additions for production readiness:
import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { redis } from '../lib/redis.js'

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    global: false,
    redis,
    // Namespace per-environment so staging/prod don't collide in a shared Upstash.
    nameSpace: `cleanly-${process.env.NODE_ENV ?? 'dev'}-rl-`,
    // If Redis is down, fail open (don't 503 the whole API). Prefer this
    // to a hard dep, because Redis outages shouldn't take OTP down.
    skipOnError: false,  // <- but WAIT, see note below
    keyGenerator: (req) =>
      (req.headers['x-forwarded-for'] as string) ?? req.ip,
  })
})
```

**Conflict:** `skipOnError` tradeoff:
- `false` (strict): Redis outage → all rate-limited routes return 500. OTP endpoints are hardened but unavailable.
- `true` (permissive): Redis outage → rate limits stop working; abuse becomes possible.

For OTP, the safer choice is `false` because uncontrolled OTP hits Twilio and costs real money + triggers Twilio fraud blocks. A brief outage is better than a SMS bombing attack. **Recommendation: `skipOnError: false` for OTP routes, enforce globally.**

**Sources:** [fastify-rate-limit README](https://github.com/fastify/fastify-rate-limit/blob/main/README.md) — nameSpace, skipOnError options; ioredis config values from [plugin example file](https://github.com/fastify/fastify-rate-limit/blob/main/example).

### CORS production config (already partially wired)

```typescript
// apps/api/src/plugins/cors.ts — current code already uses env vars.
// No change needed for the HTTP CORS plugin itself (VCL-05 is satisfied
// when production secrets set the three _WEB_URL vars to Vercel URLs).
//
// BUT: verify Socket.io CORS in lib/socket.ts ALSO uses these env vars.
// Current code reads:
//   process.env.CUSTOMER_WEB_URL, COMPANY_WEB_URL, CUSTOMER_MOBILE_URL, WASHER_MOBILE_URL
// This is correct. Just set them in Fly secrets.
```

Fly secrets commands for VCL-05:
```bash
fly secrets set --app cleanly-api-staging \
  CUSTOMER_WEB_URL=https://cleanly-customer-staging.vercel.app \
  COMPANY_WEB_URL=https://cleanly-company-staging.vercel.app \
  ADMIN_WEB_URL=https://cleanly-admin-staging.vercel.app

fly secrets set --app cleanly-api \
  CUSTOMER_WEB_URL=https://cleanly-customer.vercel.app \
  COMPANY_WEB_URL=https://cleanly-company.vercel.app \
  ADMIN_WEB_URL=https://cleanly-admin.vercel.app
```

**Sources:** [@fastify/cors README](https://github.com/fastify/fastify-cors)

### Cloudflare R2 CORS policy (VCL-06)

```json
[
  {
    "AllowedOrigins": [
      "https://cleanly-customer-staging.vercel.app",
      "https://cleanly-customer.vercel.app",
      "https://cleanly-company-staging.vercel.app",
      "https://cleanly-company.vercel.app",
      "http://localhost:3001",
      "http://localhost:3002"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Critical: `AllowedHeaders: ["content-type"]` — NOT `["*"]`.** The wildcard breaks preflight for presigned PUT uploads in some browsers (Safari + certain mobile WebViews). This is the one reason VCL-06 exists as a standalone requirement.

Set via Cloudflare dashboard: R2 → bucket → Settings → CORS Policy, paste JSON, save. Or via wrangler:
```bash
wrangler r2 bucket cors put cleanly-photos --file r2-cors.json
```

**Sources:** [Cloudflare R2 CORS docs](https://developers.cloudflare.com/r2/buckets/cors/) — "Cross-origin requests that include custom headers should specify these headers as AllowedHeaders".

### turbo.json env declarations

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": [
    "NODE_ENV",
    "VERCEL_ENV",
    "VERCEL_URL"
  ],
  "globalPassThroughEnv": [
    "PATH",
    "HOME",
    "NODE_OPTIONS"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "dist/**",
        ".expo/**",
        "node_modules/.cache/expo-env-info/**"
      ],
      "env": [
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_SENTRY_DSN",
        "NEXTAUTH_SECRET",
        "NEXTAUTH_URL",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "ADMIN_EXCHANGE_SECRET",
        "VITE_API_URL",
        "VITE_SENTRY_DSN"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Why:**
- `globalEnv: NODE_ENV` ensures staging and production have different cache keys — this is the primary cache poisoning prevention.
- `globalEnv: VERCEL_ENV` differentiates Vercel preview vs production.
- `build.env: NEXT_PUBLIC_*` and `VITE_*` — Turbo 2.x framework inference SHOULD auto-include these, but explicit declaration is the documented insurance.
- `!.next/cache/**` excludes Next.js's internal cache from Turbo's output tracking.

**Source:** [Turborepo 2.x configuration reference](https://turborepo.dev/docs/reference/configuration) — confirmed `tasks` (not `pipeline`) is the 2.x key; framework inference covers `NEXT_PUBLIC_*` / `VITE_*` but explicit is recommended.

### Vercel project settings (per app)

All three web apps use the SAME pattern, just differ in Root Directory and filter. Vercel auto-detects Turborepo from `turbo.json` at repo root.

**customer-web (Next.js):**

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/customer-web` |
| Build Command | `cd ../.. && pnpm turbo run build --filter=@cleanly/customer-web` (only if auto-detection fails) |
| Output Directory | `.next` (default) |
| Install Command | (auto) |
| Ignored Build Step | `npx turbo-ignore @cleanly/customer-web --fallback=HEAD^1` |

**admin-web (Next.js):** Same as above, substitute `admin-web` / `@cleanly/admin-web`.

**company-web (Vite SPA):**

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Root Directory | `apps/company-web` |
| Build Command | `cd ../.. && pnpm turbo run build --filter=@cleanly/company-web` |
| Output Directory | `dist` |
| Install Command | (auto) |
| Ignored Build Step | `npx turbo-ignore @cleanly/company-web --fallback=HEAD^1` |

**Environment variables per project (set in Vercel dashboard):**
- `customer-web`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`
- `admin-web`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EXCHANGE_SECRET`
- `company-web`: `VITE_API_URL`, `VITE_SENTRY_DSN`

Each variable is scoped to Preview (staging) vs Production with different values. Vercel supports this in the env var UI.

**Note on `turbo-ignore`:** Vercel docs say the default Turborepo integration has made `turbo-ignore` unnecessary for most cases, but the requirement VCL-01..03 explicitly calls for it. Plan uses explicit `turbo-ignore` as documented. `--fallback=HEAD^1` handles the case where Vercel has no prior deploy SHA to compare against (e.g., first build on a branch).

**Sources:** [Deploying Turborepo to Vercel](https://vercel.com/docs/monorepos/turborepo), [turbo-ignore on npm](https://www.npmjs.com/package/turbo-ignore)

### Secrets management with `fly secrets import`

```bash
# 1) Create .env.staging and .env.production LOCALLY (never commit).
#    Format is KEY=VALUE pairs, one per line, same as .env files.

# .env.staging (example — truncated)
DATABASE_URL=postgresql://user:pass@ep-xxx-staging-pooler.bom.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxx-staging.bom.aws.neon.tech/neondb?sslmode=require
UPSTASH_REDIS_URL=rediss://default:token@staging-xxx.upstash.io:6379
JWT_SECRET=<32+ bytes hex>
JWT_REFRESH_SECRET=<32+ bytes hex>
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
STRIPE_SECRET_KEY=sk_test_...   # <-- test mode in staging
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
DIALOG360_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=cleanly-photos-staging
R2_PUBLIC_URL=https://pub-xxx.r2.dev
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
ADMIN_EXCHANGE_SECRET=<16+ chars>
CUSTOMER_WEB_URL=https://cleanly-customer-staging.vercel.app
COMPANY_WEB_URL=https://cleanly-company-staging.vercel.app
ADMIN_WEB_URL=https://cleanly-admin-staging.vercel.app

# 2) Bulk import to Fly.
fly secrets import --app cleanly-api-staging < .env.staging
fly secrets import --app cleanly-api          < .env.production

# 3) Verify.
fly secrets list --app cleanly-api-staging
```

**Must differ between staging and production:**
- `DATABASE_URL` / `DIRECT_URL` (different Neon branches)
- `UPSTASH_REDIS_URL` (different Upstash instances — or SAME Upstash with different `nameSpace` in rate limit + different BullMQ queue prefix)
- `STRIPE_SECRET_KEY` (`sk_test_*` vs `sk_live_*`)
- `STRIPE_WEBHOOK_SECRET` (different webhook endpoints register separate secrets)
- `SENTRY_DSN` (two Sentry projects)
- `CUSTOMER_WEB_URL` / `COMPANY_WEB_URL` / `ADMIN_WEB_URL` (staging vs prod Vercel URLs)
- `R2_BUCKET_NAME` (separate buckets recommended to prevent staging-photo leaking into prod)

**Can be the same (or different, your call):**
- `TWILIO_*` (if you use the same Twilio account)
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — **should differ** so a staging token can never authenticate against production
- `ADMIN_EXCHANGE_SECRET` — **should differ** for the same reason
- `RESEND_API_KEY`, `DIALOG360_API_KEY` — typically same account, different sender or template

**Sources:** [fly secrets set](https://fly.io/docs/flyctl/secrets-set/), [fly secrets import](https://fly.io/docs/flyctl/secrets-import/), [Fly secrets management](https://fly.io/docs/apps/secrets/)

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|------------------------|--------------|--------|
| `[[services]]` for HTTP | `[http_service]` simplified alias | 2023 | Fewer lines of config for the common case; still supports WebSocket upgrades natively |
| `turbo-ignore` explicit | Vercel built-in skip-unaffected | 2025 | Simpler config; turbo-ignore still works and is more explicit |
| Manual `NEXT_PUBLIC_*` in turbo.json `env` | Turbo 2.x framework inference auto-includes | 2024 (turbo 1.10+) | Less config, but explicit declaration still the documented safety |
| Prisma without Neon adapter | `@prisma/adapter-neon` standard | 2024 | Connection pooling works correctly; direct Prisma exhausts Neon connection limits |
| Single `fly.toml` | One `fly.toml` + `--app` flag per environment | — (still best practice) | Minimal drift between environments |
| Prisma 6 + separate query engine | Prisma 7 (query engine in JS) — **coming** | Late 2025 early 2026 | `@prisma/adapter-neon@7` already installed — mixed install is legit but worth noting |
| `pipeline` key in turbo.json | `tasks` key | Turbo 2.0 (2024) | Current repo already uses `tasks` — no migration needed |

**Deprecated/outdated in CLAUDE.md:**
- Fly.io region `bah` — Bahrain region does not exist on Fly.io. STATE.md correctly overrides to `bom` (Mumbai). **Do not trust CLAUDE.md's `bah` reference.**
- Socket.io "no Redis adapter needed until horizontal scaling" — repo already installed and wired the Redis adapter. Not a Phase 9 concern, but note the divergence.
- Next.js 16.2 — repo is on Next.js 15.2.4. This is FINE for this phase (deployment is framework-agnostic), but Phase 10+ may want to consider upgrading.

## Open Questions

1. **Should staging and production share one Upstash Redis instance?**
   - What we know: Upstash Fixed Plan is $10/mo per instance. Two instances = $20/mo.
   - What's unclear: Blast radius of sharing — a staging load test could flush BullMQ queue keys and affect prod if key namespaces collide.
   - Recommendation: **Two instances.** Phase 8 ACCT-04 says "Upstash Redis Fixed Plan provisioned" (singular). Planner should either provision a second instance or namespace everything (BullMQ prefix, rate-limit nameSpace, Socket.io adapter channel) — the first option is safer. Cost is $10/mo more.

2. **Should staging and production share one R2 bucket or have separate buckets?**
   - What we know: Shared bucket = shared CORS policy = shared presigned URL scheme. Separate buckets = two CORS policies + two sets of keys.
   - What's unclear: Whether R2 free tier (10GB) is sufficient for both environments.
   - Recommendation: **Separate buckets** — `cleanly-photos-staging` and `cleanly-photos`. Photos from a staging test order should never bleed into prod.

3. **Where does the worker's entry point live?**
   - What we know: `apps/api/src/workers/order.worker.ts` and `notification.worker.ts` exist. Neither is wired to an entry command.
   - What's unclear: Is there already a unified worker entry, or does the planner need to create one?
   - Recommendation: Planner creates `apps/api/src/workers/index.ts` that imports and starts both workers. The build step compiles to `apps/api/dist/workers/index.js`, which is what `fly.toml [processes] worker` references.

4. **Should the existing `/health` route be replaced or augmented?**
   - What we know: `server.ts` has an inline `/health` returning `{status: 'ok'}`. This exists as a stub.
   - Recommendation: Replace with a new `routes/health.ts` plugin that registers both `/healthz` (full check) and keeps `/health` as an alias for backward compatibility. Wire Fly's `[[http_service.checks]]` to `/healthz`.

5. **How should `auto_start_machines` behave for the API?**
   - What we know: `auto_start_machines = true` means the proxy wakes the machine on incoming request. Combined with `min_machines_running = 1`, this means "always at least one warm + spin up more on demand".
   - What's unclear: Whether `min_machines_running = 1` is enough for the Socket.io redis adapter (sticky sessions).
   - Recommendation: At launch scale (solo dev, hundreds of concurrent connections max), `min_machines_running = 1` is fine. The Redis adapter is already wired to allow scale-out later. Document this as a future decision.

## Sources

### Primary (HIGH confidence)

- [Fly.io app configuration (fly.toml) reference](https://fly.io/docs/reference/configuration/) — process groups syntax, `[http_service]` vs `[[services]]`
- [Fly.io autostop/autostart docs](https://fly.io/docs/launch/autostop-autostart/) — `auto_stop_machines`, `min_machines_running`, per-service placement
- [Fly.io multiple processes](https://fly.io/docs/launch/processes/) — `[processes]` table syntax
- [Fly.io staging/prod isolation blueprint](https://fly.io/docs/blueprints/staging-prod-isolation/) — recommended isolation pattern
- [Fly.io secrets docs](https://fly.io/docs/apps/secrets/) + [fly secrets import](https://fly.io/docs/flyctl/secrets-import/) — bulk secret import
- [Turborepo Docker deployment guide](https://turborepo.dev/docs/guides/tools/docker) — multi-stage Dockerfile pattern
- [Turborepo prune reference](https://turborepo.dev/docs/reference/prune) — `--docker` flag, output structure
- [Turborepo 2.x configuration reference](https://turborepo.dev/docs/reference/configuration) — `globalEnv`, `env`, `tasks` vs `pipeline`
- [Vercel Turborepo deployment docs](https://vercel.com/docs/monorepos/turborepo) — Root Directory, Build Command, Ignored Build Step, framework inference
- [turbo-ignore npm package](https://www.npmjs.com/package/turbo-ignore) — usage, `--fallback` flag
- [@fastify/rate-limit README](https://github.com/fastify/fastify-rate-limit) — `redis`, `nameSpace`, `skipOnError`, ioredis config example
- [@fastify/cors README](https://github.com/fastify/fastify-cors) — origin array, dynamic function, security warning
- [Cloudflare R2 CORS docs](https://developers.cloudflare.com/r2/buckets/cors/) — JSON format, AllowedHeaders rule
- Codebase inspection: `apps/api/package.json`, `apps/api/src/server.ts`, `apps/api/src/plugins/{cors,rate-limit}.ts`, `apps/api/src/lib/{env,redis,socket}.ts`, `turbo.json`, `pnpm-workspace.yaml`, `.env.example` files

### Secondary (MEDIUM confidence)

- [Fly.io WebSockets blog post](https://fly.io/blog/websockets-and-fly/) — confirms Fly proxy handles WS upgrades; example uses `[[services]]` but `[http_service]` is an equivalent simpler alternative
- [Multi-env deployment on Fly.io](https://orchardlab.dev/posts/fly-envs/) — community example of two apps + one config file pattern
- [fintlabs Medium — Turborepo + pnpm Dockerfile](https://fintlabs.medium.com/optimized-multi-stage-docker-builds-with-turborepo-and-pnpm-for-nodejs-microservices-in-a-monorepo-c686fdcf051f) — multi-stage pattern cross-check
- [Atomic Object — Prune monorepo Docker builds](https://spin.atomicobject.com/prune-monorepo-docker/) — pruning rationale

### Tertiary (LOW confidence — flagged for validation)

- Exact `skipOnError: false` behavior of `@fastify/rate-limit` during Redis reconnect storms — needs manual test against real Upstash in staging
- Whether Vercel's built-in "skip unaffected projects" fully replaces `turbo-ignore` for this specific repo shape — VCL-01..03 explicitly names `turbo-ignore` so we use it
- `@socket.io/redis-adapter` behavior with Upstash's pub/sub — repo uses it but it's not extensively tested with Upstash specifically; works in dev

## Metadata

**Confidence breakdown:**
- Dockerfile pattern: HIGH — matches Turborepo official docs; pnpm version aligned with repo `packageManager`
- fly.toml structure: HIGH — syntax cross-verified across three Fly.io doc pages
- Worker `auto_stop_machines = off` clarification: HIGH — confirmed by Fly.io multiple-processes docs ("standby Machine for processes that don't have services configured... aren't visible to Fly Proxy")
- Health check pattern: HIGH — idiomatic Fastify + Prisma + ioredis
- Rate limiting with Upstash: HIGH — already wired and working in repo; just adds `nameSpace`
- Vercel settings: HIGH for Next.js apps (documented), MEDIUM for Vite SPA (less documented but framework preset exists)
- turbo.json env declarations: HIGH — schema verified against Turborepo 2.x docs
- CORS allowlist: HIGH — existing code already correct, just needs production values
- R2 CORS explicit `content-type`: MEDIUM — Cloudflare docs recommend explicit headers but don't explicitly document `*` failure mode. Community reports and other S3-compatible tools confirm the issue. Safer to be explicit.
- Secrets management: HIGH — `fly secrets import` is documented Fly CLI feature
- Open questions: documented as open, not claimed as resolved

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (30 days) — stable infrastructure tools. Re-verify Fly.io fly.toml schema if >30 days; Fly.io has made minor schema changes historically.

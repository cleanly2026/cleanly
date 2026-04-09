# Pitfalls Research

**Domain:** On-demand cleaning services marketplace (Gulf region, bilingual AR/EN, 5 app surfaces) — Deployment to Production
**Researched:** 2026-04-09
**Confidence:** HIGH (multiple authoritative sources, deployment-specific verification)

---

## Critical Pitfalls

### Pitfall 1: Fly.io Autostop Kills BullMQ Worker Mid-Job

**Severity:** BLOCKER

**What goes wrong:**
Fly.io's `auto_stop_machines` feature stops idle Machines when no HTTP requests are incoming. BullMQ workers do not serve HTTP traffic — they poll Redis. If autostop is enabled on the worker process (or left at the default), Fly shuts down the worker between job bursts. Any job being processed at shutdown is abandoned (not gracefully completed), becomes stalled after 30 seconds, and retries — sending duplicate SMS, WhatsApp, or Stripe transfers.

**Why it happens:**
The default `fly.toml` for a new Fly app enables autostop. Developers configure the API machine correctly but copy the same fly.toml for the worker machine without disabling autostop. The worker sleeps silently — no errors, jobs just pile up in the queue unprocessed.

**How to avoid:**
- Worker fly.toml must have `auto_stop_machines = "off"` (or `min_machines_running = 1`).
- The API machine can use autostop; the worker machine must not.
- Separate the API and worker into distinct Fly apps (or at minimum distinct process groups in the same app) with different `[http_service]` and `[[services]]` configurations.
- In the worker fly.toml, set no `[http_service]` at all — the worker is not web-facing.
- Implement a `SIGTERM` handler: `process.on('SIGTERM', async () => { await worker.close(); process.exit(0); })`. This lets in-flight jobs complete before shutdown.

**Warning signs:**
- Worker Fly machine showing "stopped" state in `fly status` while queue has pending jobs.
- Jobs sitting in BullMQ "waiting" state for minutes with no "active" state transitions.
- Worker machine fly.toml identical to API machine fly.toml.

**Phase to address:**
Infrastructure setup phase — worker deployment config must be defined before any background job is deployed.

---

### Pitfall 2: Fly.io Machine Auto-Stops Drops All Socket.io Connections

**Severity:** BLOCKER

**What goes wrong:**
If the Fly API machine autostops (scale-to-zero) during low-traffic periods, all active Socket.io connections are immediately killed. When the machine restarts (wake-on-request), it takes 2-5 seconds for a cold start. During that window, the mobile app's WebSocket connection fails. Socket.io will reconnect automatically, but GPS tracking data is lost for the reconnection window. More critically: if the washer's GPS connection drops and reconnects to a new machine instance, their location updates go to a different room reference and the customer stops receiving updates.

**Why it happens:**
Fly.io's default free-tier behavior scales to zero. Developers test locally (always-on) and don't encounter the sleep/wake cycle.

**How to avoid:**
- Set `min_machines_running = 1` in the API machine's `[http_service]` section. This costs roughly $3-7/month on the cheapest Fly machine — worth the reliability.
- Alternatively use `auto_stop_machines = "suspend"` (not `"stop"`) — suspend preserves memory state and resumes in ~hundreds of milliseconds vs. full cold start.
- Configure Socket.io with reconnection options on the client: `reconnectionDelay: 1000`, `reconnectionAttempts: 5`. This handles the rare cold-start reconnect gracefully.
- Add a `/health` endpoint that the Fly health check pings every 30 seconds — this HTTP traffic keeps the machine "active" and prevents autostop.

**Warning signs:**
- Fly app `min_machines_running` not set (defaults to 0 = scale-to-zero eligible).
- `fly status` showing machine in "stopped" state during off-peak hours.
- Socket.io client logs showing reconnection events in production.

**Phase to address:**
Fly.io configuration phase — set `min_machines_running = 1` before deploying any Socket.io-dependent code.

---

### Pitfall 3: Socket.io WebSocket Upgrade Fails Behind Fly.io Proxy

**Severity:** BLOCKER

**What goes wrong:**
Fly.io uses an HTTP/1.1 proxy. If the Socket.io server is not explicitly configured to accept WebSocket upgrades, connections fall back to HTTP long-polling. Long-polling works but causes significantly higher latency for GPS tracking (300-600ms vs. sub-50ms WebSocket), consumes more CPU, and can cause Fly proxy timeouts on long-held connections.

A related failure: if `transports: ['websocket']` is forced on the client without corresponding server config, connections fail completely rather than degrading gracefully.

**Why it happens:**
Socket.io defaults to HTTP long-polling first, then upgrades to WebSocket. The upgrade requires the proxy to pass `Upgrade: websocket` headers through. Fly's proxy does support this, but `fly.toml` must not have configurations that strip or reject upgrade headers.

**How to avoid:**
- In `fly.toml`, ensure the service uses TCP (not HTTP) for the Socket.io port, OR configure `[[services.ports]]` with `handlers = ["http"]` and verify that WebSocket upgrades pass through (they do by default on Fly's standard HTTP handler).
- On the Socket.io server, explicitly configure `cors` and `transports`:
  ```typescript
  const io = new Server(server, {
    cors: { origin: ALLOWED_ORIGINS, credentials: true },
    transports: ['polling', 'websocket'], // allow upgrade path
  });
  ```
- Test WebSocket connectivity from production domain specifically — not just localhost. Use `wscat` or browser DevTools Network tab to verify the protocol upgrade.
- Do not set `transports: ['websocket']` on the client without confirming the upgrade path works.

**Warning signs:**
- Socket.io connections in production showing `transport: polling` in server logs rather than `transport: websocket`.
- GPS update latency above 200ms in production (indicates polling fallback).
- WebSocket handshake 400/426 errors in network inspector.

**Phase to address:**
Fly.io API deployment phase — verify WebSocket upgrade works before any real-time feature is tested in staging.

---

### Pitfall 4: Fly.io Health Check Causes Deployment Loops

**Severity:** MAJOR

**What goes wrong:**
Fly.io performs health checks before routing traffic to a new deployment. If the health check path returns a non-200 response (redirect, 401, slow DB query), the deployment is considered failed and Fly rolls back. Common failures: the `/health` endpoint does a Prisma database ping on startup before Neon connection is established (returns 500), or the health check fires before BullMQ Redis connection is ready (throws on first request).

A specific trap for this stack: Fastify's default behavior returns a 404 for undefined routes. If the `fly.toml` health check path is set to `/` and the API doesn't handle `/`, all deploys fail.

**Why it happens:**
Developers set a generic health check path without implementing the endpoint, or implement it with side effects (DB ping) that are slow on cold start. The `grace_period` is not set, so the first health check fires while the process is still initializing.

**How to avoid:**
- Implement a dedicated `/health` endpoint in Fastify that returns `{ status: 'ok' }` without DB or Redis checks. Make it instantaneous.
- In `fly.toml`, set `grace_period = "10s"` to give Fastify time to initialize before the first check:
  ```toml
  [[services.http_checks]]
    interval = "10s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health"
  ```
- Keep the health check lightweight — no DB queries. Use a separate `/ready` endpoint for deeper checks during manual diagnosis.
- Test `fly deploy` at least once in staging before setting up CI/CD to verify the health check cycle works.

**Warning signs:**
- Deploys consistently failing and rolling back with no application errors in logs.
- Health check logs showing 404 or 500 responses.
- Deployment hanging at "Waiting for health checks" then timing out.

**Phase to address:**
Fly.io initial deployment phase — health check must be implemented before CI/CD is configured.

---

### Pitfall 5: Vercel Monorepo Root Directory vs. App Directory Config Conflict

**Severity:** BLOCKER

**What goes wrong:**
When configuring a Turborepo monorepo app on Vercel, you must set the "Root Directory" to the specific app (e.g., `apps/customer-web`). If Root Directory is set to the monorepo root (`/`), Vercel builds all apps on every deploy, exceeding build time limits and causing cross-contamination of environment variables. If Root Directory is set to the app but the build command uses `turbo run build`, Vercel cannot find `turbo` without navigating to the monorepo root first.

The `buildCommand` field in Vercel UI is interpreted relative to Root Directory. Running `turbo run build --filter=customer-web` from `apps/customer-web` fails because `turbo` is installed at the monorepo root.

**Why it happens:**
The Turborepo deployment docs suggest using Root Directory per app, but the build command examples assume monorepo-root context. Developers copy the Vercel quickstart without adjusting for their repo structure.

**How to avoid:**
- Set Root Directory to the specific app: `apps/customer-web`.
- Set Build Command to: `cd ../.. && pnpm turbo run build --filter=customer-web`
- Set Install Command to: `cd ../.. && pnpm install --frozen-lockfile`
- Output Directory remains `apps/customer-web/.next` (Next.js) or `apps/customer-web/dist` (Vite).
- Alternatively, use Vercel's monorepo detection (it auto-detects pnpm workspaces + Turborepo) — but verify its inferred commands match the above before trusting them.
- Create separate Vercel projects for `customer-web` and `admin-web` — do not try to serve both from one project.

**Warning signs:**
- Vercel build logs showing `Cannot find module 'turbo'`.
- Build succeeding but deploying wrong app's output.
- `node_modules` not found errors during build despite `pnpm install` completing.

**Phase to address:**
Vercel deployment setup phase — test build command in CI before connecting to production.

---

### Pitfall 6: Turborepo Cache Serves Staging Build to Production

**Severity:** BLOCKER

**What goes wrong:**
Turborepo caches build outputs keyed by inputs including source code and environment variable values. If `NEXT_PUBLIC_API_URL` (staging endpoint) is not declared in `turbo.json`'s `env` array for the build task, Turborepo may restore a cached build from staging to production — the build "succeeds" but all API calls go to the staging server. This is silent: no build errors, app appears to work, but real users hit staging data.

**Why it happens:**
Turborepo's cache is opt-in for environment variables. Developers add env vars to `.env` files but forget to add them to `turbo.json`. When CI runs the production build after the staging build, it sees a cache hit (same code, same hash) and skips rebuilding.

**How to avoid:**
- In `turbo.json`, explicitly list all environment variables that affect build output:
  ```json
  {
    "tasks": {
      "build": {
        "env": [
          "NEXT_PUBLIC_API_URL",
          "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
          "NEXT_PUBLIC_SOCKET_URL",
          "NODE_ENV"
        ],
        "outputs": [".next/**", "dist/**"]
      }
    }
  }
  ```
- Add `globalEnv` for variables that affect all tasks.
- In GitHub Actions, use `TURBO_TOKEN` and `TURBO_TEAM` to scope remote cache per environment — staging and production should use different cache namespaces, or disable remote cache for production builds.
- After first production deploy, verify API calls in browser network tab are hitting the production URL.

**Warning signs:**
- Production build completes suspiciously fast (100% cache hit) after staging build.
- Browser network requests in production going to staging API URL.
- Turborepo logs showing "cache hit" when environment variables have changed.

**Phase to address:**
CI/CD setup phase — `turbo.json` env configuration must be set before any multi-environment deploy.

---

### Pitfall 7: NEXT_PUBLIC_ Variables Baked at Build Time, Not Runtime

**Severity:** MAJOR

**What goes wrong:**
`NEXT_PUBLIC_*` variables in Next.js are inlined into the JavaScript bundle at build time by Vercel. If you add or change a `NEXT_PUBLIC_*` variable in Vercel's environment variables UI without triggering a new build, the running app uses the old value. This is a common source of "it's configured but not working" bugs.

A related edge runtime trap: in Next.js 16.x middleware (`middleware.ts`), only `NEXT_PUBLIC_*` variables are available — non-public env vars set in `.env` or Vercel UI are not accessible in edge runtime. Server Actions and Route Handlers DO have access to non-public vars.

**Why it happens:**
Developers expect environment variables to be dynamic (like they are on a traditional server). Next.js's build-time variable inlining is non-obvious and documentation on the edge runtime restriction is scattered.

**How to avoid:**
- After updating any `NEXT_PUBLIC_*` variable in Vercel dashboard, always trigger a redeploy.
- Use non-public env vars for everything that doesn't need to reach the client — only prefix with `NEXT_PUBLIC_` when the client JavaScript actually needs the value.
- Never put secrets in `NEXT_PUBLIC_*` variables. They will appear in the JS bundle.
- For middleware, only use `NEXT_PUBLIC_*` variables or hardcode values — document this constraint.
- Add startup validation in `app/layout.tsx` for critical public env vars:
  ```typescript
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not set');
  }
  ```

**Warning signs:**
- API calls in browser pointing to `undefined` as the URL (indicates env var missing at build time).
- Middleware throwing `undefined` reference errors for process.env values.
- Changing env vars in Vercel dashboard with no redeploy and expecting behavior to change.

**Phase to address:**
Vercel deployment setup phase — env var audit before first production build.

---

### Pitfall 8: Neon Two Connection Strings — Wrong One for Migrations vs. Runtime

**Severity:** MAJOR

**What goes wrong:**
Neon provides two URLs: a direct connection URL and a pooled connection URL (with `-pooler` in the hostname). Prisma migrate requires the direct URL for schema migrations. The application must use the pooled URL at runtime to avoid connection exhaustion. Using the pooled URL for migrations causes `ERROR: prepared statement 's0' already exists`. Using the direct URL for runtime causes pool exhaustion under load.

Historically this required maintaining two env vars (`DATABASE_URL` and `DIRECT_URL`). As of Neon's PgBouncer 1.22.0+ improvements, prepared statement issues are mostly resolved for the pooled URL — but not all Prisma migrate operations work reliably through the pooler. The safe split is still recommended.

**Why it happens:**
Developers use one `DATABASE_URL` for everything. Local development uses a direct URL and works fine. Production Neon (with PgBouncer) breaks migrations silently or with cryptic prepared statement errors.

**How to avoid:**
- In `schema.prisma`:
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")       // pooled URL for runtime
    directUrl = env("DIRECT_DATABASE_URL") // direct URL for migrations only
  }
  ```
- `DATABASE_URL`: the Neon pooled URL (contains `-pooler` in hostname and `?pgbouncer=true`).
- `DIRECT_DATABASE_URL`: the Neon direct URL (no `-pooler`, no `?pgbouncer=true`).
- In CI/CD, `prisma migrate deploy` uses the `directUrl` automatically via `schema.prisma`.
- Never commit either URL to source code — both must be in environment variables.

**Warning signs:**
- `ERROR: prepared statement 's0' already exists` during `prisma migrate deploy`.
- `P1001: Can't reach database server` errors appearing only under concurrent load.
- Single `DATABASE_URL` used for both application and migration contexts.

**Phase to address:**
Database configuration phase — both URLs must be set before any migration is run in staging.

---

### Pitfall 9: Prisma Migrate Deploy Runs Against Production Database Without Backup

**Severity:** BLOCKER

**What goes wrong:**
`prisma migrate deploy` applies all pending migrations against the target database. If a migration contains a destructive operation (column drop, table rename, constraint change) that was intended for a test environment, it runs against production data. Neon does not auto-backup before migrations.

A subtler failure: a migration that worked in development fails mid-application in production due to existing data violating the new constraint. The migration is left in a "failed" state, and the database is in a partially migrated condition — blocking all future `prisma migrate deploy` runs.

**Why it happens:**
CI/CD pipelines run `prisma migrate deploy` automatically on merge to main. Developers don't think about the production database state when writing migrations locally.

**How to avoid:**
- Create a Neon database branch before running migrations: `neon branches create --name pre-migration-$(date +%Y%m%d)`. This is Neon's killer feature — instant branching with no copy cost.
- In CI/CD, the migration step should be: (1) create Neon branch, (2) run migrate deploy against branch, (3) validate, (4) apply to main branch.
- For destructive migrations, use a two-phase approach: add the new column, migrate data, then drop the old column in a separate migration deployed separately.
- Test every migration against a Neon branch with a copy of production data (use Neon's branch-from-production feature) before merging.
- Add `prisma migrate status` as a CI step to detect drift before `migrate deploy`.

**Warning signs:**
- CI pipeline running `prisma migrate deploy` directly against `DATABASE_URL` pointing to production Neon database.
- No Neon branch creation step before migration in deployment pipeline.
- Migrations containing `DROP COLUMN` or `ALTER TABLE ... DROP CONSTRAINT` without testing on production-data-equivalent branch.

**Phase to address:**
CI/CD setup phase — branch-before-migrate workflow must be established before production database is used.

---

### Pitfall 10: BullMQ + Upstash TLS Configuration Silently Fails

**Severity:** BLOCKER

**What goes wrong:**
Upstash Redis requires TLS. BullMQ uses `ioredis` under the hood. When connecting to a `rediss://` (SSL) URL, ioredis does not automatically enable TLS for all connection options. The `redisOptsFromUrl` helper in older versions of ioredis does not set `tls: {}` even when the URL scheme is `rediss://`. The worker starts without error but fails to connect, leaving all jobs permanently in "waiting" state.

**Why it happens:**
Local development uses a plain Redis without TLS. The Upstash documentation shows TLS configuration but developers often miss the `tls: {}` option when constructing the connection manually.

**How to avoid:**
- Use the explicit TLS config when connecting:
  ```typescript
  const connection = {
    host: process.env.UPSTASH_REDIS_HOST,
    port: 6379,
    password: process.env.UPSTASH_REDIS_PASSWORD,
    tls: {},  // REQUIRED for Upstash
    maxRetriesPerRequest: null,  // REQUIRED for BullMQ workers
    enableReadyCheck: false,     // REQUIRED for BullMQ
  };
  const worker = new Worker('jobs', processor, { connection });
  ```
- Do NOT use `rediss://` URL string with `redisOptsFromUrl` — always construct the options object manually with explicit `tls: {}`.
- Verify the connection works with a test job immediately after deploying the worker — don't wait for organic traffic.
- Set `enableOfflineQueue: false` on Queue instances (fail fast) and `enableOfflineQueue: true` on Worker instances (wait for reconnect).

**Warning signs:**
- Worker deployed but jobs sitting in "waiting" state indefinitely.
- No ioredis errors in worker logs (silent TLS failure).
- `ECONNREFUSED` or `ETIMEDOUT` errors appearing after 30-60 seconds.

**Phase to address:**
BullMQ worker deployment phase — TLS connection must be verified with a test job before workers go live.

---

### Pitfall 11: BullMQ Worker Crash Recovery — Uncaught Redis Errors Bring Down the Process

**Severity:** MAJOR

**What goes wrong:**
ioredis emits uncaught error events when the Redis connection drops. If these are not handled, Node.js throws an `UnhandledPromiseRejectionWarning` (or crashes in Node 15+). The worker process dies, Fly.io restarts it (after a delay), and all jobs that were in-flight are stalled.

**Why it happens:**
BullMQ documentation mentions `maxRetriesPerRequest: null` but does not prominently document the requirement to handle ioredis error events. Developers trust that BullMQ handles connection errors internally — it doesn't fully.

**How to avoid:**
- Add an error handler to the underlying ioredis connection:
  ```typescript
  const redisConnection = new IORedis({ ... });
  redisConnection.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
    // Do NOT crash — ioredis will auto-reconnect
  });
  ```
- Set `maxRetriesPerRequest: null` on the ioredis instance passed to all BullMQ Queue and Worker constructors.
- Configure Fly.io to auto-restart the worker on crash with `restart_policy = "always"` in the process config.
- Monitor `worker.on('error', ...)` and `worker.on('failed', ...)` events and send to Sentry.

**Warning signs:**
- Worker process exiting unexpectedly during high load.
- Sentry showing `UnhandledPromiseRejectionWarning` from ioredis.
- BullMQ jobs in "stalled" state after worker restarts.

**Phase to address:**
BullMQ worker deployment phase — error handling established before production traffic.

---

### Pitfall 12: Stripe Webhook Signature Verification Breaks with Body Parsers

**Severity:** BLOCKER

**What goes wrong:**
Stripe webhook signature verification requires the **raw request body** as a Buffer. If Fastify (or any middleware) parses the body as JSON before the webhook handler reads it, the signature check fails with `No signatures found matching the expected signature for payload`. This causes all webhooks to be rejected with 400, and Stripe will retry them repeatedly, causing duplicate processing concerns.

**Why it happens:**
Fastify adds `@fastify/formbody` or `Content-Type: application/json` body parsing globally. The webhook route is added after the global parser is registered, so the body arrives pre-parsed as an object instead of raw Buffer.

**How to avoid:**
- Register the Stripe webhook route BEFORE registering the global JSON body parser, OR exempt the webhook route from body parsing.
- In Fastify, use `addContentTypeParser` for the webhook route specifically:
  ```typescript
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => done(null, body)
  );

  fastify.post('/webhooks/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      request.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    // process event...
  });
  ```
- Register the raw body parser only on the webhook path, not globally.
- Test webhook locally with `stripe listen --forward-to localhost:3000/webhooks/stripe` before staging.

**Warning signs:**
- Webhook 400 errors with message "No signatures found matching" in Stripe dashboard.
- Stripe retrying the same event multiple times.
- `typeof request.body === 'object'` (not Buffer) inside the webhook handler.

**Phase to address:**
Stripe integration setup phase — webhook signature must be verified in staging before going live.

---

### Pitfall 13: Stripe Webhook Event Ordering — Processing payment_intent.succeeded Before checkout.session.completed

**Severity:** MAJOR

**What goes wrong:**
Stripe does not guarantee webhook event delivery order. `payment_intent.succeeded` can arrive before `checkout.session.completed`. If the order activation logic is triggered by `payment_intent.succeeded`, the order may be activated before the checkout session metadata (which contains `orderId`, `companyId`, etc.) is available. The order activation handler reads empty metadata and creates a corrupted order state.

**Why it happens:**
`payment_intent.succeeded` feels like "payment confirmed" and is intuitive as the trigger. `checkout.session.completed` is the correct event because it fires after the full session (including metadata) is finalized.

**How to avoid:**
- Use `checkout.session.completed` as the canonical event for order activation — it contains the full session metadata.
- Use `payment_intent.succeeded` only for logging/analytics, not for state changes.
- Store `stripePaymentIntentId` on the order when the checkout session is created (before payment) so the `payment_intent.succeeded` event can be correlated, but do not trigger state changes from it.
- Implement idempotency: check if the order is already in the target state before applying transitions. Use `event.id` as the idempotency key stored in a `processed_webhook_events` table.
- Design webhook handlers to be order-independent: use event `created` timestamps and database upserts, not sequential state machines.

**Warning signs:**
- Webhook handler using `payment_intent.succeeded` as the primary order activation trigger.
- Orders occasionally stuck in "payment pending" state despite Stripe showing payment succeeded.
- No `processed_webhook_events` table or idempotency check.

**Phase to address:**
Stripe integration setup phase — webhook handler logic must be designed before any live payment is accepted.

---

### Pitfall 14: Expo EAS Build — Push Notification Credentials Missing in Production Build Profile

**Severity:** BLOCKER

**What goes wrong:**
Expo push notifications require APNs credentials (iOS) and FCM/Firebase credentials (Android) to be configured in EAS. If the production build profile in `eas.json` does not reference the correct credentials, push tokens are generated for the wrong environment (APNs sandbox vs. production), and all push notifications silently fail for iOS users — no error, just no delivery.

A related failure: the APNs p8 authentication key is valid indefinitely but must be regenerated every time it is revoked. If a developer accidentally revokes the key in Apple Developer Portal, all push notifications stop immediately across all production installs.

**Why it happens:**
During development, Expo Go uses a shared APNs certificate in sandbox mode. EAS development builds use sandbox. Production builds need production APNs — and the switch is not automatic. Developers test with development builds, see push notifications working, assume production builds will also work.

**How to avoid:**
- In `eas.json`, explicitly specify credential source for production:
  ```json
  {
    "build": {
      "production": {
        "credentialsSource": "remote",
        "ios": { "buildConfiguration": "Release" }
      }
    }
  }
  ```
- Run `eas credentials` to verify production APNs credentials are configured before the first production build.
- Use p8 authentication token (not p12 certificate) — p8 does not expire, works for all apps in your Apple Developer team, and is simpler to manage in CI/CD.
- Test push notifications on a TestFlight build (production APNs) before submitting to App Store.
- Store push tokens in the database with an `environment` field (`sandbox` vs. `production`) — never send a sandbox token to the production APNs endpoint.

**Warning signs:**
- Push notifications work in development build but not in TestFlight.
- Expo Push API returning `DeviceNotRegistered` errors for iOS tokens from production builds.
- `eas credentials` showing no production APNs credentials configured.

**Phase to address:**
EAS Build setup phase — credentials must be verified before distributing to beta testers.

---

### Pitfall 15: Expo SDK Version Mismatch Between eas.json Build Profile and Runtime

**Severity:** MAJOR

**What goes wrong:**
EAS Build locks the React Native and Expo SDK versions for a build based on `package.json` at build time. If the `eas.json` production build profile specifies a different Node.js version or uses a different build image than local development, native modules may fail to compile or behave differently. Common failure: `expo-camera` or `expo-location` compiling against the wrong NDK version, causing crashes on first GPS or camera use in production.

**Why it happens:**
Local development (Expo Go or local EAS build) uses the developer's machine toolchain. EAS cloud builders use a specific Ubuntu + Xcode + Android NDK image. Version divergence is invisible until the first cloud build.

**How to avoid:**
- Lock the EAS build image explicitly in `eas.json`:
  ```json
  {
    "build": {
      "production": {
        "image": "latest",
        "android": { "buildType": "apk" }
      }
    }
  }
  ```
- Run `eas build --platform all --profile production` for the first build locally (with `--local` flag) before submitting to EAS cloud, to catch toolchain issues.
- After any SDK upgrade, do a test production build before pushing to TestFlight/Google Play.
- Check Expo's SDK changelog for native dependency breakage notes when upgrading.

**Warning signs:**
- EAS build succeeds but app crashes immediately on launch.
- Native module errors in crash reports that don't reproduce locally.
- Build image version not pinned in `eas.json`.

**Phase to address:**
EAS Build initial setup phase — first production build must be verified before TestFlight distribution.

---

### Pitfall 16: Environment Variable Leaking into Client Bundle via NEXT_PUBLIC_ or VITE_

**Severity:** BLOCKER (security)

**What goes wrong:**
Any variable prefixed `NEXT_PUBLIC_` in Next.js or `VITE_` in the Vite company dashboard is inlined into the client-side JavaScript bundle. If a developer accidentally names a secret variable with these prefixes (e.g., `NEXT_PUBLIC_STRIPE_SECRET_KEY`, `VITE_DATABASE_URL`), it is shipped to every browser that loads the page — discoverable by anyone who opens DevTools and reads the JavaScript source.

**Why it happens:**
Developers copy env var names from backend config into frontend config without stripping secrets. The framework silently includes them without warning. CI/CD pipelines that inject all env vars as build args expose backend secrets if the filter is not tight.

**How to avoid:**
- Establish a rule: ONLY the following types of values get `NEXT_PUBLIC_` or `VITE_` prefix:
  - Stripe publishable key (designed to be public)
  - API URL (already known to the client)
  - Socket.io URL
  - Public Cloudflare R2 bucket URL
  - App version/environment label
- NEVER prefix: Stripe secret key, database URLs, JWT secrets, Twilio auth tokens, Resend API keys, admin credentials.
- Add a CI step that scans for `NEXT_PUBLIC_STRIPE_SECRET`, `VITE_DATABASE_URL`, `NEXT_PUBLIC_JWT_SECRET` patterns and fails the build.
- Audit `apps/customer-web/.env.example` and `apps/company-web/.env.example` — every `NEXT_PUBLIC_` and `VITE_` variable should be safe to make fully public.

**Warning signs:**
- `NEXT_PUBLIC_STRIPE_SECRET_KEY` or similar in `.env` files.
- CI/CD injecting all env vars from a flat secrets store without filtering.
- Stripe Dashboard showing unauthorized charges from unknown sources.

**Phase to address:**
First deployment phase — env audit must happen before any production deploy with real credentials.

---

### Pitfall 17: Missing Environment Variables Cause Silent Startup Failures

**Severity:** MAJOR

**What goes wrong:**
A required environment variable (e.g., `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, `UPSTASH_REDIS_URL`) is not set in the deployment environment. Node.js does not throw on `undefined` process.env access — the code runs until the first operation that uses the value, then fails with an opaque error ("Cannot read properties of undefined" rather than "STRIPE_WEBHOOK_SECRET is not set"). In the worst case, the app starts successfully but silently uses `undefined` as a token value, causing authentication to accept all requests.

**Why it happens:**
No startup validation. `.env.example` exists but the actual deployment environment is configured manually and a variable is missed.

**How to avoid:**
- Add startup env validation in the Fastify app's entry point using zod:
  ```typescript
  import { z } from 'zod';
  const env = z.object({
    DATABASE_URL: z.string().url(),
    DIRECT_DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    UPSTASH_REDIS_URL: z.string().url(),
    UPSTASH_REDIS_TOKEN: z.string().min(1),
  }).parse(process.env);
  ```
- If validation fails, log all missing variables and `process.exit(1)` — do not start the server.
- Maintain a comprehensive `.env.example` with every required variable and a comment explaining each.
- Add a CI step that runs `node -e "require('./apps/api/src/env.ts')"` against a dry env to verify the schema is current.
- After provisioning any new service (Twilio, Resend, 360dialog), immediately add its vars to all environments before deploying.

**Warning signs:**
- App starting successfully in production but webhook or payment endpoints throwing runtime errors.
- `process.env.SOME_VAR` returning `undefined` in production logs.
- JWT auth accepting or rejecting all requests uniformly (indicates empty secret being used as key).

**Phase to address:**
Infrastructure setup phase — env validation must be added before any production credentials are configured.

---

### Pitfall 18: GitHub Actions CI Deploys Staging and Production with Same Environment

**Severity:** MAJOR

**What goes wrong:**
A CI/CD pipeline configured to deploy on `push to main` uses the same GitHub Actions secrets for both staging and production builds. When a developer merges a PR that was tested against staging, the production build reuses the staging Stripe webhook secret, staging Neon database URL, or staging Twilio credentials. Production payments go unrecorded, notifications go undelivered, and the issue is invisible until real users report problems.

**Why it happens:**
GitHub Actions secrets are set at the repository level. Developers add `STRIPE_SECRET_KEY` as a single secret without environment scoping. The pipeline uses the same secret for both staging and production deployments.

**How to avoid:**
- Use GitHub Actions Environments (Settings → Environments) to create separate `staging` and `production` environments with different secret values.
- Use `environment: staging` and `environment: production` in the workflow `jobs` to scope secret access.
- Add required reviewers to the `production` environment — no direct push-to-production without approval.
- Deploy staging on every PR merge; deploy production only on explicit version tag or manual approval.
- Verify environment-specific secrets with different key prefixes (e.g., `sk_test_...` for staging, `sk_live_...` for production Stripe) and fail the build if the wrong prefix is detected in the wrong environment.

**Warning signs:**
- Single `STRIPE_SECRET_KEY` secret in GitHub without environment scoping.
- CI/CD using `sk_test_...` keys in production or `sk_live_...` keys in staging.
- No deployment environment separation in GitHub Actions workflow.

**Phase to address:**
CI/CD setup phase — environment separation must be established before staging environment is validated.

---

### Pitfall 19: Expo Background GPS — Foreground Service Not Configured for Android

**Severity:** MAJOR

**What goes wrong:**
On Android, background location tracking with `expo-location` requires a foreground service with a persistent notification. Without it, Android 10+ OS will kill the background task within minutes. The washer app's GPS stops transmitting while the washer is driving to the customer — customer sees "GPS lost" mid-tracking.

The Expo `app.json` configuration for background location is required but not automatically enforced. If the `expo-location` plugin configuration in `app.json` is missing `isAndroidForegroundServiceEnabled: true`, the foreground service is not registered and background tracking silently stops.

**Why it happens:**
Background GPS works in Expo Go during development (Expo Go runs its own foreground service). The production build does not inherit this — it requires explicit app.json configuration. This only surfaces in a production build on a real device.

**How to avoid:**
- In `app.json`, configure the location plugin:
  ```json
  {
    "expo": {
      "plugins": [
        [
          "expo-location",
          {
            "locationWhenInUsePermission": "$(PRODUCT_NAME) needs your location to show your position to customers.",
            "locationAlwaysAndWhenInUsePermission": "$(PRODUCT_NAME) needs background location for active jobs.",
            "isAndroidBackgroundLocationEnabled": true,
            "isAndroidForegroundServiceEnabled": true
          }
        ]
      ]
    }
  }
  ```
- Test background GPS on a physical Android device (not emulator) with screen off for 10+ minutes.
- Test specifically on Samsung Galaxy (most aggressive power management in the Gulf region market).
- Consider `react-native-background-geolocation` by Transistor Software if expo-location proves unreliable — it is the production-hardened library for this use case.

**Warning signs:**
- Background GPS only tested in Expo Go or iOS.
- `isAndroidForegroundServiceEnabled` not in app.json.
- No foreground notification appearing on Android when washer starts a job.

**Phase to address:**
EAS Build + washer app production testing phase — must be tested on physical Samsung device before beta distribution.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Worker fly.toml copied from API fly.toml | One config to maintain | Worker gets autostopped mid-job; stalled jobs; duplicate notifications | Never — worker needs distinct fly.toml |
| Single DATABASE_URL for both migration and runtime | One env var to manage | `prepared statement already exists` errors on migrations via pooler | Never — always use directUrl for migrations |
| Skip `turbo.json` env declarations | Build is simpler | Staging build served to production via cache hit | Never — env declarations are required |
| Skip startup env validation | Faster boot | Silent undefined errors on missing secrets | Never in production |
| One GitHub secret per credential (no environment scoping) | Simpler CI setup | Staging credentials leak into production | Never — must use GitHub Environments |
| Test push notifications only in Expo Go | No EAS build needed | Production push silently fails (APNs sandbox vs. prod) | Acceptable in early development only |
| `min_machines_running = 0` (scale to zero API) | Lower cost | Socket.io connections dropped during sleep; cold starts break first request | Acceptable for worker isolation test only |
| Stripe webhook no idempotency store | Simpler handler code | Duplicate Stripe transfers on webhook retry | Never — idempotency is mandatory |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Fly.io + BullMQ worker | `auto_stop_machines` left default | Set `auto_stop_machines = "off"` explicitly in worker fly.toml |
| Fly.io + Socket.io | Default fly.toml with HTTP handler strips upgrade headers | Verify WebSocket upgrade works from production domain; check for polling fallback in logs |
| Fly.io health check | No `/health` endpoint or slow health check with DB ping | Lightweight `/health` endpoint; `grace_period = "10s"` in fly.toml |
| Vercel + Turborepo | Root directory set to monorepo root | Root directory = specific app; build command = `cd ../.. && pnpm turbo run build --filter=app` |
| Turborepo cache | Env vars not in `turbo.json` | Declare all build-affecting env vars in `turbo.json` `env` array |
| Next.js `NEXT_PUBLIC_*` | Expecting runtime behavior | Variables are inlined at build time; redeploy after any change |
| Neon + Prisma | Single DATABASE_URL for all | `directUrl` for migrations, `url` (pooled) for runtime |
| Neon migrations | Running `migrate deploy` against production directly | Create Neon branch → migrate branch → validate → promote |
| Upstash + BullMQ | `redisOptsFromUrl` without `tls: {}` | Always construct ioredis options manually with explicit `tls: {}` |
| Stripe + Fastify | Global JSON body parser intercepts webhook route | Register raw buffer parser specifically for `/webhooks/stripe` route |
| Stripe + Connect | Using `payment_intent.succeeded` for order activation | Use `checkout.session.completed` which contains metadata |
| Expo EAS | Push credentials only configured for development | Run `eas credentials` to verify production APNs p8 is configured |
| GitHub Actions | Single secret for staging and production | Use GitHub Environments with separate scoped secrets |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fly.io machine starts from cold every GPS update | 2-5 second delays on first customer request after sleep | `min_machines_running = 1`; keep machine warm | Any time machine scales to zero |
| Socket.io HTTP long-polling fallback | GPS updates 300-600ms latency instead of <50ms | Verify WebSocket upgrade in fly.toml; check logs for transport type | Always if upgrade fails |
| Prisma cold start with full schema load | First request after deploy takes 3-5 seconds | Neon HTTP adapter for serverless; singleton PrismaClient for API | Every cold start |
| BullMQ queue inspection in tight loop | High Redis read costs on Upstash fixed plan | Only use `getJobCounts()` for dashboards, not in hot paths | When monitoring code added to every request |
| Vercel build rebuilding all apps | Build takes 15+ minutes; unnecessary rebuilds | `turbo.json` with proper `inputs` and `outputs`; Turborepo remote cache | Every deploy without proper filtering |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `NEXT_PUBLIC_STRIPE_SECRET_KEY` or similar | Secret exposed in client JS bundle; full account compromise | Audit all `NEXT_PUBLIC_*` and `VITE_*` variables; only public values allowed |
| Stripe webhook without signature verification | Fake payment events accepted; fraudulent order activation | `stripe.webhooks.constructEvent()` with raw Buffer body; fail on any verification error |
| Same Stripe webhook secret for staging and production | Staging webhook events processed as production orders | Separate webhook endpoints with separate secrets per environment |
| Missing env var validation at startup | App starts with `undefined` JWT secret; all tokens valid or all rejected | Zod env schema validation at startup; `process.exit(1)` on failure |
| Fly.io secrets vs. `.env` files | `.env` committed to git exposes all production credentials | Use `fly secrets set` for all sensitive vars; `.env` only for local dev; `.env` in `.gitignore` |
| Neon database direct URL in `DATABASE_URL` (no pooler) | Connection exhaustion under load; denial of service | Pooled URL for runtime; direct URL only for CI migration step |

---

## "Looks Done But Isn't" Checklist

- [ ] **Fly.io worker deployment:** `fly status` shows worker machine running AND a test job is processed within 30 seconds of enqueueing.
- [ ] **Socket.io production transport:** Browser DevTools Network tab shows WebSocket connection (not XHR polling) when connected to production domain.
- [ ] **Fly.io health check:** `fly deploy` completes without rollback AND `/health` returns 200 within grace_period.
- [ ] **Vercel build commands:** First Vercel deploy for each app (customer-web, admin-web) succeeds without `Cannot find module 'turbo'` errors.
- [ ] **Turborepo env cache:** Build a staging version, change `NEXT_PUBLIC_API_URL`, build again — verify Turborepo does NOT use a cache hit.
- [ ] **Neon two-URL setup:** `prisma migrate deploy` runs in CI without `prepared statement` errors AND app handles 20 concurrent requests without `P1001` errors.
- [ ] **Stripe webhook raw body:** Stripe dashboard shows webhook delivered with 200 response (not 400) on first live test event.
- [ ] **BullMQ TLS:** Enqueue a test job from the API → worker logs show "active" then "completed" (not stuck in "waiting").
- [ ] **Push notifications production:** TestFlight build receives a push notification sent via Expo Push API (verifies production APNs credentials).
- [ ] **Env validation:** Unset one required env var in staging → app fails to start with a clear error naming the missing variable (not a cryptic runtime error).
- [ ] **Secret audit:** `grep -r "NEXT_PUBLIC_" apps/customer-web/.env.example` shows no secrets; same for `VITE_` in company-web.
- [ ] **GitHub Environment separation:** Production deployment requires manual approval; staging deploys automatically on merge.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Worker autostopped, jobs piled up | LOW | Add `auto_stop_machines = "off"` to worker fly.toml; redeploy; jobs will drain automatically |
| Socket.io in polling fallback mode | LOW | Debug fly.toml service configuration; verify upgrade headers pass; redeploy |
| Turborepo cache poisoning (staging build in production) | LOW | Run `turbo run build --force --filter=affected-app` to force rebuild; add env to turbo.json |
| Neon migration failed mid-apply | HIGH | Use `prisma migrate resolve --rolled-back <migration-name>` to mark as rolled back; fix migration; create Neon branch to test fix; reapply |
| Stripe webhook body parser conflict | LOW | Exempt webhook route from global body parser; redeploy; resend failed events from Stripe dashboard |
| BullMQ duplicate jobs (crash recovery) | MEDIUM | Audit processed events in `processed_webhook_events` table; manually reverse any duplicate Stripe transfers via dashboard |
| Push notifications failing in production | MEDIUM | Run `eas credentials`; regenerate APNs p8 if needed; rebuild and redistribute via TestFlight |
| Secret leaked in client bundle | HIGH | Rotate compromised secret immediately; audit for unauthorized usage; rebuild and redeploy all affected apps |
| Missing env var in production | LOW | Add via Fly secrets / Vercel dashboard; redeploy; no code changes needed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Worker autostop kills BullMQ jobs | Worker deployment setup | `fly status` + test job processed |
| Machine sleep drops Socket.io | Fly API deployment config | `min_machines_running = 1` confirmed; keep-alive health check working |
| WebSocket upgrade fails | Fly API deployment + integration test | DevTools shows `websocket` transport in production |
| Fly health check deployment loop | Initial Fly deploy | `fly deploy` succeeds; rollback history clean |
| Vercel monorepo root directory | Vercel project setup | All apps deploy successfully with correct output |
| Turborepo cache env poisoning | CI/CD setup | `turbo.json` env array reviewed; staging→production build forces rebuild |
| NEXT_PUBLIC_ build-time inlining | First production build | Env vars updated → redeploy triggered → new values confirmed |
| Neon two connection strings | Database configuration | Both URLs set; `prisma migrate deploy` tested in staging CI |
| Prisma migrate deploy without backup | CI/CD pipeline setup | Neon branch created before every migration in pipeline |
| BullMQ TLS silent failure | Worker deployment | Test job enqueued → processed → completed confirmed |
| BullMQ worker uncaught errors | Worker error handling | Ioredis error event handled; Sentry capturing worker errors |
| Stripe webhook body parser conflict | Stripe integration setup | Stripe dashboard shows 200 on first webhook delivery |
| Stripe event ordering | Stripe integration setup | `checkout.session.completed` handler tested with Stripe CLI replay |
| Expo push credentials | EAS Build setup | TestFlight push notification received successfully |
| Expo SDK mismatch | EAS Build initial run | Production build installed + GPS + camera confirmed on physical device |
| Env var in client bundle | First production deploy | `grep NEXT_PUBLIC_ .env.example` audit passes; no secrets found |
| Silent startup env failures | API/worker deployment | Env validation added; unset var causes clean startup failure |
| Staging credentials in production | CI/CD GitHub Actions setup | GitHub Environments configured; production requires approval |
| Android background GPS | EAS washer-mobile production build | Samsung Galaxy GPS tracking survives screen-off for 10 minutes |

---

## Sources

- [Fly.io Autostop/Autostart Machines](https://fly.io/docs/launch/autostop-autostart/) — autostop behavior, BullMQ worker implications
- [Fly.io Queue/Worker with Autostop discussion](https://community.fly.io/t/queue-worker-architecture-with-autostop-autostart-machines/22157) — confirmed autostop must be disabled for queue workers
- [Fly.io Machine Suspend and Resume](https://fly.io/docs/reference/suspend-resume/) — suspend vs stop latency differences
- [Fly.io Seamless Deployments](https://fly.io/docs/blueprints/seamless-deployments/) — health check grace_period configuration
- [Fly.io Socket.io community thread](https://community.fly.io/t/fly-toml-configuration-for-a-very-simple-socket-io-server/11723) — real-world Socket.io fly.toml config
- [Fly.io WebSocket upgrade issues](https://community.fly.io/t/fixing-an-intermittent-websocket-issue/26931) — proxy header behavior
- [Vercel Turborepo deployment docs](https://vercel.com/docs/monorepos/turborepo) — root directory and build command config
- [Vercel buildCommand ignored in pnpm monorepo](https://community.vercel.com/t/buildcommand-ignored-in-pnpm-monorepo-with-turborepo/18299) — confirmed navigation workaround
- [Turborepo environment variable cache docs](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables) — env array in turbo.json
- [Turborepo cache poisoning issue](https://github.com/vercel/turborepo/issues/10690) — confirmed globalEnv not always invalidating cache
- [Neon Prisma migration guide](https://neon.com/docs/guides/prisma-migrations) — two-URL setup, directUrl for migrations
- [Prisma PgBouncer configuration](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer) — `?pgbouncer=true` and directUrl
- [BullMQ Upstash documentation](https://upstash.com/docs/redis/integrations/bullmq) — TLS config, maxRetriesPerRequest, Fixed Plan requirement
- [BullMQ TLS issue — redisOptsFromUrl](https://github.com/OptimalBits/bull/issues/2325) — confirmed `tls: {}` must be explicit
- [BullMQ going to production guide](https://docs.bullmq.io/guide/going-to-production) — maxRetriesPerRequest, error handling
- [Stripe webhooks handling](https://docs.stripe.com/webhooks) — signature verification, event ordering
- [Stripe webhook best practices](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) — idempotency, event ordering anti-patterns
- [Vite env variable security issue](https://www.sprocketsecurity.com/blog/hunting-secrets-in-javascript-at-scale-how-a-vite-misconfiguration-lead-to-full-ci-cd-compromise) — real-world VITE_ secret leak
- [Next.js env var edge runtime issue](https://github.com/vercel/next.js/discussions/44628) — NEXT_PUBLIC_ build-time inlining behavior
- [Expo push notifications FAQ](https://docs.expo.dev/push-notifications/faq/) — APNs sandbox vs production
- [Expo p8 vs p12 credentials](https://medium.com/@anshikapathak06/p8-vs-p12-in-ios-what-you-really-need-to-know-8d0de1364608) — p8 recommended for production
- [Expo background location config](https://docs.expo.dev/versions/latest/sdk/location/) — isAndroidForegroundServiceEnabled requirement
- [Expo background location Android issue](https://github.com/expo/expo/issues/33911) — background permission configuration

---
*Pitfalls research for: Cleanly platform — v1.1 deployment to production (Fly.io + Vercel + EAS Build)*
*Researched: 2026-04-09*

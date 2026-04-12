# Cleanly API Deployment Runbook

> Last updated: 2026-04-12
> Covers: staging (`cleanly-api-staging`) and production (`cleanly-api`)

## Prerequisites

- Fly CLI installed and authenticated (`fly auth whoami` returns an email)
- `.env.staging` and `.env.production` at repo root (both git-ignored)
- `fly.toml` at repo root with `primary_region = "bom"`

## 1. App Creation (one-time, idempotent)

```bash
fly apps create cleanly-api-staging --org personal
fly apps create cleanly-api         --org personal
```

If either command reports "App already exists", that is fine -- continue.

## 2. Secret Import

Import secrets from local env files. These files contain KEY=VALUE lines. Comments and blank lines are ignored by `fly secrets import`.

```bash
# Staging
fly secrets import --app cleanly-api-staging < .env.staging
fly secrets list   --app cleanly-api-staging

# Production
fly secrets import --app cleanly-api < .env.production
fly secrets list   --app cleanly-api
```

**Required secret keys** (from `apps/api/src/lib/env.ts` Zod schema):

| Key | Format | Notes |
|-----|--------|-------|
| DATABASE_URL | `postgres://...` | Must contain `-pooler` in hostname |
| DIRECT_URL | `postgres://...` | Must NOT contain `-pooler` |
| UPSTASH_REDIS_URL | `rediss://...` | TLS required |
| JWT_SECRET | 32+ chars | Distinct per environment |
| JWT_REFRESH_SECRET | 32+ chars | Distinct per environment |
| TWILIO_ACCOUNT_SID | `AC...` | |
| TWILIO_AUTH_TOKEN | string | |
| TWILIO_VERIFY_SERVICE_SID | `VA...` | |
| STRIPE_SECRET_KEY | `sk_test_...` / `sk_live_...` | test for staging, live for production |
| STRIPE_WEBHOOK_SECRET | `whsec_...` | Set after Stripe webhook endpoint config |
| RESEND_API_KEY | `re_...` | Required in staging/production |
| DIALOG360_API_KEY | string | Optional until WhatsApp approved |
| R2_ACCOUNT_ID | string | |
| R2_ACCESS_KEY_ID | string | |
| R2_SECRET_ACCESS_KEY | string | |
| R2_BUCKET_NAME | `cleanly-photos-staging` / `cleanly-photos` | Per environment |
| R2_PUBLIC_URL | URL | |
| SENTRY_DSN | URL | Required in production; optional in staging with BYPASS_SENTRY=true |
| ADMIN_EXCHANGE_SECRET | 16+ chars | Distinct per environment |
| NODE_ENV | `staging` / `production` | |
| LOG_LEVEL | `info` | |
| CUSTOMER_WEB_URL | URL | Placeholder until Plan 04 |
| COMPANY_WEB_URL | URL | Placeholder until Plan 04 |
| ADMIN_WEB_URL | URL | Placeholder until Plan 04 |

**IMPORTANT:** Never commit secret VALUES. Only key names are documented here.

## 3. Deploy

```bash
# Staging (always deploy staging first)
fly deploy --app cleanly-api-staging --config fly.toml --remote-only 2>&1 | tee /tmp/fly-staging-deploy.log

# Production (only after staging verification passes)
fly deploy --app cleanly-api --config fly.toml --remote-only 2>&1 | tee /tmp/fly-prod-deploy.log
```

`--remote-only` builds on Fly's remote builders (no local Docker daemon needed).
First-time deploy takes 5-10 minutes.

## 4. Post-Deploy Verification

### 4a. Machine state

```bash
fly status       --app cleanly-api-staging
fly machine list --app cleanly-api-staging
```

Expected: one machine in process group `api` (state: `started`), one in `worker` (state: `started`).

If workers are missing:
```bash
fly scale count api=1 worker=1 --app cleanly-api-staging
```

### 4b. Health check

```bash
curl -s https://cleanly-api-staging.fly.dev/healthz
curl -s https://cleanly-api.fly.dev/healthz
```

Expected response (HTTP 200):
```json
{
  "status": "ok",
  "timestamp": "...",
  "components": {
    "db": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

If `db.status=error`: verify `DATABASE_URL` and `DIRECT_URL` in `fly secrets list`, then check `fly logs` for Prisma connection errors.
If `redis.status=error`: verify `UPSTASH_REDIS_URL` starts with `rediss://`, check `fly logs` for TLS errors.

### 4c. Socket.io WebSocket upgrade

```bash
curl --include --no-buffer \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://cleanly-api-staging.fly.dev/socket.io/?EIO=4&transport=websocket"
```

Expected: HTTP 101 Switching Protocols or a Socket.io handshake JSON. Absence of 400/404/502 confirms the WebSocket upgrade works through the Fly proxy.

### 4d. Worker logs

```bash
fly logs --app cleanly-api-staging | grep -E "\[order-worker\]|\[Notification\]|workers/index"
```

Expected: startup messages from both worker modules confirming they loaded.

## 5. Rollback Procedure

```bash
# List releases
fly releases --app cleanly-api-staging

# Roll back to a specific version
fly releases rollback <version> --app cleanly-api-staging
fly releases rollback <version> --app cleanly-api
```

## 6. Emergency Halt (Scale to Zero)

```bash
# Stop all machines
fly scale count api=0 worker=0 --app cleanly-api-staging

# Resume
fly scale count api=1 worker=1 --app cleanly-api-staging
```

## 7. Secret Rotation

Use `--stage` to stage new secret values without triggering an immediate restart. Then deploy to activate.

```bash
fly secrets set --stage KEY=new_value --app cleanly-api-staging
fly deploy --app cleanly-api-staging --config fly.toml
```

This prevents Pitfall 6 (machines starting with a mix of old and new secrets).

## 8. Useful Debugging Commands

```bash
# Tail logs in real time
fly logs --app cleanly-api-staging

# SSH into a running machine
fly ssh console --app cleanly-api-staging

# Check machine details (state, group, region)
fly machine list --app cleanly-api-staging

# Restart a specific machine (preserves secrets + image)
fly machine restart <machine-id> --app cleanly-api-staging
```

## Verification Results

> This section should be filled in after each deployment with actual output.

### Staging Deploy

- **Date:** (pending)
- **Healthz response:** (pending)
- **Machine list:** (pending)
- **Socket.io handshake:** (pending)
- **Worker logs:** (pending)

### Production Deploy

- **Date:** (pending)
- **Healthz response:** (pending)
- **Machine list:** (pending)

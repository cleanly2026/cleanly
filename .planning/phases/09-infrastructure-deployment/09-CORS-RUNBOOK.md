---
phase: 09-infrastructure-deployment
artifact: CORS-RUNBOOK
updated: 2026-04-14
---

# CORS Runbook — R2 Buckets + Fly API Web-Origin Allowlist

Close the two cross-cutting gaps left by Plans 09-02 (Fly deploy) and 09-03 (Vercel deploy):

1. **R2 bucket CORS (VCL-06)** — browsers must be able to PUT presigned photo uploads to `cleanly-photos*` buckets
2. **API CORS allowlist (VCL-05)** — `@fastify/cors` and Socket.io must accept requests from the deployed Vercel origins

> **⚠ `AllowedHeaders` MUST be `["content-type"]` — NEVER `["*"]`.** Wildcard breaks Safari preflight for presigned PUT. This is the entire reason VCL-06 exists as a standalone requirement.

## Origins Inventory (as of 2026-04-14)

Production Vercel URLs from Plan 09-03:
- `https://cleanly-customer-web.vercel.app`
- `https://cleanly-company-web.vercel.app`
- `https://cleanly-admin-web.vercel.app`

Local dev origins (for Chrome-on-localhost presigned PUT testing):
- `http://localhost:3001` (customer-web)
- `http://localhost:3002` (company-web)
- `http://localhost:3003` (admin-web)

Staging Vercel URLs (`*-staging.vercel.app`): **deferred** — add to both `r2-cors.json` and Fly secrets when the staging surface lands.

## Step 1 — Apply R2 CORS to Both Buckets

**Preferred — wrangler CLI:**
```bash
# Requires: pnpm add -g wrangler && wrangler login (with R2:Edit scope)
wrangler r2 bucket cors put cleanly-photos-staging \
  --file .planning/phases/09-infrastructure-deployment/r2-cors.json

wrangler r2 bucket cors put cleanly-photos \
  --file .planning/phases/09-infrastructure-deployment/r2-cors.json
```

**Fallback — Cloudflare dashboard:**
Cloudflare dashboard → R2 → `<bucket>` → Settings → CORS Policy → Edit → paste the contents of `r2-cors.json` → Save. Repeat for both buckets.

## Step 2 — Verify R2 CORS Applied

```bash
wrangler r2 bucket cors get cleanly-photos-staging
wrangler r2 bucket cors get cleanly-photos
```

Both outputs MUST contain `"content-type"` under `AllowedHeaders`. If either shows `"*"` — ABORT and re-apply; Safari uploads will fail preflight.

## Step 3 — Preflight an R2 Presigned PUT (cross-origin)

```bash
# 1. Mint a presigned PUT from the API (requires authenticated session):
#    POST /api/photos/upload-url → returns { url, fields } or a direct presigned URL
# 2. Preflight it from an allowed origin:
curl -v -X OPTIONS \
  -H "Origin: https://cleanly-customer-web.vercel.app" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type" \
  "<presigned-url>"
```

Expected response headers:
- `Access-Control-Allow-Origin: https://cleanly-customer-web.vercel.app`
- `Access-Control-Allow-Headers: content-type`

If either is missing, R2 CORS is not configured correctly.

## Step 4 — Set Fly Secrets (Staging First)

```bash
fly secrets set --app cleanly-api-staging \
  CUSTOMER_WEB_URL=https://cleanly-customer-web.vercel.app \
  COMPANY_WEB_URL=https://cleanly-company-web.vercel.app \
  ADMIN_WEB_URL=https://cleanly-admin-web.vercel.app
```

> These same three env vars are read by BOTH `@fastify/cors` (in `apps/api/src/plugins/cors.ts`) AND Socket.io CORS (in `apps/api/src/lib/socket.ts`) — setting them once covers both surfaces. `CUSTOMER_MOBILE_URL` / `WASHER_MOBILE_URL` stay unset until Phase 11.

`fly secrets set` triggers a rolling restart. Watch machines come back up:
```bash
fly status --app cleanly-api-staging
```
Wait for both machines back in `started` state (~30-60s).

> **Staging vs production Vercel URLs:** until `*-staging.vercel.app` URLs exist, staging Fly secrets point at the production Vercel URLs (there's only one set). This is acceptable as an MVP scope cut — it means the staging API will trust the production web apps. When staging Vercel URLs land, replace these with `https://cleanly-*-staging.vercel.app` variants.

## Step 5 — Verify CORS Header from Staging API

```bash
# Allowed origin — should return Access-Control-Allow-Origin:
curl -sI -X OPTIONS \
  -H "Origin: https://cleanly-customer-web.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  https://cleanly-api-staging.fly.dev/health

# Unallowed origin — should NOT return Access-Control-Allow-Origin:
curl -sI -X OPTIONS \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET" \
  https://cleanly-api-staging.fly.dev/health
```

Expected: allowed request returns `access-control-allow-origin: https://cleanly-customer-web.vercel.app`. Unallowed returns no such header (or an explicit refusal).

If the allowed request is missing the header, the staging API did not pick up the new env vars — check:
```bash
fly secrets list --app cleanly-api-staging
fly logs --app cleanly-api-staging | tail -50
```

## Step 6 — Set Fly Secrets (Production)

**Only after Step 5 passes on staging:**

```bash
fly secrets set --app cleanly-api \
  CUSTOMER_WEB_URL=https://cleanly-customer-web.vercel.app \
  COMPANY_WEB_URL=https://cleanly-company-web.vercel.app \
  ADMIN_WEB_URL=https://cleanly-admin-web.vercel.app
```

Wait for rolling restart, then:
```bash
curl -sI -X OPTIONS \
  -H "Origin: https://cleanly-customer-web.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  https://cleanly-api.fly.dev/health
```

Same acceptance — response MUST include `access-control-allow-origin: https://cleanly-customer-web.vercel.app`.

## Step 7 — End-to-End Browser Verification

**Check 1: HTTP CORS from real browser**
1. Open https://cleanly-customer-web.vercel.app in Chrome / Firefox / Safari
2. DevTools Console:
   ```js
   fetch('https://cleanly-api-staging.fly.dev/health')
     .then(r => r.json())
     .then(j => console.log('HTTP OK', j))
     .catch(e => console.error('HTTP ERR', e))
   ```
3. Expected: `HTTP OK { status: 'ok', ... }`. CORS error here → go back to Step 4.

**Check 2: Socket.io cross-origin**
1. Still on https://cleanly-customer-web.vercel.app
2. DevTools Console (inline the client lib if `io` isn't global):
   ```js
   // Optionally: await import('https://cdn.socket.io/4.8.3/socket.io.esm.min.js')
   const s = io('https://cleanly-api-staging.fly.dev', { transports: ['websocket'] })
   s.on('connect', () => console.log('SOCKET OK', s.id))
   s.on('connect_error', e => console.error('SOCKET ERR', e.message))
   ```
3. Expected: `SOCKET OK <id>`. `origin not allowed` → CUSTOMER_WEB_URL secret missing or API not restarted.

**Check 3: R2 presigned PUT (Safari is the tell)**
Use an authenticated washer flow to trigger a photo upload. Network tab should show:
- `OPTIONS` preflight → 200 with `Access-Control-Allow-Headers: content-type`
- `PUT` → 200

Safari is where wildcard-headers misconfigurations surface — Chrome often accepts them silently.

## Rollback

**R2 CORS:** policy is additive. To revert, re-apply the prior JSON (captured in git history). Or clear via dashboard (R2 → bucket → Settings → CORS Policy → Delete).

**Fly secrets:**
```bash
fly secrets unset CUSTOMER_WEB_URL COMPANY_WEB_URL ADMIN_WEB_URL --app cleanly-api-staging
fly secrets unset CUSTOMER_WEB_URL COMPANY_WEB_URL ADMIN_WEB_URL --app cleanly-api
```
Both commands trigger rolling restarts. API will fall back to the localhost defaults in `cors.ts` / `socket.ts` — effectively blocking all non-local web origins.

## Notes on `r2-cors.json` Maintenance

- Only origins (browser-visible host+scheme) go in `AllowedOrigins`. **Never add `cleanly-api*.fly.dev`** — the API is the signer, not the origin.
- Add staging Vercel URLs (when they exist) alongside production entries — the policy is shared between both buckets.
- `AllowedMethods: ["GET", "PUT", "HEAD"]` matches what the API-signed URLs permit. Do not add `POST` / `DELETE` unless the upload flow changes.

---
status: partial
phase: 09-infrastructure-deployment
source: [09-VERIFICATION.md]
started: 2026-04-14
updated: 2026-04-14
---

## Current Test

[awaiting human testing]

## Tests

### 1. Staging Vercel surfaces (*-staging.vercel.app × 3)
expected: Three Preview/staging Vercel projects deployed with their own env-var scope pointing to cleanly-api-staging.fly.dev
result: pending

### 2. R2 staging bucket (cleanly-photos-staging)
expected: Bucket created in Cloudflare R2, CORS policy applied via `wrangler r2 bucket cors set cleanly-photos-staging --file .planning/phases/09-infrastructure-deployment/r2-cors.json`
result: pending

### 3. Browser CORS HTTP fetch (VCL-05, E2E)
expected: From https://cleanly-customer-web.vercel.app in a real browser DevTools console, `fetch('https://cleanly-api.fly.dev/health').then(r=>r.json())` resolves without a CORS error
result: pending

### 4. Browser Socket.io cross-origin connect (FLY-06, E2E)
expected: From https://cleanly-customer-web.vercel.app, a Socket.io client connects to https://cleanly-api.fly.dev over WebSocket without "origin not allowed" error
result: pending

### 5. R2 presigned PUT preflight from browser (VCL-06, E2E)
expected: Authenticated washer upload flow triggers an OPTIONS preflight to the R2 presigned URL that returns `Access-Control-Allow-Headers: content-type`, followed by a successful 200 PUT
result: pending

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

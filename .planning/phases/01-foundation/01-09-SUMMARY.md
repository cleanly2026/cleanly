---
phase: 01-foundation
plan: "09"
subsystem: infra
tags: [cloudflare-r2, s3, aws-sdk, presigned-urls, photo-upload, storage]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: monorepo structure and packages/types foundation
provides:
  - Cloudflare R2 S3-compatible client with getSignedUploadUrl, buildPhotoKey, getPublicUrl
  - Zod schemas for photo upload request/response validation
  - packages/types exports PhotoUploadRequestSchema for use in API routes
affects:
  - 03-photo-upload
  - phase-3 washer photo evidence routes
  - POST /orders/:id/photos/presign endpoint

# Tech tracking
tech-stack:
  added:
    - "@aws-sdk/client-s3 ^3.x — S3-compatible client targeting R2 endpoint"
    - "@aws-sdk/s3-request-presigner ^3.x — presigned PUT URL generation"
  patterns:
    - "Lazy singleton pattern for R2 client — initialized on first call, cached"
    - "Presigned URL delegation — client uploads directly to R2, never proxied through API"
    - "Env var guard pattern — throws clear error (not silent null) when credentials missing"

key-files:
  created:
    - apps/api/src/lib/r2.ts
    - packages/types/src/storage.ts
  modified:
    - apps/api/package.json
    - packages/types/src/index.ts
    - pnpm-lock.yaml

key-decisions:
  - "R2 client uses GetObjectCommand (not GetObjectCommand) — PutObjectCommand for presigned PUT URLs matching R2's S3-compatible upload flow"
  - "UPLOAD_URL_TTL = 60s — short TTL prevents URL sharing abuse while allowing reasonable upload time"
  - "buildPhotoKey pattern orders/{orderId}/{photoType}/{timestamp}.{ext} — deterministic, namespaced, collision-resistant"
  - "photoType enum covers all 4 Phase 3 use cases: before, after, pickup, return (carpet model includes pickup+return)"

patterns-established:
  - "Photo key pattern: orders/{orderId}/{photoType}/{timestamp}.{ext}"
  - "R2 client initialization: lazy singleton, fails loudly on missing env vars"

requirements-completed:
  - INFRA-07

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 01 Plan 09: Cloudflare R2 Storage Client Summary

**S3-compatible Cloudflare R2 client scaffold with 60-second presigned PUT URLs, photo key builder, and Zod upload schemas covering all 4 photo types for Phase 3 evidence system**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-01T06:05:00Z
- **Completed:** 2026-04-01T06:08:26Z
- **Tasks:** 1 of 1
- **Files modified:** 5

## Accomplishments

- Scaffolded `apps/api/src/lib/r2.ts` with `getSignedUploadUrl`, `buildPhotoKey`, `getPublicUrl` — ready for Phase 3 photo routes to import directly
- Installed `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` — S3-compatible with R2's endpoint (runs on Railway, not Cloudflare Workers)
- Added `packages/types/src/storage.ts` with `PhotoUploadRequestSchema` covering all 4 photo types (before/after/pickup/return) needed for carpet pickup+return and on-site before/after

## Task Commits

Each task was committed atomically:

1. **Task 1: Cloudflare R2 storage client scaffold** - `604fe6d` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `apps/api/src/lib/r2.ts` — R2 client with lazy singleton init, presigned PUT URL generation (60s TTL), public URL helper, photo key builder
- `packages/types/src/storage.ts` — Zod schemas: PhotoUploadRequestSchema, PhotoUploadResponseSchema
- `packages/types/src/index.ts` — Added `export * from './storage'`
- `apps/api/package.json` — Added @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
- `pnpm-lock.yaml` — Updated lockfile

## Decisions Made

- Used `@aws-sdk/client-s3` (not Cloudflare Workers SDK) — API runs on Railway (persistent Node.js), not edge/Workers
- `PutObjectCommand` for presigned upload (not `GetObjectCommand`) — client uploads directly to R2 so file never proxies through API (per PHO-05)
- 60-second TTL for presigned URLs — short enough to prevent abuse, long enough for mobile uploads
- `getR2Client()` throws (not returns null) when env vars missing — fail loudly so Phase 3 developers immediately know what to configure
- `buildPhotoKey` uses `Date.now()` timestamp as collision resistance — same orderId + photoType can have multiple photos if retried

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** See plan frontmatter `user_setup` section for:

- `R2_ACCOUNT_ID` — Cloudflare dashboard → R2 → Overview → Account ID
- `R2_ACCESS_KEY_ID` — Cloudflare → R2 → Manage R2 API Tokens → Create API Token → Access Key ID
- `R2_SECRET_ACCESS_KEY` — same token creation flow → Secret Access Key
- `R2_BUCKET_NAME` — name of R2 bucket (create `cleanly-photos` bucket first)
- `R2_PUBLIC_URL` — Cloudflare → R2 → Your Bucket → Settings → Public Access → r2.dev URL or custom domain

Dashboard steps:
1. Create R2 bucket named `cleanly-photos` in Cloudflare dashboard
2. Enable public access (required for `getPublicUrl` to serve images)

These env vars are NOT needed until Phase 3 photo upload routes are built — this is a scaffold only.

## Known Stubs

- `getSignedUploadUrl` and `getPublicUrl` will throw until R2 env vars are configured — intentional, Phase 3 wires the actual upload route

## Next Phase Readiness

- Phase 3 can import `getSignedUploadUrl` and `getPublicUrl` directly from `apps/api/src/lib/r2.ts`
- `PhotoUploadRequestSchema` from `@cleanly/types` is ready for route validation in `POST /orders/:id/photos/presign`
- No blockers — R2 client scaffold is complete and self-contained

---
*Phase: 01-foundation*
*Completed: 2026-04-01*

---
phase: 03-real-time-washer-app
plan: 01
status: complete
started: 2026-04-03T15:14:00Z
completed: 2026-04-03T15:25:00Z
duration: 11min
tasks_completed: 2
tasks_total: 2
---

# Plan 03-01 Summary: API Infrastructure for Real-Time

## What Was Built

Backend API infrastructure supporting all Phase 3 mobile screens: Prisma migration for photo columns, Socket.io Redis adapter for horizontal scaling, GPS event handlers, and three new API routes.

## Tasks

### Task 1: Prisma migration + Socket.io Redis adapter + GPS event handlers
- Added `before_photo_url` and `after_photo_url` nullable columns to Order model
- Created migration `20260403000001_add_order_photo_urls`
- Installed `@socket.io/redis-adapter` and wired `createAdapter` with dedicated pub/sub clients
- Added `washer:join-order`, `washer:location` (Redis 30s TTL cache), `washer:leave-order` handlers
- Broadcast `order:washer_location` to order room on GPS update (RT-01, RT-05)
- Expanded Socket.io CORS for mobile origins + `allowEIO3=true` for React Native
- Increased R2 presigned URL TTL from 60s to 300s for poor mobile connections (RT-04)

### Task 2: Washer status, photo upload URL, and photo confirm API routes
- Created `PATCH /api/washers/status` — online/offline toggle with `washerProfile.upsert` (WASH-01)
- Created `GET /api/photos/upload-url` — presigned R2 URL using `buildPhotoKey` (PHO-05)
- Created `PATCH /api/orders/:id/photos` — saves photo URL to DB, broadcasts via Socket.io
- Registered all three routes in `server.ts`

## Key Files

### Created
- `apps/api/src/routes/washers/status.ts`
- `apps/api/src/routes/photos/upload-url.ts`
- `apps/api/src/routes/orders/photos.ts`
- `packages/db/migrations/20260403000001_add_order_photo_urls/migration.sql`

### Modified
- `packages/db/schema.prisma` — added before_photo_url, after_photo_url
- `apps/api/src/lib/socket.ts` — Redis adapter + GPS handlers
- `apps/api/src/lib/r2.ts` — TTL 60→300
- `apps/api/src/server.ts` — route registration
- `apps/api/package.json` — @socket.io/redis-adapter
- `pnpm-lock.yaml`

## Decisions
- R2 presigned URL TTL increased to 300s (5 min) for mobile reliability
- Dedicated pub/sub Redis clients for Socket.io adapter (not reusing BullMQ singleton)
- washerProfile.upsert pattern for status toggle (profile row may not exist yet)

## Self-Check: PASSED
- [x] Prisma schema has before_photo_url and after_photo_url
- [x] Socket.io uses Redis adapter (createAdapter)
- [x] GPS location cached in Redis with 30s TTL
- [x] Three new API routes registered and type-consistent

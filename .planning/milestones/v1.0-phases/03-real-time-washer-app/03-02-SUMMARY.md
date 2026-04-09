---
phase: 03-real-time-washer-app
plan: 02
status: complete
started: 2026-04-03T15:14:00Z
completed: 2026-04-03T15:25:00Z
duration: 11min
tasks_completed: 2
tasks_total: 2
---

# Plan 03-02 Summary: Washer Mobile App Foundation

## What Was Built

Complete washer mobile app foundation: all Expo packages installed, background GPS task registered at module scope, Socket.io client singleton, photo upload hook with retry, and washer home dashboard with online/offline toggle.

## Tasks

### Task 1: Install packages + configure app.json + create shared libs and hooks
- Installed expo-location, expo-task-manager, expo-image-picker, expo-image-manipulator, expo-haptics, expo-font, react-native-maps, react-native-svg, socket.io-client
- Created `app.json` with background GPS and camera plugins (isAndroidBackgroundLocationEnabled, foreground service)
- Created `socket.ts` singleton with `autoConnect: false`
- Created `gps-task.ts` with `TaskManager.defineTask` at module scope (critical for background GPS)
- Updated `_layout.tsx` — gps-task import is first import before render
- Created `useGpsTracking` hook wrapping `startLocationUpdatesAsync` with foreground service
- Created `usePhotoUpload` hook with compression + exponential backoff retry (PHO-06)
- Created `useWasherSocket` hook for job alerts (job:alert, job:accept, job:decline)
- Created `CountdownRing` SVG component with clockwise arc (RTL-exempt)

### Task 2: Washer home dashboard screen with online/offline toggle and i18n strings
- Created `OnlineToggle.tsx` — gold pill, `PATCH /api/washers/status`, AsyncStorage persist, go-offline confirmation modal
- Created `(home)/index.tsx` — earnings card (navy bg, gold amount), jobs list, empty state, skeleton loading
- Added `washer` and `tracking` namespaces to en.json and ar.json with all Phase 3 UI-SPEC strings
- Zero `marginLeft`/`marginRight` — uses `marginStart`/`marginEnd` throughout

## Key Files

### Created
- `apps/washer-mobile/app.json`
- `apps/washer-mobile/app/_layout.tsx`
- `apps/washer-mobile/app/(home)/index.tsx`
- `apps/washer-mobile/src/lib/socket.ts`
- `apps/washer-mobile/src/lib/gps-task.ts`
- `apps/washer-mobile/src/hooks/useGpsTracking.ts`
- `apps/washer-mobile/src/hooks/usePhotoUpload.ts`
- `apps/washer-mobile/src/hooks/useWasherSocket.ts`
- `apps/washer-mobile/src/components/CountdownRing.tsx`
- `apps/washer-mobile/src/components/OnlineToggle.tsx`

### Modified
- `apps/washer-mobile/package.json` — all Expo deps
- `packages/i18n/locales/en.json` — washer + tracking namespaces
- `packages/i18n/locales/ar.json` — washer + tracking namespaces

## Decisions
- `defineTask` at module scope, imported before any render in _layout.tsx (Expo requirement)
- AsyncStorage key `washer_online_status` for offline toggle persistence
- Photo compression: max 1200px, JPEG quality 0.8 before R2 upload
- Exponential backoff retry: 2s→4s→8s with 3 retries for R2 uploads (PHO-06)

## Self-Check: PASSED
- [x] All 10 new files created in washer-mobile
- [x] app.json has background GPS + camera plugins
- [x] gps-task.ts has defineTask at module top level
- [x] Home screen renders with OnlineToggle
- [x] i18n strings cover all UI-SPEC copywriting entries
- [x] No marginLeft/marginRight in any new file

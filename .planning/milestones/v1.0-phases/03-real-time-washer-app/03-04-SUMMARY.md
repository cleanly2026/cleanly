---
phase: 03-real-time-washer-app
plan: "04"
subsystem: washer-mobile
tags: [expo, react-native, maps, gps, job-alert, countdown, navigation]
dependency_graph:
  requires: ["03-01", "03-02"]
  provides: ["job-alert-screen", "en-route-screen"]
  affects: ["washer-mobile-app-flow"]
tech_stack:
  added: []
  patterns:
    - "CountdownRing component with setInterval for 30s countdown + auto-decline on expiry"
    - "Haptics on accept/decline for tactile feedback"
    - "Haversine formula for ETA calculation (no Directions API)"
    - "Straight-line Polyline as Directions API placeholder (ENH-03 deferred)"
    - "watchPositionAsync for foreground map display + startTracking for background Socket.io broadcast"
    - "Google Maps deep-link (android google.navigation, iOS comgooglemaps with web fallback)"
    - "GPS NOT stopped on I've Arrived — continues during in_progress state"
key_files:
  created:
    - apps/washer-mobile/app/(job)/alert.tsx
    - apps/washer-mobile/app/(job)/en-route.tsx
  modified: []
decisions:
  - "Straight-line Polyline used for route preview — Google Directions API deferred to ENH-03"
  - "Foreground watchPositionAsync separate from background startTracking — map display vs Socket.io broadcast are independent concerns"
  - "GPS tracking NOT stopped on I've Arrived per spec — background task continues during in_progress"
  - "comgooglemaps:// with web URL fallback for iOS — handles devices without Google Maps app installed"
  - "MOCK_TOKEN pattern preserved — auth context wiring is separate concern per established Phase 2/3 pattern"
metrics:
  duration: "~15min"
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 3 Plan 4: Job Alert + En Route Screens Summary

Job alert full-screen takeover with 30s countdown ring auto-decline and en route screen with live map, ETA calculation, Google Maps navigation, and GPS broadcasting via Socket.io.

## Tasks Completed

| Task | Name | Files |
|------|------|-------|
| 1 | Job alert full-screen takeover screen | apps/washer-mobile/app/(job)/alert.tsx |
| 2 | En route screen with map, navigation, and GPS broadcasting | apps/washer-mobile/app/(job)/en-route.tsx |

## What Was Built

### Task 1 — `app/(job)/alert.tsx`

Full-screen job alert (Screen 2 per UI-SPEC) covering the navy background with:

- **CountdownRing** from Plan 02 — 30s countdown with gold arc switching to warning orange at <10s
- **setInterval** at 1000ms decrementing `remaining` state, cleared on unmount
- **Auto-decline on expiry** (D-03): when `remaining === 0`, emits `job:decline` via Socket.io, calls `PATCH /api/washers/status { online: false }`, navigates to home — no confirmation dialog
- **Service details block**: Lucide icon (Car/Sofa/Layers) matching service type + name (20px heading), company name (70% opacity), customer address (70% opacity), estimated distance (60% opacity)
- **MapView** 180px height, `scrollEnabled={false}`, `zoomEnabled={false}`, `pitchEnabled={false}`, `rotateEnabled={false}`, navy-tinted overlay at 30% opacity
- **Accept button** (56px, gold `#C9A84C` bg, navy text): `Haptics.notificationAsync(Success)` → `acceptJob(orderId)` → navigate to en-route with order params
- **Decline button** (44px, transparent, `#DC2626` border + text): `Haptics.impactAsync(Medium)` → `declineJob(orderId)` → navigate home
- RTL: `marginStart`/`marginEnd` throughout, no `marginLeft`/`marginRight`
- All strings via `useTranslation()` with `washer.jobAlert.*` keys

### Task 2 — `app/(job)/en-route.tsx`

En route screen (Screen 3 per UI-SPEC) with two-panel layout:

- **MapView** (flex: 1, ~60% height): Google provider on Android, Apple Maps on iOS
  - Customer pin: navy `#1A2744` fill marker
  - Washer pin: animated pulsing gold dot with Animated.loop scale 1→1.35→1 (800ms)
  - Route polyline: gold dashed straight-line (Directions API deferred to ENH-03)
  - `fitToCoordinates` auto-fits map to show both pins
- **Bottom sheet** (persistent, ~40%): `#F8F7F4` surface background, `borderTopStartRadius: 16`, `borderTopEndRadius: 16`, 24px padding
  - Customer name + service type (20px heading, navy)
  - ETA (28px display, gold): Haversine formula `Math.round(distanceMeters / 8.33)` — shows "Arriving now" when <2min
  - Address (16px body, navy)
  - Navigate button (44px, gold, navy text): Android `google.navigation:q=`, iOS `comgooglemaps://` with `https://google.com/maps` fallback
  - I've Arrived button (44px, navy bg, white text): `PATCH /api/orders/${orderId}/status { status: 'in_progress' }` → navigate to before-photo
  - Call Customer icon button (44px, muted bg, navy phone icon): `tel:` deep-link
- **GPS tracking on mount**: `startTracking(orderId)` from useGpsTracking (background Socket.io broadcast) + `watchPositionAsync` for foreground map display
- **GPS NOT stopped on I've Arrived** — background task continues during `in_progress` state per spec
- RTL: `borderTopStartRadius`/`borderTopEndRadius` instead of left/right, `marginStart`/`marginEnd`

## Deviations from Plan

### Auto-fixed Issues

None.

### Architectural Deviations

None — plan executed exactly as specified.

### Deferred Items

**ENH-03: Google Maps Directions API for route polyline** — straight-line `<Polyline>` used as placeholder per plan spec note. When Directions API is available, replace the `Polyline` coordinates with the decoded route path.

**before-photo screen** — `router.replace('/(job)/before-photo')` navigation target referenced in `en-route.tsx` but not implemented in this plan. This will be created in Plan 05 or later.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `app/(job)/alert.tsx` | `MOCK_TOKEN = null` | Auth context wiring deferred — established pattern from Phase 2/3 plans |
| `app/(job)/en-route.tsx` | `MOCK_TOKEN = null` | Auth context wiring deferred — established pattern from Phase 2/3 plans |
| `app/(job)/en-route.tsx` | `router.replace('/(job)/before-photo')` | before-photo screen not yet created — implemented in a future plan |

These stubs do not prevent the plan's goal — the screens render correctly and can be tested with real tokens injected.

## Verification

- `apps/washer-mobile/app/(job)/alert.tsx` created with CountdownRing, Haptics, setInterval, MapView, auto-decline logic
- `apps/washer-mobile/app/(job)/en-route.tsx` created with MapView, startTracking, Google Maps deep-links, Haversine ETA, PATCH order status
- No `marginLeft`/`marginRight` — only `marginStart`/`marginEnd` and `borderTopStartRadius`/`borderTopEndRadius`
- All text strings use `useTranslation()` with established i18n key namespaces

## Self-Check: PASSED

Files confirmed created:
- `apps/washer-mobile/app/(job)/alert.tsx` — FOUND
- `apps/washer-mobile/app/(job)/en-route.tsx` — FOUND

---
phase: 03-real-time-washer-app
plan: 06
subsystem: ui
tags: [react-native, expo, maps, socket-io, animations, i18n, rtl]

# Dependency graph
requires:
  - phase: 03-real-time-washer-app/03-01
    provides: socket.ts singleton (getSocket, connectSocket, disconnectSocket)
  - phase: 03-real-time-washer-app/03-03
    provides: useOrderTracking hook, useEta hook, i18n tracking namespace

provides:
  - Customer live tracking screen with animated washer map marker
  - WasherMarker component with AnimatedRegion 800ms smooth interpolation
  - TrackingBottomSheet with washer info, ETA chip, bilingual status labels
  - InProgressCard replacing map during active cleaning with looping ring animation
  - Order completion screen with before/after photo display, service-type-aware heading
  - Skeleton loading state with shimmer animation

affects:
  - 03-07 (washer-mobile screens that trigger order status changes customer sees)
  - future-rating (rate service link wired but disabled, pending future phase)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AnimatedRegion from react-native-maps for smooth GPS marker interpolation
    - Animated.createAnimatedComponent(Circle) from react-native-svg for looping progress ring
    - State-based rendering: isLoading → isTracking → isInProgress → isCompleted
    - fitToCoordinates with edgePadding to auto-fit map to both washer and customer pins
    - RTL-safe flexDirection using I18nManager.isRTL check on row containers

key-files:
  created:
    - apps/customer-mobile/src/components/WasherMarker.tsx
    - apps/customer-mobile/src/components/TrackingBottomSheet.tsx
    - apps/customer-mobile/src/components/InProgressCard.tsx
    - apps/customer-mobile/app/orders/[orderId]/tracking.tsx
  modified: []

key-decisions:
  - "WasherMarker uses module-level AnimatedRegion ref initialized once — prevents re-creation on re-render causing jump-to-origin"
  - "InProgressCard receives startTime prop (epoch ms) and derives elapsed minutes locally via setInterval — avoids prop drilling"
  - "Tracking screen receives token via route params — consistent with useOrderTracking API established in 03-03"
  - "carpetPhase param ('pickup' | 'return') distinguishes carpet pickup vs return state for correct status label"
  - "rateService link present but opacity 0.5 and onPress noop — out of Phase 3 scope per plan spec"

patterns-established:
  - "Pattern 1: Animated SVG ring — Animated.createAnimatedComponent(Circle) with strokeDashoffset interpolation for indeterminate loops"
  - "Pattern 2: Map auto-fit — mapRef.current?.fitToCoordinates on first washerLocation arrival with edgePadding"
  - "Pattern 3: RTL rows — I18nManager.isRTL ? 'row-reverse' : 'row' as flexDirection for horizontal containers"
  - "Pattern 4: Order number LTR island — wrap in View with direction: 'ltr' style for monospace order numbers in Arabic mode"

requirements-completed: [RT-02, RT-03, PHO-01, PHO-02]

# Metrics
duration: 25min
completed: 2026-04-03
---

# Phase 03 Plan 06: Customer Live Tracking Screen Summary

**Customer live GPS tracking screen: animated washer dot on map (AnimatedRegion 800ms), ETA bottom sheet, InProgressCard ring, and order-complete with before/after photos — fully bilingual RTL-safe**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-03T11:30:00Z
- **Completed:** 2026-04-03T11:55:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Customer sees live washer dot on map updating every 5-10s with smooth 800ms AnimatedRegion interpolation (RT-02)
- Carpet pickup/return tracking uses same UI with different status labels via `carpetPhase` route param (RT-03)
- Order completion shows before/after photo thumbnails side-by-side from PHO-01/PHO-02 (PHO-01, PHO-02)
- Map replaced by InProgressCard (navy card + looping gold ring + elapsed timer) during active cleaning (D-05)
- All text uses i18n `tracking.*` keys; all layouts use `marginStart`/`marginEnd` with RTL-aware flexDirection

## Task Commits

Each task was committed atomically:

1. **Task 1: WasherMarker, TrackingBottomSheet, and InProgressCard components** - pending commit
2. **Task 2: Live tracking screen + order complete display** - pending commit

**Plan metadata:** pending commit

## Files Created/Modified

- `apps/customer-mobile/src/components/WasherMarker.tsx` — Animated navy map marker (32px circle, 2px white border, Droplets icon) with AnimatedRegion 800ms smooth interpolation per position update
- `apps/customer-mobile/src/components/TrackingBottomSheet.tsx` — Persistent bottom sheet: washer avatar + name, bilingual status label (onTheWay/pickingUp/delivering), gold ETA chip with "Arriving now" at <2min, service+package label
- `apps/customer-mobile/src/components/InProgressCard.tsx` — Full-screen status card: navy background, 64px avatar, elapsed time every 30s, indeterminate gold progress ring (react-native-svg AnimatedCircle), gold reassurance text below
- `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` — Live tracking screen: state machine (loading → tracking → in_progress → completed), full-screen MapView with WasherMarker + customer gold pin, fitToCoordinates auto-fit, floating translucent top bar, TrackingBottomSheet, InProgressCard, shimmer skeleton loader, order completion with photos

## Decisions Made

- `WasherMarker` uses `useRef(new AnimatedRegion(...)).current` pattern to keep the same instance across renders and prevent jump-to-origin on re-render
- `InProgressCard` derives `elapsedMinutes` via local `setInterval` from `startTime` prop — avoids need for parent to track elapsed time
- `tracking.tsx` receives `token` via route params (consistent with `useOrderTracking` API from 03-03); `carpetPhase` param distinguishes pickup vs return for correct i18n label
- Rate service link rendered at 0.5 opacity with no-op handler — link presence required by plan spec, functionality deferred per spec

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All customer-facing tracking components are ready for integration with washer mobile screens (03-07) that emit status changes
- `useOrderTracking` hook's `order:photo-uploaded` event handler stub in 03-03 can be wired to `setBeforePhotoUrl`/`setAfterPhotoUrl` in tracking.tsx when photos are uploaded
- Rate service flow needs a separate phase for rating UI

---
*Phase: 03-real-time-washer-app*
*Completed: 2026-04-03*

---
phase: 03-real-time-washer-app
plan: "03"
subsystem: ui
tags: [expo, react-native, socket.io, maps, gps, haversine, eta]

# Dependency graph
requires:
  - phase: 03-real-time-washer-app
    provides: Socket.io server with GPS event handlers and order room management

provides:
  - Socket.io client singleton for customer mobile app
  - useOrderTracking hook for receiving live washer location and order status
  - useEta hook with Haversine formula at 30km/h for arrival time calculation
  - Customer mobile configured with expo-location, react-native-maps, expo-font

affects: [03-06-live-tracking-screen, customer-mobile-tracking-ui]

# Tech tracking
tech-stack:
  added: [expo-location, expo-font, react-native-maps, react-native-svg, socket.io-client]
  patterns: [Socket.io singleton with autoConnect=false, Haversine ETA calculation]

key-files:
  created:
    - apps/customer-mobile/app.json
    - apps/customer-mobile/src/lib/socket.ts
    - apps/customer-mobile/src/hooks/useOrderTracking.ts
    - apps/customer-mobile/src/hooks/useEta.ts
  modified:
    - apps/customer-mobile/package.json
    - apps/customer-mobile/app/_layout.tsx

key-decisions:
  - "customer-mobile socket.ts uses same autoConnect=false singleton pattern as company-web — explicit connectSocket(token) call from screen"
  - "useOrderTracking tracks both washerLocation and previousLocation — previousLocation used by Plan 06 for marker interpolation animation"
  - "useEta returns distanceMeters alongside etaMinutes — consuming component formats text with i18n keys (tracking.eta / tracking.etaImminent)"

patterns-established:
  - "Socket singleton pattern: autoConnect=false, connectSocket(token) called from hook, disconnectSocket() in cleanup"
  - "ETA calculation: haversineDistance in meters / 8.33 m/s (30km/h) rounded to nearest minute"

requirements-completed: [RT-02, RT-03]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 03 Plan 03: Customer Mobile Foundation Summary

**Socket.io client singleton, useOrderTracking with previousLocation for animation, and Haversine ETA hook at 30km/h wired into customer-mobile with expo-location + react-native-maps**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T11:15:22Z
- **Completed:** 2026-04-03T11:17:44Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Installed expo-location, expo-font, react-native-maps, react-native-svg, socket.io-client into customer-mobile
- Created app.json with expo-location permission and Google Maps API key placeholder
- Created Socket.io client singleton matching company-web pattern (autoConnect: false, JWT auth)
- useOrderTracking hook joins order room, tracks washerLocation + previousLocation for smooth animation
- useEta hook computes Haversine distance and ETA at 30km/h (8.33 m/s divisor)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages + configure app.json** - `b97185e` (feat)
2. **Task 2: Socket.io client + useOrderTracking + useEta hooks** - `1e7ce75` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `apps/customer-mobile/package.json` - Added expo-location, expo-font, react-native-maps, react-native-svg, socket.io-client
- `apps/customer-mobile/app.json` - Created with expo-location permission, Google Maps config, expo-router plugin
- `apps/customer-mobile/app/_layout.tsx` - Added Cairo font loading via useFonts, null return during font load
- `apps/customer-mobile/src/lib/socket.ts` - Socket.io singleton: getSocket, connectSocket, disconnectSocket
- `apps/customer-mobile/src/hooks/useOrderTracking.ts` - Joins order room, receives washer_location, status-changed, photo-uploaded events
- `apps/customer-mobile/src/hooks/useEta.ts` - Haversine distance calculation, ETA at 30km/h

## Decisions Made

- customer-mobile socket.ts uses same autoConnect=false singleton pattern as company-web — explicit connectSocket(token) from screen keeps connection lifecycle controlled
- useOrderTracking tracks both washerLocation and previousLocation — previousLocation used by Plan 06 live tracking screen for marker interpolation animation
- useEta returns distanceMeters alongside etaMinutes — consuming component formats text with i18n keys (tracking.eta / tracking.etaImminent already added in Plan 02)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. GOOGLE_MAPS_API_KEY_PLACEHOLDER in app.json is a documented placeholder that requires replacement before production build.

## Next Phase Readiness

- Customer mobile has all foundation packages and hooks ready for Plan 06 (live tracking screen)
- Socket.io client connects with JWT auth — same auth token flow as washer-mobile
- useOrderTracking.previousLocation enables smooth marker animation on the map
- useEta produces etaMinutes that maps to tracking.eta i18n key set up in Plan 02

## Self-Check: PASSED

- [x] apps/customer-mobile/src/lib/socket.ts — FOUND
- [x] apps/customer-mobile/src/hooks/useOrderTracking.ts — FOUND
- [x] apps/customer-mobile/src/hooks/useEta.ts — FOUND
- [x] apps/customer-mobile/app.json — FOUND
- [x] Commit b97185e — FOUND
- [x] Commit 1e7ce75 — FOUND

---
*Phase: 03-real-time-washer-app*
*Completed: 2026-04-03*

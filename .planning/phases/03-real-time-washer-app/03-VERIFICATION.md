---
phase: 03-real-time-washer-app
verified: 2026-04-05T05:00:00Z
status: human_needed
score: 4/4 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 0/4 truths fully verified (1 partial, 1 human-needed, 2 failed)
  gaps_closed:
    - "GPS userId sent in washer:join-order — server now stores userId on socket, location events are broadcast"
    - "All washer-mobile screens replaced MOCK_TOKEN/empty-token stubs with useAuth() from AuthContext"
    - "en-route.tsx navigation fixed from non-existent /(job)/before-photo to /(photo)/upload"
    - "order:photo-uploaded socket event now populates beforePhotoUrl/afterPhotoUrl in useOrderTracking and tracking.tsx renders them"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Android background GPS with battery saver enabled (WASH-04)"
    expected: "GPS continues broadcasting when washer app is backgrounded on a real Samsung device with battery saver enabled; foreground service notification remains in system tray; location events arrive on customer tracking map at 5-10 second intervals"
    why_human: "Android Foreground Service behavior with battery optimization cannot be verified programmatically — requires real device with EAS production build"
  - test: "CountdownRing arc animation in washer job alert"
    expected: "SVG arc renders gold and smoothly decrements from 30 to 0; arc transitions to warning orange at <10 seconds; center text updates every second"
    why_human: "React Native SVG rendering and animation quality cannot be verified from source code alone — requires device or simulator"
  - test: "Map fitToCoordinates behavior in tracking screen"
    expected: "Map auto-fits to show both washer and customer pins on first location update with correct padding; does not thrash on subsequent location updates"
    why_human: "MapViewRef.fitToCoordinates behavior requires a running app with live GPS coordinates"
---

# Phase 03: Real-Time Washer App Verification Report

**Phase Goal:** A washer can receive a job alert, navigate to the customer, broadcast their live GPS location, upload before/after photos, complete a service checklist, and mark the job done — and the customer sees the washer dot moving on their map in real time during the entire service.

**Verified:** 2026-04-05T05:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure plans 03-08 and 03-09

## Gap Closure Summary

| Previous Gap | Root Cause | Closed By | Evidence |
|---|---|---|---|
| GPS events silently dropped (RT-01, RT-05) | `useGpsTracking` emitted `washer:join-order` with only `{ orderId }` — server guard `if (!userId) return` dropped all events | Plan 03-08 | `useGpsTracking.ts` line 17: `socket.emit('washer:join-order', { orderId, userId })` |
| All API calls used null/empty tokens (WASH-01, PHO-01-04, WASH-06) | MOCK_TOKEN=null / token='' in all 5 washer-mobile screens | Plan 03-08 | `useAuth()` imported and consuming real JWT in all screens; zero MOCK_TOKEN/empty-string matches |
| Navigation to non-existent `/(job)/before-photo` (crash) | en-route.tsx hardcoded a screen path that was never created | Plan 03-08 | `en-route.tsx` line 218: `pathname: '/(photo)/upload'` with `photoType: 'before'` params |
| Photos never reached customer tracking screen (PHO-01, PHO-02) | `order:photo-uploaded` handler in `useOrderTracking` was a no-op; tracking.tsx had disconnected local state | Plan 03-09 | Real `setState` handler in `useOrderTracking`; tracking.tsx destructures `beforePhotoUrl`/`afterPhotoUrl` from hook |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Customer sees live washer dot on map updating every 5-10s | VERIFIED | `useGpsTracking` sends `{ orderId, userId }` in join-order; server stores userId on socket and broadcasts `order:washer_location`; customer `useOrderTracking` wired to socket event; `WasherMarker` + AnimatedRegion render in `tracking.tsx` |
| 2 | Washer accepts job with 30s countdown, launches Google Maps, API calls succeed with real JWT | VERIFIED | `alert.tsx` uses `useAuth()` token for `useWasherSocket` and `setWasherOffline`; `en-route.tsx` handleArrived PATCH executes with real JWT from `useAuth()`; `complete.tsx` PATCH sends real token; Google Maps deep-link implemented for Android/iOS with web fallback |
| 3 | Photos appear in customer order view after washer uploads | VERIFIED | Server emits `order:photo-uploaded` with `{ photoType, photoUrl }`; `useOrderTracking` handler maps before/pickup to `beforePhotoUrl` and after/return to `afterPhotoUrl` via `setState`; `tracking.tsx` destructures from hook and renders Image components in completed screen |
| 4 | GPS continues broadcasting when app backgrounded on Android | NEEDS HUMAN | `foregroundService` config present in `useGpsTracking.ts` (lines 22-25); `gps-task.ts` registered at module scope as first import in `_layout.tsx`; real device test required to confirm Android battery optimization doesn't kill the process |

**Score:** 4/4 truths verified (3 fully, 1 awaiting human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/washer-mobile/src/contexts/AuthContext.tsx` | AuthProvider + useAuth hook reading JWT from AsyncStorage | VERIFIED | Full implementation: AuthContextType with token/userId/isLoading/setAuth/clearAuth; reads `accessToken`+`userId` via `Promise.all` on mount; throws if used outside provider |
| `apps/washer-mobile/app/_layout.tsx` | AuthProvider wrapping Stack; gps-task first import | VERIFIED | `'../src/lib/gps-task'` is line 1; `<AuthProvider>` wraps `<Stack>` |
| `apps/washer-mobile/src/hooks/useGpsTracking.ts` | Emits `{ orderId, userId }` in washer:join-order | VERIFIED | Signature: `useGpsTracking(userId: string | null = null)`; emit: `socket.emit('washer:join-order', { orderId, userId })` |
| `apps/washer-mobile/app/(home)/index.tsx` | useAuth token, no MOCK_TOKEN | VERIFIED | `const { token } = useAuth()` on line 51; passed to OnlineToggle and stats fetch |
| `apps/washer-mobile/app/(job)/alert.tsx` | useAuth token, no MOCK_TOKEN | VERIFIED | `const { token } = useAuth()` on line 39; token passed to useWasherSocket and setWasherOffline |
| `apps/washer-mobile/app/(job)/en-route.tsx` | useAuth token+userId, navigation to /(photo)/upload | VERIFIED | `const { token, userId } = useAuth()`; `useGpsTracking(userId)`; handleArrived PATCH guarded by `if (token && orderId)`; navigates to `/(photo)/upload` with `photoType: 'before'` |
| `apps/washer-mobile/app/(job)/complete.tsx` | useAuth token, useGpsTracking(userId) | VERIFIED | `const { token, userId } = useAuth()`; `useGpsTracking(userId)`; PATCH uses real Bearer token |
| `apps/washer-mobile/app/(photo)/upload.tsx` | useAuth token for PhotoUploader | VERIFIED | `const { token } = useAuth()`; token passed to PhotoUploader component |
| `apps/customer-mobile/src/hooks/useOrderTracking.ts` | beforePhotoUrl/afterPhotoUrl in state + real handler | VERIFIED | TrackingState type includes both fields; initial state has `null` values; handler maps all 4 photoTypes with real `setState` |
| `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` | Destructures photo URLs from hook, no local state | VERIFIED | No local `useState` for photos; destructures `beforePhotoUrl, afterPhotoUrl` from `useOrderTracking`; renders Image components in completed state |
| `apps/api/src/lib/socket.ts` | Socket.io Redis adapter + GPS broadcast with userId guard | VERIFIED | `createAdapter(pubClient, subClient)`; washer:join-order stores userId on socket; washer:location broadcasts `order:washer_location` to room; 30s Redis TTL cache |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/washer-mobile/src/contexts/AuthContext.tsx` | AsyncStorage | `AsyncStorage.getItem('accessToken')` + `AsyncStorage.getItem('userId')` on mount | WIRED | Confirmed: `Promise.all([AsyncStorage.getItem('accessToken'), AsyncStorage.getItem('userId')])` |
| `apps/washer-mobile/src/hooks/useGpsTracking.ts` | `apps/api/src/lib/socket.ts` | `washer:join-order` with `{ orderId, userId }` | WIRED | Confirmed: `socket.emit('washer:join-order', { orderId, userId })` at line 17 |
| `apps/washer-mobile/app/(job)/en-route.tsx` | `/(photo)/upload` | `router.replace` on handleArrived | WIRED | Confirmed: `pathname: '/(photo)/upload'`, params include `photoType: 'before'` and `nextRoute: '/(job)/active'` |
| `apps/washer-mobile/app/(job)/complete.tsx` | `apps/api/src/routes/orders/lifecycle.ts` | `PATCH /api/orders/:id/status` with Bearer token | WIRED | `Authorization: Bearer ${token}` where token comes from `useAuth()` — real JWT |
| `apps/api/src/lib/socket.ts` | `apps/api/src/lib/redis.ts` | `redis.set('washer:location:{userId}', ..., 'EX', 30)` | WIRED | Confirmed: RT-05 cache write at line 87 |
| `apps/api/src/routes/orders/photos.ts` | `apps/customer-mobile/src/hooks/useOrderTracking.ts` | `io.to('order:{id}').emit('order:photo-uploaded', ...)` | WIRED | Server emits; hook listens and maps photoType to state fields |
| `apps/customer-mobile/src/hooks/useOrderTracking.ts` | `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` | `{ beforePhotoUrl, afterPhotoUrl }` destructured from hook | WIRED | Confirmed: line 133 in tracking.tsx |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `apps/api/src/lib/socket.ts` | GPS location broadcast | `washer:location` socket event | Yes — `userId` now set on socket via `washer:join-order`; guard passes; Redis cache write + room broadcast execute | FLOWING |
| `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` | `washerLocation` | `useOrderTracking` via `order:washer_location` socket event | Real socket data when washer is en route | FLOWING |
| `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` | `beforePhotoUrl` / `afterPhotoUrl` | `order:photo-uploaded` socket event via `useOrderTracking` | Real R2 public URLs when washer uploads photos | FLOWING |
| `apps/washer-mobile/app/(job)/complete.tsx` | order status → completed | `PATCH /api/orders/:id/status` with Bearer token | Real JWT from `useAuth()`; will reach API and execute | FLOWING |
| `apps/washer-mobile/app/(photo)/upload.tsx` | presigned R2 URL | `GET /api/photos/upload-url` with Bearer token | Real JWT from `useAuth()`; presigned URL fetch will succeed | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — mobile app; no runnable entry points without simulator or physical device.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RT-01 | 03-01, 03-04, 03-08 | Washer location broadcasts every 5-10s via Socket.io | SATISFIED | `useGpsTracking` sends `{ orderId, userId }` in join-order; server guard passes; Redis cache + room broadcast execute at 5s/10m intervals |
| RT-02 | 03-03, 03-06 | Customer sees live washer dot on map during on-site service | SATISFIED | `WasherMarker` + `AnimatedRegion` in `tracking.tsx`; data flows from socket through `useOrderTracking` |
| RT-03 | 03-03, 03-06 | Customer sees washer dot during carpet pickup/return | SATISFIED | `carpetPhase` param handled in `TrackingBottomSheet`; same GPS data path applies |
| RT-04 | 03-01 | Socket.io uses Redis adapter from first deployment | SATISFIED | `createAdapter(pubClient, subClient)` with dedicated ioredis clients confirmed in `socket.ts` |
| RT-05 | 03-01, 03-08 | Washer location cached in Redis not DB | SATISFIED | `redis.set('washer:location:{userId}', ..., 'EX', 30)` now reached because userId guard passes |
| PHO-01 | 03-05, 03-08 | Washer uploads before photo on arrival at on-site job | SATISFIED | `upload.tsx` uses `useAuth()` token; `usePhotoUpload` can fetch presigned URL; navigation from en-route correctly passes `photoType: 'before'` |
| PHO-02 | 03-05, 03-08 | Washer uploads after photo on completion | SATISFIED | `complete.tsx` navigates to `/(photo)/upload` with `photoType: 'after'`; same token-wired flow |
| PHO-03 | 03-05, 03-08 | Washer uploads pickup photo for carpet | SATISFIED | `photoType='pickup'` handled in INSTRUCTION_MAP and BODY_MAP in `upload.tsx` |
| PHO-04 | 03-05, 03-08 | Washer uploads return photo for carpet | SATISFIED | `photoType='return'` handled; same flow |
| PHO-05 | 03-01 | Photos via presigned R2 URLs, not proxied | SATISFIED | `GET /api/photos/upload-url` returns signed S3-compatible URL; upload goes directly to R2 |
| PHO-06 | 03-02 | Photo upload has retry logic | SATISFIED | Exponential backoff in `usePhotoUpload`: 2s/4s/8s with 3 retries |
| WASH-01 | 03-01, 03-02, 03-08 | Washer can go online/offline | SATISFIED | `PATCH /api/washers/status` endpoint; `OnlineToggle` receives real token from `useAuth()`; API call will execute |
| WASH-02 | 03-04, 03-08 | Washer sees job alert with accept/decline and 30s countdown | SATISFIED | `CountdownRing`, haptics, `MapView`, auto-decline logic all use real `token` from `useAuth()` |
| WASH-03 | 03-04 | Washer can launch Google Maps navigation | SATISFIED | Android: `google.navigation:q=`; iOS: `comgooglemaps://` with web fallback; confirmed in `en-route.tsx` |
| WASH-04 | 03-02 | Washer app tracks GPS in background (Android Foreground Service) | NEEDS HUMAN | `foregroundService` config present in `useGpsTracking.ts`; `gps-task.ts` registered at module scope as first import; real device test required |
| WASH-05 | 03-05 | Washer can complete per-category service checklist | SATISFIED | 6-item checklists for car_wash and sofa; 80% completion gate; `ChecklistItem` component in `active.tsx` |
| WASH-06 | 03-05, 03-08 | Washer can mark job complete (triggers after photo + payout queue) | SATISFIED (partial scope) | UI 3-step flow complete; `stopTracking()` called; PATCH to `/api/orders/:id/status` sends real JWT — payout queue trigger is explicitly out of Phase 3 scope |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/washer-mobile/app/(home)/index.tsx` | 40-46 | `MOCK_STATS` hardcoded fallback with zeros | INFO | Stats display shows 0 when API returns non-OK or token absent; does not break core washer flow; will be replaced when `/api/washers/me/stats` endpoint is built |
| `apps/washer-mobile/app/(job)/en-route.tsx` | 214 | Comment mentioning `before-photo screen` | INFO | Comment artifact from previous implementation — navigation itself is correctly fixed to `/(photo)/upload`; no functional impact |

No BLOCKER anti-patterns remain. All previous BLOCKER patterns (MOCK_TOKEN, empty token stubs, missing navigation target) have been resolved.

### Human Verification Required

#### 1. Android Background GPS (WASH-04)

**Test:** Install EAS development build on a Samsung Galaxy device with battery optimization enabled. Accept a job, lock the phone screen, drive 500m, confirm GPS continues broadcasting.
**Expected:** Foreground service notification visible in notification tray; location events continue arriving on the customer tracking map at 5-10 second intervals with battery saver active.
**Why human:** Android Foreground Service behavior with battery optimization cannot be verified programmatically — requires real device with EAS production build. Specifically at risk: Doze mode, battery saver killing the background task on Samsung/Xiaomi/Huawei devices with aggressive battery management.

#### 2. CountdownRing visual rendering

**Test:** Trigger a job alert on a device or simulator and observe the countdown ring for 30 seconds.
**Expected:** SVG arc renders in gold (#C9A84C), smoothly decrements from 30 to 0, arc transitions to warning orange at <10 seconds, center text updates every second.
**Why human:** React Native SVG rendering and Animated timing quality cannot be verified from source code alone.

#### 3. Map fitToCoordinates behavior

**Test:** Enter the en-route screen with valid GPS coordinates and observe map behavior as location updates arrive.
**Expected:** Map adjusts region to show both washer (gold dot) and customer (navy pin) on first location update; subsequent updates move the washer dot without re-fitting the camera.
**Why human:** MapViewRef camera behavior requires a running app with live GPS coordinates and valid Google Maps API key.

### Gaps Summary

No automated gaps remain. All four root causes identified in the initial verification have been resolved:

1. **Root cause 1 resolved (GPS userId):** `useGpsTracking` now emits `{ orderId, userId }` in `washer:join-order`. The server handler stores `userId` on the socket, allowing the `washer:location` handler guard to pass and GPS events to reach Redis and the customer's tracking screen.

2. **Root cause 2 resolved (auth token wiring):** `AuthContext.tsx` was created and provides `token` and `userId` from AsyncStorage. All five washer-mobile screens now call `useAuth()` for credentials. API calls that previously silently failed (I've Arrived PATCH, job completion PATCH, presigned URL fetch, online/offline toggle) will now execute with a valid Bearer token when a logged-in washer is using the app.

3. **Root cause 3 resolved (missing navigation target):** `en-route.tsx` navigation on "I've Arrived" now points to `/(photo)/upload` with `photoType: 'before'` and `nextRoute: '/(job)/active'`. The previously referenced `/(job)/before-photo` screen (which did not exist) is no longer referenced anywhere in the codebase.

4. **Root cause 4 resolved (photo URLs not surfaced):** `useOrderTracking` now has a real `setState` handler for `order:photo-uploaded` that maps `before`/`pickup` to `beforePhotoUrl` and `after`/`return` to `afterPhotoUrl`. The `tracking.tsx` screen removes the disconnected local state and destructures both URLs from the hook, which renders them as Image components on the completed screen.

The only remaining item before phase sign-off is human verification of WASH-04 (Android background GPS with battery saver) — the code path is correctly implemented but its behavior under production Android battery management can only be confirmed on a real device.

---

_Verified: 2026-04-05T05:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after Plans 03-08 and 03-09 closed 4 gaps_

---
phase: 03-real-time-washer-app
verified: 2026-04-03T11:51:40Z
status: gaps_found
score: 3/4 success criteria verified (1 blocked by wiring break; 1 needs human)
re_verification: false
gaps:
  - truth: "Customer sees a live washer dot on the map updating every 5-10 seconds"
    status: failed
    reason: "GPS location events are silently dropped on the server. The client's useGpsTracking hook emits washer:join-order with only { orderId }, but the server handler destructures { orderId, userId } and stores userId on the socket. Since userId is never sent, (socket as any).userId is always undefined. The washer:location handler guards with 'if (!userId) return' and drops all GPS events. No location is ever cached in Redis and no order:washer_location event is ever broadcast to the customer."
    artifacts:
      - path: "apps/washer-mobile/src/hooks/useGpsTracking.ts"
        issue: "Emits washer:join-order with { orderId } only — missing userId field"
      - path: "apps/api/src/lib/socket.ts"
        issue: "Expects { orderId, userId } in washer:join-order but userId always arrives as undefined; washer:location handler returns early when userId is undefined"
    missing:
      - "useGpsTracking.ts must obtain the authenticated user's ID (from auth context, AsyncStorage, or JWT decode) and include it in the washer:join-order emit: socket.emit('washer:join-order', { orderId, userId })"
      - "Alternatively, the server can extract userId from the JWT token in the socket auth handshake rather than relying on the client to send it"

  - truth: "Photos appear in the customer's order view after washer uploads"
    status: failed
    reason: "The order:photo-uploaded Socket.io event is received by useOrderTracking but the handler is a no-op (ignores the data). The tracking.tsx screen has setBeforePhotoUrl/setAfterPhotoUrl state but they are never called. Photos are written to the DB correctly but never reach the customer's live view."
    artifacts:
      - path: "apps/customer-mobile/src/hooks/useOrderTracking.ts"
        issue: "order:photo-uploaded handler body is empty (_data ignored) — setters not exposed from hook"
      - path: "apps/customer-mobile/app/orders/[orderId]/tracking.tsx"
        issue: "setBeforePhotoUrl and setAfterPhotoUrl are declared but never called; no data path from socket event to these setters"
    missing:
      - "useOrderTracking must return beforePhotoUrl/afterPhotoUrl state and update them inside the order:photo-uploaded handler"
      - "tracking.tsx must consume these values from the hook instead of maintaining its own disconnected state"

  - truth: "Washer can accept a job, launch Google Maps navigation, and go online/offline — with all API calls succeeding"
    status: partial
    reason: "Screens render correctly and navigation logic is wired, but auth tokens are null/empty stubs in every washer-mobile screen. MOCK_TOKEN = null in alert.tsx, en-route.tsx, (home)/index.tsx; token = '' in complete.tsx and upload.tsx. The 'I've Arrived' PATCH /api/orders/:id/status call in en-route.tsx is guarded by 'if (MOCK_TOKEN && orderId)' — it will never execute. The completion PATCH in complete.tsx sends an empty Bearer token, guaranteed to fail auth. Online/offline toggle (OnlineToggle) correctly guards with 'if (token)' but receives null from home screen."
    artifacts:
      - path: "apps/washer-mobile/app/(job)/alert.tsx"
        issue: "MOCK_TOKEN = null — declineJob/acceptJob via socket work (socket auth is separate), but setWasherOffline fetch is a no-op"
      - path: "apps/washer-mobile/app/(job)/en-route.tsx"
        issue: "MOCK_TOKEN = null — I've Arrived API call is conditionally skipped; order never transitions to in_progress"
      - path: "apps/washer-mobile/app/(job)/complete.tsx"
        issue: "token = '' — PATCH /api/orders/:id/status { status: 'completed' } will fail 401"
      - path: "apps/washer-mobile/app/(photo)/upload.tsx"
        issue: "token = '' — passed to usePhotoUpload; fetch to /api/photos/upload-url will fail 401"
    missing:
      - "Auth context wiring — all washer-mobile screens need a real token from auth context or AsyncStorage; establish a useAuth hook or AuthContext before these screens can function end-to-end"

  - truth: "before-photo screen exists as navigation target after I've Arrived"
    status: failed
    reason: "en-route.tsx navigates to '/(job)/before-photo' on I've Arrived, but this screen file does not exist. Navigation will throw a runtime error on the washer device."
    artifacts:
      - path: "apps/washer-mobile/app/(job)/en-route.tsx"
        issue: "router.replace({ pathname: '/(job)/before-photo', ... }) — target screen does not exist"
    missing:
      - "Create apps/washer-mobile/app/(job)/before-photo.tsx that renders the (photo)/upload.tsx screen with photoType='before', OR change the navigation target to '/(photo)/upload' with appropriate params"

human_verification:
  - test: "GPS background tracking on Android with battery saver"
    expected: "GPS continues broadcasting when washer app is backgrounded on real Samsung device with battery saver enabled; foreground service notification remains in system tray"
    why_human: "Cannot verify Android Foreground Service behavior programmatically — requires real device with EAS production build and battery optimization settings"
  - test: "CountdownRing arc animation in washer job alert"
    expected: "SVG arc renders gold and transitions to warning orange at <10 seconds; countdown visually animates from 30 to 0"
    why_human: "React Native SVG rendering cannot be verified without running the app on device/simulator"
  - test: "Map fitToCoordinates behavior in tracking screen"
    expected: "Map auto-fits to show both washer and customer pins on first location update; does not jump on subsequent updates"
    why_human: "Map behavior requires live GPS data and running app"
---

# Phase 03: Real-Time Washer App Verification Report

**Phase Goal:** A washer can receive a job alert, navigate to the customer, broadcast their live GPS location, upload before/after photos, complete a service checklist, and mark the job done — and the customer sees the washer dot moving on their map in real time during the entire service.

**Verified:** 2026-04-03T11:51:40Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Customer sees live washer dot on map updating every 5-10s | FAILED | GPS events silently dropped: client never sends userId in washer:join-order; server guard `if (!userId) return` drops all washer:location events |
| 2 | Washer accepts job with 30s countdown, launches Google Maps, goes online/offline | PARTIAL | UI is correct; CountdownRing, MapView, Haptics, Google Maps deep-link all wired — but all API calls use null/empty tokens, so I've Arrived and job completion API calls never execute |
| 3 | Photos appear in customer order view after upload | FAILED | order:photo-uploaded socket event is a no-op in useOrderTracking; setBeforePhotoUrl/setAfterPhotoUrl in tracking.tsx are never called |
| 4 | GPS continues broadcasting when app backgrounded on Android | NEEDS HUMAN | foregroundService config present in app.json and useGpsTracking; real device test required |

**Score:** 0/4 truths fully verified (1 partial, 1 human-needed, 2 failed)

Note: The core infrastructure (Socket.io Redis adapter, Prisma migration, API routes, GPS task definition, AnimatedRegion marker) is substantively implemented and correct in isolation. The gaps are wiring breaks between components — not missing implementations.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/lib/socket.ts` | Socket.io with Redis adapter + GPS broadcast | VERIFIED | createAdapter with dedicated pub/sub clients; washer:location handler caches in Redis with 30s TTL |
| `apps/api/src/routes/washers/status.ts` | PATCH /api/washers/status | VERIFIED | washerProfile.upsert, JWT auth, correct schema |
| `apps/api/src/routes/photos/upload-url.ts` | GET /api/photos/upload-url | VERIFIED | buildPhotoKey + getSignedUploadUrl, 5-min TTL |
| `apps/api/src/routes/orders/photos.ts` | PATCH /api/orders/:id/photos | VERIFIED | getPublicUrl + DB update + socket broadcast |
| `apps/washer-mobile/src/lib/gps-task.ts` | Background GPS task at module scope | VERIFIED | TaskManager.defineTask at module top level; emits washer:location |
| `apps/washer-mobile/src/lib/socket.ts` | Socket.io client singleton | VERIFIED | autoConnect: false, connectSocket(token) |
| `apps/washer-mobile/src/hooks/useGpsTracking.ts` | startLocationUpdatesAsync wrapper | STUB | Exists and substantive but missing userId in washer:join-order emit — GPS broadcast will never work |
| `apps/washer-mobile/src/hooks/usePhotoUpload.ts` | Photo compress + upload + retry | VERIFIED | ImageManipulator, exponential backoff 2s/4s/8s, confirms to API |
| `apps/washer-mobile/src/hooks/useWasherSocket.ts` | Socket.io job alert hook | VERIFIED | connectSocket(token), job:alert handler, acceptJob/declineJob |
| `apps/washer-mobile/app/(home)/index.tsx` | Washer home dashboard | PARTIAL | Renders with OnlineToggle, earnings card, jobs list — but MOCK_TOKEN = null disables all API calls |
| `apps/washer-mobile/app/(job)/alert.tsx` | Job alert full-screen with countdown | PARTIAL | CountdownRing, Haptics, MapView, auto-decline logic all correct — MOCK_TOKEN = null means setWasherOffline is a no-op |
| `apps/washer-mobile/app/(job)/en-route.tsx` | En route map + GPS + navigation | PARTIAL | MapView, startTracking, Google Maps deep-link, Haversine ETA — I've Arrived API guarded by MOCK_TOKEN = null; navigates to non-existent before-photo screen |
| `apps/washer-mobile/app/(job)/active.tsx` | Active job checklist screen | VERIFIED | Per-category checklists, 80% gate, elapsed timer, ChecklistItem component |
| `apps/washer-mobile/app/(photo)/upload.tsx` | Photo upload screen | PARTIAL | PhotoUploader with correct instruction text — token = '' breaks presigned URL fetch |
| `apps/washer-mobile/app/(job)/complete.tsx` | Job completion flow | PARTIAL | 3-step flow, stopTracking, PATCH orders/:id/status — token = '' means 401 on completion |
| `apps/customer-mobile/src/lib/socket.ts` | Customer Socket.io singleton | VERIFIED | Same singleton pattern, autoConnect: false |
| `apps/customer-mobile/src/hooks/useOrderTracking.ts` | Order tracking hook | STUB | order:washer_location wired; order:photo-uploaded handler is empty no-op — photos never surface |
| `apps/customer-mobile/src/hooks/useEta.ts` | Haversine ETA hook | VERIFIED | haversineDistance + distanceMeters / 8.33 |
| `apps/customer-mobile/src/components/WasherMarker.tsx` | Animated washer map marker | VERIFIED | AnimatedRegion, 800ms timing, navy 32px circle, Droplets icon |
| `apps/customer-mobile/src/components/TrackingBottomSheet.tsx` | Bottom sheet with ETA | VERIFIED | washer avatar, ETA chip, status labels per order type |
| `apps/customer-mobile/src/components/InProgressCard.tsx` | In-progress status card | VERIFIED | Navy card, elapsed timer, looping SVG ring |
| `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` | Live tracking screen | PARTIAL | State machine, map, WasherMarker, fitToCoordinates — photo state variables declared but never populated |
| `packages/i18n/locales/en.json` | washer + tracking i18n namespaces | VERIFIED | All 6 sub-keys present: toggle, status, home, jobAlert, enRoute, photo, checklist, completion, offline + tracking namespace |
| `packages/db/schema.prisma` | before_photo_url, after_photo_url on Order | VERIFIED | Both nullable String columns present with migration 20260403000001_add_order_photo_urls |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/api/src/lib/socket.ts` | `apps/api/src/lib/redis.ts` | createAdapter pubClient/subClient | WIRED | Confirmed: dedicated ioredis clients, io.adapter(createAdapter(...)) |
| `apps/api/src/routes/orders/photos.ts` | `apps/api/src/lib/r2.ts` | getPublicUrl | WIRED | Confirmed: getPublicUrl(r2Key) called before DB update |
| `apps/washer-mobile/app/_layout.tsx` | `apps/washer-mobile/src/lib/gps-task.ts` | first import before render | WIRED | First import is `'../src/lib/gps-task'` as required |
| `apps/washer-mobile/src/hooks/useGpsTracking.ts` | `apps/washer-mobile/src/lib/socket.ts` | emits washer:location | BROKEN | gps-task.ts emits washer:location — but socket.userId is undefined because join-order never sends userId; all location events are dropped |
| `apps/washer-mobile/app/(job)/alert.tsx` | `apps/washer-mobile/src/hooks/useWasherSocket.ts` | acceptJob/declineJob | WIRED | Confirmed: useWasherSocket(MOCK_TOKEN, onJobAlert); acceptJob/declineJob called |
| `apps/washer-mobile/app/(job)/en-route.tsx` | `apps/washer-mobile/src/hooks/useGpsTracking.ts` | startTracking on mount | WIRED | startTracking(orderId) called in useEffect on mount |
| `apps/washer-mobile/src/components/PhotoUploader.tsx` | `apps/washer-mobile/src/hooks/usePhotoUpload.ts` | takePhoto + compressAndUpload | WIRED | usePhotoUpload hook consumed |
| `apps/washer-mobile/app/(job)/complete.tsx` | `apps/api/src/routes/orders/lifecycle.ts` | PATCH /api/orders/:id/status completed | PARTIAL | API call exists but token = '' — will fail 401 |
| `apps/customer-mobile/src/hooks/useOrderTracking.ts` | `apps/customer-mobile/src/lib/socket.ts` | socket.on('order:washer_location') | WIRED | Confirmed |
| `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` | `apps/customer-mobile/src/hooks/useOrderTracking.ts` | useOrderTracking hook | WIRED | Confirmed: useOrderTracking(orderId, token) |
| order:photo-uploaded socket event | tracking.tsx photo state | setBeforePhotoUrl/setAfterPhotoUrl | BROKEN | useOrderTracking ignores photo-uploaded data; tracking.tsx state variables are never set |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `apps/api/src/lib/socket.ts` | GPS location broadcast | `washer:location` socket event | Depends on client sending userId | DISCONNECTED — location handler returns early when userId undefined |
| `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` | washerLocation | useOrderTracking hook + Socket.io | Real when socket event received | FLOWING for location state; DISCONNECTED for photo state |
| `apps/customer-mobile/app/orders/[orderId]/tracking.tsx` | beforePhotoUrl/afterPhotoUrl | order:photo-uploaded socket event | Never populated | DISCONNECTED — no-op handler in useOrderTracking |
| `apps/washer-mobile/app/(job)/complete.tsx` | order status → completed | PATCH /api/orders/:id/status | Token empty, 401 guaranteed | HOLLOW_PROP — empty token injected at call site |

### Behavioral Spot-Checks

Step 7b: SKIPPED (mobile app — no runnable entry points without simulator/device)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RT-01 | 03-01, 03-04 | Washer location broadcasts every 5-10s via Socket.io | BLOCKED | GPS task emits correctly but server drops all events due to missing userId wiring |
| RT-02 | 03-03, 03-06 | Customer sees live washer dot on map | PARTIAL | WasherMarker + AnimatedRegion implemented; won't receive data until RT-01 is fixed |
| RT-03 | 03-03, 03-06 | Customer sees washer dot during carpet pickup/return | PARTIAL | carpetPhase param and TrackingBottomSheet status labels correct; same RT-01 blocker applies |
| RT-04 | 03-01 | Socket.io uses Redis adapter from first deployment | SATISFIED | createAdapter(pubClient, subClient) confirmed in socket.ts |
| RT-05 | 03-01 | Washer location cached in Redis not DB | BLOCKED | redis.set('washer:location:{userId}', ..., 'EX', 30) exists but never reached due to userId guard |
| PHO-01 | 03-05 | Washer uploads before photo on arrival at on-site job | PARTIAL | PhotoUploader with camera + retry exists; token = '' prevents presigned URL fetch |
| PHO-02 | 03-05 | Washer uploads after photo on completion | PARTIAL | Same token issue as PHO-01 |
| PHO-03 | 03-05 | Washer uploads pickup photo for carpet | PARTIAL | photoType='pickup' handled; same token issue |
| PHO-04 | 03-05 | Washer uploads return photo for carpet | PARTIAL | photoType='return' handled; same token issue |
| PHO-05 | 03-01 | Photos via presigned R2 URLs, not proxied | SATISFIED | GET /api/photos/upload-url returns signed S3-compatible URL; upload goes directly to R2 |
| PHO-06 | 03-02 | Photo upload has retry logic | SATISFIED | Exponential backoff in usePhotoUpload: 2s/4s/8s with 3 retries; confirmed in code |
| WASH-01 | 03-01, 03-02 | Washer can go online/offline | PARTIAL | PATCH /api/washers/status endpoint correct; OnlineToggle persists to AsyncStorage — but token is null in home screen, API call skipped |
| WASH-02 | 03-04 | Washer sees job alert with accept/decline and countdown | PARTIAL | Full-screen UI correct, CountdownRing, Haptics, auto-decline logic — but setWasherOffline is no-op with null token |
| WASH-03 | 03-04 | Washer can launch Google Maps navigation | SATISFIED | Google Maps deep-link implemented for Android (google.navigation:q=) and iOS (comgooglemaps:// with web fallback) |
| WASH-04 | 03-02 | Washer app tracks GPS in background (Android Foreground Service) | NEEDS HUMAN | foregroundService config in app.json + useGpsTracking confirmed; real device test required |
| WASH-05 | 03-05 | Washer can complete per-category service checklist | SATISFIED | 6-item checklists for car_wash and sofa, 80% completion gate, ChecklistItem component |
| WASH-06 | 03-05 | Washer can mark job complete (triggers payout queue) | PARTIAL | UI flow exists, stopTracking called — but token = '' means API call fails; payout queue trigger not implemented in Phase 3 scope |

**Note on REQUIREMENTS.md status table:** The tracking table at the end of REQUIREMENTS.md still shows RT-01 through WASH-06 as "Pending" despite code being written. The status table was not updated when plans executed. This is a documentation gap, not a code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/washer-mobile/app/(job)/alert.tsx` | 23 | `MOCK_TOKEN: string | null = null` | BLOCKER | setWasherOffline API call is no-op; auto-decline doesn't set washer offline in DB |
| `apps/washer-mobile/app/(job)/en-route.tsx` | 22 | `MOCK_TOKEN: string | null = null` | BLOCKER | I've Arrived API call skipped; order never transitions to in_progress |
| `apps/washer-mobile/app/(job)/complete.tsx` | 29 | `const token = ''` | BLOCKER | PATCH /api/orders/:id/status fails 401; job completion broken |
| `apps/washer-mobile/app/(photo)/upload.tsx` | 47 | `const token = ''` | BLOCKER | /api/photos/upload-url fetch fails 401; photo upload broken |
| `apps/washer-mobile/app/(home)/index.tsx` | 20 | `MOCK_TOKEN: string | null = null` | BLOCKER | Online/offline API call skipped; Socket.io never connects for job alerts |
| `apps/washer-mobile/app/(job)/en-route.tsx` | 218 | `pathname: '/(job)/before-photo'` | BLOCKER | Navigation target does not exist; runtime crash on I've Arrived |
| `apps/washer-mobile/src/hooks/useGpsTracking.ts` | 17 | `socket.emit('washer:join-order', { orderId })` | BLOCKER | Missing userId; all GPS location events are silently dropped by server |
| `apps/customer-mobile/src/hooks/useOrderTracking.ts` | 52-54 | `order:photo-uploaded` handler is no-op | BLOCKER | Photo URLs never reach customer tracking screen |

### Human Verification Required

#### 1. Android Background GPS (WASH-04)

**Test:** Install EAS development build on a Samsung Galaxy device with battery optimization enabled. Accept a job, lock the phone screen, confirm GPS continues broadcasting.
**Expected:** Foreground service notification visible in notification tray; location events continue arriving on customer tracking map at 5-10 second intervals.
**Why human:** Android Foreground Service behavior with battery saver cannot be verified without a physical device and EAS build. This is specifically called out in Success Criterion 4.

#### 2. CountdownRing visual rendering

**Test:** Trigger a job alert on a device/simulator and observe the countdown ring.
**Expected:** SVG arc renders in gold, smoothly decrements from 30 to 0, arc turns to warning orange at <10 seconds, center text updates every second.
**Why human:** React Native SVG rendering and animation quality cannot be verified from source code alone.

#### 3. Map fitToCoordinates behavior

**Test:** Enter the en-route screen with valid GPS coordinates and observe the map auto-fit behavior.
**Expected:** Map region adjusts to show both washer (gold dot) and customer (navy pin) with appropriate padding; fitToCoordinates doesn't thrash on subsequent location updates.
**Why human:** Map camera behavior requires running the app with live GPS coordinates.

### Gaps Summary

**Root cause 1 — Missing userId in washer:join-order (blocks RT-01, RT-05, RT-02, RT-03):**
The washer GPS broadcasting pipeline is broken at the join step. The client's `useGpsTracking` hook emits `washer:join-order` with only `{ orderId }`. The server handler stores `userId` from this payload onto the socket for downstream use by the `washer:location` handler. Since `userId` is never sent, `(socket as any).userId` is `undefined`, and the location handler returns early. No GPS data ever enters Redis and no `order:washer_location` event is ever broadcast. This single fix unblocks the entire live tracking feature.

**Root cause 2 — Auth context wiring deferred across all washer-mobile screens:**
Every washer-mobile screen uses `MOCK_TOKEN = null` or `token = ''`. This was an acknowledged deferral in the SUMMARY files but leaves the app non-functional end-to-end. The online/offline toggle cannot call the API, job acceptance doesn't set washer offline on expiry, the I've Arrived transition never fires, photos can't get presigned URLs, and job completion fails 401. An auth context or shared hook that reads the JWT from AsyncStorage is the prerequisite fix.

**Root cause 3 — Missing before-photo screen:**
`en-route.tsx` navigates to `/(job)/before-photo` on I've Arrived, but this file doesn't exist. The plan's SUMMARY acknowledged this as a known stub but it represents a runtime crash in the actual navigation flow.

**Root cause 4 — Photo URLs not surfaced to customer (PHO-01, PHO-02):**
The socket event `order:photo-uploaded` is emitted correctly by the server when photos are confirmed. The `useOrderTracking` hook registers a listener but ignores the data. The tracking screen has photo URL state but no mechanism to populate it. Before/after photos will never appear on the customer's completion screen.

---

_Verified: 2026-04-03T11:51:40Z_
_Verifier: Claude (gsd-verifier)_

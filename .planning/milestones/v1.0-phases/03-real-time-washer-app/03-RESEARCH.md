# Phase 3: Real-Time & Washer App - Research

**Researched:** 2026-04-03
**Domain:** Expo React Native GPS tracking, Socket.io real-time broadcasting, R2 photo upload, Android Foreground Service
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Job alert is a full-screen takeover — Uber/Careem-style. Entire screen becomes the job alert with a 30-second countdown ring, customer location preview, service details, and accept/decline buttons.
- **D-02:** After accepting, show an in-app route preview (map with route/ETA) before a "Navigate" button launches Google Maps with customer coordinates.
- **D-03:** If the 30-second timer expires without accept/decline, the job auto-declines and reassigns. The timed-out washer is also set to offline status. Washer must manually go back online.
- **D-04:** Customer tracking map shows: moving washer dot, estimated arrival time (updating live), and washer's first name + photo.
- **D-05:** During `in_progress` state, the map is replaced by a service-in-progress status card showing washer name, service type, elapsed time, and progress indicator.
- **D-06:** Carpet pickup/return tracking uses the same live map experience as on-site orders, with different status labels.
- **D-07:** Photo capture uses the device's native system camera. Washer takes photo, returns to app to review/confirm before uploading.
- **D-08:** Upload retry is automatic with background queuing. Auto-retries when signal improves. Washer sees progress but can continue working.
- **D-09:** Photo upload is a soft gate — washer can skip with a reason. No hard blocking on poor signal.
- **D-10:** Washer home screen is a card-based dashboard: today's earnings, jobs completed, next scheduled job, and online/offline toggle.
- **D-11:** Service checklist is a single scrollable page with checkboxes. Washer taps "Complete Job" after checking off items.
- **D-12:** Job completion flow is sequential: after photo prompt → completed checklist summary → washer confirms → order transitions to `completed`.

### Claude's Discretion

- Map library choice for customer tracking (Google Maps, Mapbox, or react-native-maps)
- Socket.io room design for washer GPS broadcasting
- GPS broadcast interval tuning (5-10s as per RT-01)
- Redis caching strategy for washer locations (RT-05)
- Android Foreground Service implementation for background GPS (WASH-04)
- Checklist item definitions per service category
- ETA calculation approach (simple distance/speed vs routing API)
- Washer earnings calculation display logic
- Photo compression/resize before upload

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RT-01 | Washer location broadcasts every 5-10s via Socket.io during en_route and in_progress | expo-location watchPositionAsync + socket.io event handlers; Redis TTL cache at API layer |
| RT-02 | Customer sees live washer dot on map during on-site service | react-native-maps MapView; Animated.timing for smooth marker interpolation |
| RT-03 | Customer sees live washer dot during carpet pickup and return delivery | Same map screen — status labels differ, no separate implementation |
| RT-04 | Socket.io uses Redis adapter from first deployment | @socket.io/redis-adapter already confirmed required; Upstash Fixed Plan Redis already provisioned |
| RT-05 | Washer location cached in Redis (not written to DB per GPS ping) | Redis SET with 30s TTL per washer; pattern: `washer:location:{washerId}` |
| PHO-01 | Washer uploads before photo at on-site job arrival | expo-image-picker (system camera) + expo-image-manipulator (compress) + R2 presigned PUT |
| PHO-02 | Washer uploads after photo at on-site job completion | Same pipeline as PHO-01; photo type = `after` |
| PHO-03 | Washer uploads pickup photo when collecting carpet | Same pipeline; photo type = `pickup`; stored on CarpetOrderDetails.pickup_photo_url |
| PHO-04 | Washer uploads return photo when delivering cleaned carpet | Same pipeline; photo type = `return`; stored on CarpetOrderDetails.return_photo_url |
| PHO-05 | Photos uploaded via presigned R2 URLs (not proxied through API) | r2.ts getSignedUploadUrl() already exists; buildPhotoKey() pattern established |
| PHO-06 | Photo upload has retry logic for poor mobile connections | Exponential backoff: 2s → 4s → 8s, max 3 retries; silent background retry per D-08 |
| WASH-01 | Washer can go online/offline to receive job assignments | PATCH /api/washers/status; WasherProfile.is_online field in schema |
| WASH-02 | Washer sees new job alert with accept/decline and countdown timer | Socket.io push to washer + full-screen takeover UI (D-01); 30s BullMQ timeout already wired |
| WASH-03 | Washer can launch Google Maps navigation to customer location | Google Maps deep-link: `comgooglemaps://?daddr={lat},{lng}` + https fallback |
| WASH-04 | Washer app tracks GPS in background using Android Foreground Service | expo-task-manager defineTask + expo-location startLocationUpdatesAsync; foreground notification required |
| WASH-05 | Washer can complete per-category service checklist during job | Local state only; submitted at job completion via PATCH /api/orders/:id/status |
| WASH-06 | Washer can mark job as complete (triggers after photo + payout queue) | PATCH /api/orders/:id/status { status: 'completed' }; existing order.worker.ts handles payout queue |
</phase_requirements>

---

## Summary

Phase 3 builds two Expo React Native app surfaces (`apps/washer-mobile` and `apps/customer-mobile`) plus the Socket.io extensions and API routes required to make GPS tracking and photo upload work end-to-end. The infrastructure — Fastify API, Socket.io server, Redis, BullMQ order worker, R2 presigned upload utilities — is all operational from Phases 1 and 2. This phase is primarily a mobile UI construction and Socket.io extension phase, not an infrastructure phase.

The single highest-risk item is Android background GPS. The Expo docs explicitly note that `expo-location` background tasks are "provided as-is" with no reliability guarantee on production devices. This is not a theoretical risk — it is documented in the project's PITFALLS.md and listed as a project blocker in STATE.md. The plan must use `expo-task-manager` with `startLocationUpdatesAsync` (which triggers an Android Foreground Service automatically when backgrounded) and must be validated on a real Samsung device with battery saver enabled.

The second major technical concern is schema gaps: the current `Order` model has no `before_photo_url` or `after_photo_url` columns for on-site orders. `CarpetOrderDetails` has `pickup_photo_url` and `return_photo_url`. The plan must include a Prisma migration adding on-site photo URL fields to `Order` before the photo upload API endpoint is built.

**Primary recommendation:** Build the API layer (Socket.io GPS room, Redis location cache, photo upload endpoint, washer status endpoint) first, then the washer mobile screens in dependency order (home → job alert → en route → active job → photo upload → completion), then the customer tracking screen.

---

## Standard Stack

### Core (all verified against installed package.json and npm registry)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | ~55.0.0 | Expo SDK | Already installed in both mobile apps |
| expo-router | ~5.0.0 | File-based routing | Already installed; matches Next.js App Router mental model |
| expo-location | 55.1.6 | GPS tracking + background location | Official Expo library for device location; required for WASH-04 |
| expo-task-manager | 55.0.12 | Background task registration | Required to keep expo-location alive when app is backgrounded on Android |
| expo-image-picker | 55.0.16 | System camera / gallery access | D-07 specifies native system camera; this is the standard approach |
| expo-image-manipulator | 55.0.13 | Image resize + compress before upload | Resize to max 1200px, JPEG quality 0.8 per UI-SPEC interaction contract |
| expo-haptics | 55.0.11 | Haptic feedback on Accept/Decline | UI-SPEC specifies Haptics.notificationAsync on Accept, impactAsync on Decline |
| react-native-maps | 1.27.2 | Map component for both surfaces | UI-SPEC has locked this: Google Maps provider Android, Apple Maps iOS |
| react-native-svg | 15.15.4 | Countdown ring arc animation | UI-SPEC specifies SVG arc for 30-second countdown ring |
| socket.io-client | 4.8.3 | WebSocket client for both mobile apps | Same major version as server (4.x); must match |
| i18next + react-i18next | 26.0.3 / 17.0.2 | Bilingual AR/EN | Already installed in both mobile apps |
| @react-native-async-storage/async-storage | ^3.0.2 | Persist online/offline toggle state | Already installed; same pattern as language preference persistence |

### API-Side (Phase 3 extensions to existing Fastify server)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| @socket.io/redis-adapter | latest | Redis adapter for Socket.io horizontal scaling | RT-04 mandates this from first deployment; Upstash Fixed Plan Redis already live |
| ioredis | (existing) | Redis client for GPS location cache | Already installed; used for BullMQ |

### Installation (Phase 3 new packages)

```bash
# Washer mobile
cd apps/washer-mobile
pnpm add expo-location expo-task-manager expo-image-picker expo-image-manipulator expo-haptics react-native-maps react-native-svg socket.io-client

# Customer mobile
cd apps/customer-mobile
pnpm add expo-location react-native-maps react-native-svg socket.io-client

# API (if Redis adapter not already installed)
cd apps/api
pnpm add @socket.io/redis-adapter
```

**Version verification:** All package versions confirmed via `npm view [package] version` on 2026-04-03.

---

## Architecture Patterns

### Project Structure (Phase 3 additions only)

```
apps/washer-mobile/
├── app/
│   ├── _layout.tsx              # existing
│   ├── (home)/
│   │   └── index.tsx            # Screen 1: Dashboard (WASH-01, D-10)
│   ├── (job)/
│   │   ├── alert.tsx            # Screen 2: Job alert full-screen takeover (WASH-02, D-01)
│   │   ├── en-route.tsx         # Screen 3: Map + bottom sheet en route (WASH-03, D-02)
│   │   ├── active.tsx           # Screen 5: Active job + checklist (WASH-04, WASH-05, D-11)
│   │   └── complete.tsx         # Screen 6: After photo + completion flow (WASH-06, D-12)
│   └── (photo)/
│       └── upload.tsx           # Screen 4: Before/after/pickup/return photo upload (PHO-01–06)
├── src/
│   ├── components/
│   │   ├── CountdownRing.tsx    # SVG arc countdown (react-native-svg)
│   │   ├── OnlineToggle.tsx     # Online/offline pill toggle (WASH-01)
│   │   ├── ChecklistItem.tsx    # Individual checklist row (WASH-05)
│   │   └── PhotoUploader.tsx    # Camera launch + upload + retry (PHO-01–06)
│   ├── hooks/
│   │   ├── useWasherSocket.ts   # Socket.io connection for job alerts
│   │   ├── useGpsTracking.ts    # expo-location watchPositionAsync wrapper
│   │   └── usePhotoUpload.ts    # Presigned URL fetch + PUT + retry logic
│   ├── lib/
│   │   ├── socket.ts            # Socket.io client singleton
│   │   └── gps-task.ts          # expo-task-manager LOCATION_TASK_NAME definition (MUST be top-level)
│   └── store/
│       └── washer.ts            # Zustand or React state for online/offline + active order

apps/customer-mobile/
├── app/
│   ├── _layout.tsx              # existing
│   └── orders/
│       └── [orderId]/
│           └── tracking.tsx     # Screen 7: Live tracking map + Screen 8: Order complete
├── src/
│   ├── components/
│   │   ├── WasherMarker.tsx     # Custom navy map marker with animation
│   │   ├── TrackingBottomSheet.tsx  # Washer info + ETA chip
│   │   └── InProgressCard.tsx   # Replaces map during in_progress state (D-05)
│   └── hooks/
│       ├── useOrderTracking.ts  # Socket.io listener for washer:location events
│       └── useEta.ts            # Haversine + 30km/h estimate

apps/api/src/
├── routes/
│   ├── washers/
│   │   ├── status.ts            # PATCH /api/washers/status (WASH-01)
│   │   └── location.ts          # POST /api/washers/:id/location (RT-01, RT-05)
│   └── photos/
│       └── upload-url.ts        # GET /api/photos/upload-url (PHO-05)
└── lib/
    └── socket.ts                # Extended with washer GPS room handlers (RT-01)
```

### Pattern 1: Android Background GPS via expo-task-manager

**What:** `expo-task-manager` + `expo-location.startLocationUpdatesAsync` — the combination that triggers an Android Foreground Service, keeping GPS alive when the app is backgrounded.

**Critical constraint:** The `defineTask` call MUST be at the module top level (not inside a component or hook). It must be imported before the app renders.

**When to use:** Always for washer GPS broadcasting. The simpler `watchPositionAsync` stops when the app is backgrounded on Android with battery saver.

```typescript
// apps/washer-mobile/src/lib/gps-task.ts
// Source: Expo docs — expo-location background location
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'

export const LOCATION_TASK_NAME = 'cleanly-washer-gps'

// MUST be called at module top level — not inside React component
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('[GPS Task]', error)
    return
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] }
    const location = locations[0]
    if (location) {
      // Post to API or emit via socket — store orderId from module state
      // Note: cannot use React state here — use a module-level variable or AsyncStorage
      emitLocation(location.coords.latitude, location.coords.longitude)
    }
  }
})

export async function startGpsTracking(orderId: string) {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') throw new Error('Foreground location permission denied')

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync()
  if (bgStatus !== 'granted') throw new Error('Background location permission denied')

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,          // 5s (RT-01 specifies 5-10s)
    distanceInterval: 10,        // skip update if moved <10m
    foregroundService: {         // Android Foreground Service — keeps process alive
      notificationTitle: 'Cleanly — job in progress',
      notificationBody: 'Location sharing active',
    },
    pausesUpdatesAutomatically: false,  // iOS: never auto-pause
  })
}

export async function stopGpsTracking() {
  const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (isTracking) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
  }
}
```

**app.json plugin registration** (required for Android Foreground Service permissions):
```json
{
  "expo": {
    "plugins": [
      ["expo-location", {
        "locationAlwaysAndWhenInUsePermission": "Cleanly needs your location to share it with customers during a job.",
        "isAndroidBackgroundLocationEnabled": true,
        "isAndroidForegroundServiceEnabled": true
      }]
    ]
  }
}
```

### Pattern 2: Socket.io GPS Room Design

**What:** Washer joins `order:{orderId}` room and emits location. Customer joins the same room and receives it. API handler writes to Redis cache (RT-05) and re-broadcasts as `order:washer_location`.

**Why this design:** Ensures events are scoped to one order. With Redis adapter, any server instance receives and re-broadcasts — scales horizontally without change.

```typescript
// Extension to apps/api/src/lib/socket.ts
// Washer GPS broadcast handler
socket.on('washer:location', async ({ orderId, lat, lng, heading }: {
  orderId: string; lat: number; lng: number; heading?: number
}) => {
  // RT-05: Cache in Redis — NOT written to DB per GPS ping
  const washerId = (socket as any).userId  // set during auth
  await redis.set(
    `washer:location:${washerId}`,
    JSON.stringify({ lat, lng, heading, ts: Date.now() }),
    'EX', 30  // 30-second TTL — stale if washer disconnects
  )

  // Broadcast to order room — reaches customer regardless of which server instance
  io.to(`order:${orderId}`).emit('order:washer_location', { lat, lng, heading })
})

// Washer joins their order room
socket.on('washer:join-order', ({ orderId }: { orderId: string }) => {
  socket.join(`order:${orderId}`)
})
```

### Pattern 3: Photo Upload with Retry

**What:** Fetch presigned URL from API, PUT image directly to R2, retry on failure with exponential backoff. Never proxy through API server (PHO-05).

```typescript
// apps/washer-mobile/src/hooks/usePhotoUpload.ts
import * as ImageManipulator from 'expo-image-manipulator'

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],  // max 1200px on longest side
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}

async function uploadWithRetry(
  presignedUrl: string,
  imageUri: string,
  maxRetries = 3
): Promise<void> {
  const compressedUri = await compressImage(imageUri)
  const blob = await fetch(compressedUri).then(r => r.blob())

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      })
      if (!response.ok) throw new Error(`R2 responded ${response.status}`)
      return  // success
    } catch (err) {
      if (attempt === maxRetries) throw err
      // Exponential backoff: 2s → 4s → 8s
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt + 1) * 1000))
    }
  }
}
```

### Pattern 4: react-native-maps Washer Marker with Animation

**What:** Custom `<Marker>` on `<MapView>` that smoothly animates between position updates using `Animated.timing`.

```typescript
// apps/customer-mobile/src/components/WasherMarker.tsx
import MapView, { Marker, AnimatedRegion } from 'react-native-maps'

const washerPosition = useRef(new AnimatedRegion({
  latitude: initialLat,
  longitude: initialLng,
  latitudeDelta: 0,
  longitudeDelta: 0,
})).current

// On each Socket.io update:
washerPosition.timing({
  latitude: newLat,
  longitude: newLng,
  duration: 800,
  useNativeDriver: false,
}).start()

// In render:
<Marker.Animated coordinate={washerPosition}>
  <View style={styles.washerDot} />  {/* navy circle, white border */}
</Marker.Animated>
```

### Pattern 5: Washer Status Endpoint

**What:** `PATCH /api/washers/status` updates `WasherProfile.is_online` and persists to AsyncStorage on mobile.

**API:**
```typescript
// apps/api/src/routes/washers/status.ts
fastify.patch('/status', {
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const { online } = request.body as { online: boolean }
  const userId = (request.user as { id: string }).id

  await prisma.washerProfile.upsert({
    where: { user_id: userId },
    create: { user_id: userId, is_online: online },
    update: { is_online: online },
  })

  return { online }
})
```

### Anti-Patterns to Avoid

- **watchPositionAsync without foreground service:** Works in Expo Go, killed on production Samsung with battery saver. Use `startLocationUpdatesAsync` with `foregroundService` config.
- **defineTask inside a component:** Task registration must be at module scope. Putting it inside `useEffect` or a component body causes "task not found" errors.
- **Writing GPS coordinates to DB on every ping:** Performance trap documented in PITFALLS.md. Redis TTL cache only; persist to DB only on order state transitions where location matters.
- **Socket.io without Redis adapter:** RT-04 mandates it from first deployment. The Upstash Fixed Plan Redis is already provisioned — use it.
- **Proxying photo upload through the API server:** PHO-05 explicitly forbids this. Always use presigned R2 PUT URLs from `r2.ts getSignedUploadUrl()`.
- **marginLeft/marginRight in React Native styles:** Breaks RTL. Use `marginStart`/`marginEnd` throughout per CLAUDE.md and established project convention.

---

## Schema Gaps (Migration Required)

**CRITICAL FINDING:** The current `Order` model has **no before/after photo URL columns** for on-site orders.

Current state:
- `CarpetOrderDetails` has `pickup_photo_url` and `return_photo_url` — correct for carpet.
- `Order` has no photo URL fields — PHO-01 (before photo) and PHO-02 (after photo) for on-site orders have nowhere to be stored.

**Required migration:** Add `before_photo_url` and `after_photo_url` nullable columns to `Order`.

```prisma
model Order {
  // ... existing fields ...
  before_photo_url  String?   // PHO-01: on-site before photo R2 key
  after_photo_url   String?   // PHO-02: on-site after photo R2 key
}
```

This migration must be **Wave 0** — before any photo upload API endpoint is written.

The photo URL update flow after R2 upload completes:
- On-site orders: `PATCH /api/orders/:id/photos` → updates `Order.before_photo_url` or `Order.after_photo_url`
- Carpet orders (pickup photo): updates `CarpetOrderDetails.pickup_photo_url`
- Carpet orders (return photo): updates `CarpetOrderDetails.return_photo_url`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Android background GPS service | Custom foreground service notification management | `expo-location` + `expo-task-manager` with `foregroundService` config | Handles permission flow, notification channel creation, OS restart behavior, and wake lock automatically |
| Image resize/compress | Canvas-based manipulation or raw JPEG encoding | `expo-image-manipulator` | Handles EXIF stripping, format conversion, quality control across iOS and Android |
| System camera integration | Custom camera UI with CameraView | `expo-image-picker` with `launchCameraAsync()` | D-07 specifies native system camera; expo-image-picker is the correct library for this |
| Map rendering | Custom tile renderer | `react-native-maps` | Production-proven; handles Google Maps / Apple Maps provider switching automatically |
| SVG arc countdown ring | Canvas arc drawing | `react-native-svg` | SVG is the standard for this pattern; react-native-svg is the established library |
| Smooth GPS marker animation | Linear interpolation in React state | `Animated.timing` + `Marker.Animated` from react-native-maps | react-native-maps AnimatedRegion handles all interpolation internally |
| ETA routing | Google Distance Matrix API | Haversine + 30km/h formula | ENH-03 (Google Distance Matrix) is explicitly deferred to v2. Simple formula is correct for Phase 3. |
| Haptic feedback | Third-party vibration library | `expo-haptics` | Already in Expo SDK; correct calls specified in UI-SPEC |

**Key insight:** All GPS, camera, image processing, and map libraries are official Expo SDK modules or react-native-maps. No third-party native modules requiring custom native code — this is critical for Expo managed workflow compatibility.

---

## Common Pitfalls

### Pitfall 1: Android Background GPS Killed by Battery Saver
**What goes wrong:** Expo's `watchPositionAsync` stops when app is backgrounded on production Android devices with battery saver (Samsung, Xiaomi, OnePlus). Customer tracking goes dark mid-job.

**Why it happens:** `watchPositionAsync` is a foreground-only API. Without an Android Foreground Service notification, the OS is free to kill the process.

**How to avoid:** Use `startLocationUpdatesAsync` (not `watchPositionAsync`) with `foregroundService: { notificationTitle, notificationBody }`. This creates an Android Foreground Service that the OS is not allowed to kill arbitrarily. Register the task via `expo-task-manager` at module top level.

**Warning signs:** GPS works in Expo Go or in foreground-only testing. Switch to production APK + lock screen + battery saver enabled — if GPS drops, you have this problem.

### Pitfall 2: GPS Task defined inside a Component
**What goes wrong:** `TaskManager.defineTask(LOCATION_TASK_NAME, ...)` must be called at module scope before the app renders. If placed inside a component, hook, or `useEffect`, Expo cannot find the task when the OS wakes the app in the background, and the task fails silently.

**How to avoid:** Create `apps/washer-mobile/src/lib/gps-task.ts` as a standalone module that defines the task at the top level. Import this module in `app/_layout.tsx` before any other render logic.

### Pitfall 3: Socket.io Missing Redis Adapter (RT-04 Compliance)
**What goes wrong:** Without the Redis adapter, Socket.io events from one server instance don't reach clients connected to another instance. RT-04 explicitly requires the Redis adapter from first deployment.

**How to avoid:** Add `@socket.io/redis-adapter` to the existing `socket.ts` setup before adding any new GPS event handlers. The Upstash Fixed Plan Redis is already provisioned — this is a configuration addition, not a new infrastructure cost.

**Note on redis client:** The existing `apps/api/src/lib/redis.ts` uses ioredis. The `@socket.io/redis-adapter` supports ioredis. Create a second ioredis client for the pub/sub subscription channel (as required by the adapter's pubClient/subClient pattern).

### Pitfall 4: Photo URL Columns Missing for On-Site Orders
**What goes wrong:** The `Order` model has no `before_photo_url` or `after_photo_url` columns. PHO-01 and PHO-02 require storing photo URLs for on-site orders after upload completes.

**How to avoid:** Add a Prisma migration as Wave 0. Do not attempt to build the photo upload confirmation endpoint without these columns in the schema.

### Pitfall 5: presignedUrl Expiry (60s TTL) vs Upload Duration
**What goes wrong:** The existing `r2.ts` generates presigned URLs with a 60-second TTL. On a poor mobile connection, the upload may take longer than 60 seconds, causing an HTTP 403 from R2 after the URL expires.

**How to avoid:** Increase `UPLOAD_URL_TTL` in `r2.ts` to 300 seconds (5 minutes) for photo uploads. The client should fetch the presigned URL immediately before the upload attempt (not pre-fetch and cache), so the 5-minute window is always fresh.

### Pitfall 6: GPS Location Emitted Before Socket Connection is Ready
**What goes wrong:** Washer's GPS task starts emitting `washer:location` events before the Socket.io client has connected and joined the order room. Events are lost.

**How to avoid:** In the washer's `gps-task.ts`, use a module-level variable to store the current orderId. The location emission function should check `socket.connected` before emitting. Start GPS tracking only after the `washer:join-order` acknowledgment is received from the server.

### Pitfall 7: React Native marginLeft/marginRight in New Screens
**What goes wrong:** New screens built in Phase 3 use `marginLeft`/`marginRight` instead of `marginStart`/`marginEnd`, breaking Arabic RTL layout.

**How to avoid:** All StyleSheet definitions use only `marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`. This is a project-wide established convention (CLAUDE.md + Phase 1). Add a lint comment or review step.

---

## Code Examples

### Verified: expo-location startLocationUpdatesAsync

```typescript
// Source: expo-location official docs (Expo SDK 55)
import * as Location from 'expo-location'

await Location.startLocationUpdatesAsync('cleanly-washer-gps', {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 10,
  foregroundService: {
    notificationTitle: 'Cleanly — job in progress',
    notificationBody: 'Location sharing active',
  },
  pausesUpdatesAutomatically: false,
})
```

### Verified: Socket.io Redis Adapter (Upstash / ioredis)

```typescript
// Source: Socket.io docs + existing ioredis pattern from Phase 1
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'

const pubClient = new Redis(process.env.REDIS_URL!, { tls: {} })
const subClient = pubClient.duplicate()

io.adapter(createAdapter(pubClient, subClient))
```

**Note:** Upstash Redis requires TLS (`{ tls: {} }` in ioredis config). This is the same pattern already used in `apps/api/src/lib/redis.ts`.

### Verified: expo-image-picker System Camera (D-07)

```typescript
// Source: expo-image-picker official docs (SDK 55)
import * as ImagePicker from 'expo-image-picker'

const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ['images'],
  quality: 1,       // full quality — expo-image-manipulator will compress
  allowsEditing: false,
})

if (!result.canceled && result.assets[0]) {
  const uri = result.assets[0].uri
  // proceed to compress + upload
}
```

### Verified: Haversine ETA (Claude's Discretion — no routing API)

```typescript
// Source: UI-SPEC interaction contract — simple formula, ENH-03 (routing API) deferred to v2
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000  // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function calculateEta(washerLat: number, washerLng: number, customerLat: number, customerLng: number): string {
  const distanceMeters = haversineDistance(washerLat, washerLng, customerLat, customerLng)
  const etaMinutes = Math.round(distanceMeters / 8.33)  // 30km/h = 8.33 m/s
  if (etaMinutes < 2) return 'Arriving now'
  return `Arriving in ~${etaMinutes} min`
}
```

### Verified: Google Maps Deep-Link (WASH-03)

```typescript
// Source: Google Maps URL scheme docs
// iOS: opens Google Maps app if installed, falls back to browser
// Android: opens Google Maps app
const openGoogleMaps = (lat: number, lng: number) => {
  const url = Platform.select({
    ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
    android: `google.navigation:q=${lat},${lng}&mode=d`,
  })
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`

  Linking.canOpenURL(url!).then(supported => {
    Linking.openURL(supported ? url! : fallback)
  })
}
```

### Verified: Photo Confirm Endpoint (After R2 Upload)

```typescript
// New route: PATCH /api/orders/:id/photos
// Called AFTER client has successfully PUT photo to R2 presigned URL
fastify.patch<{ Params: { id: string } }>('/:id/photos', {
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const { id: orderId } = request.params
  const { photoType, r2Key } = request.body as {
    photoType: 'before' | 'after' | 'pickup' | 'return'
    r2Key: string
  }

  const photoUrl = r2.getPublicUrl(r2Key)

  if (photoType === 'before') {
    await prisma.order.update({ where: { id: orderId }, data: { before_photo_url: photoUrl } })
  } else if (photoType === 'after') {
    await prisma.order.update({ where: { id: orderId }, data: { after_photo_url: photoUrl } })
  } else if (photoType === 'pickup') {
    await prisma.carpetOrderDetails.update({ where: { order_id: orderId }, data: { pickup_photo_url: photoUrl } })
  } else if (photoType === 'return') {
    await prisma.carpetOrderDetails.update({ where: { order_id: orderId }, data: { return_photo_url: photoUrl } })
  }

  // Notify customer via Socket.io order room
  getIO().to(`order:${orderId}`).emit('order:photo-uploaded', { photoType, photoUrl })

  return { photoType, photoUrl }
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-camera CameraView for washer photo | expo-image-picker launchCameraAsync (native system camera) | D-07 decision | Simpler UX — washer uses familiar native camera; no in-app camera UI to build |
| React Native Animated.Value for marker position | react-native-maps AnimatedRegion | react-native-maps 1.x | Smoother interpolation; AnimatedRegion is native-driver-compatible |
| GPS location written to DB per ping | GPS location cached in Redis only (RT-05) | Phase 3 architecture decision | Prevents DB write storms at 5-10s intervals across all active washers |
| expo-location watchPositionAsync | expo-location startLocationUpdatesAsync + expo-task-manager | Expo SDK 52+ background permission model change | Required for Android Foreground Service; the only reliable production approach |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All API routes | Expected (Phase 1 infra complete) | Assumed 20 LTS | — |
| Expo CLI | Mobile builds | Confirmed (Phase 1 complete) | SDK 55 in package.json | — |
| Redis (Upstash Fixed Plan) | RT-04, RT-05, Socket.io adapter | Confirmed (Phase 1 infra complete) | — | — |
| Cloudflare R2 | PHO-01–06 | Confirmed (Phase 1 infra complete, r2.ts scaffold exists) | — | — |
| Android device (Samsung) | WASH-04 validation | Real device required — cannot validate in emulator | — | iOS only (cannot validate WASH-04 success criteria without Android) |
| Google Maps API key | react-native-maps Android | Must be set in app.json `android.config.googleMaps.apiKey` | — | Apple Maps works on iOS without API key |

**Missing dependencies with no fallback:**
- **Android device with battery saver (real Samsung):** The WASH-04 success criterion explicitly requires "GPS continues broadcasting when the washer app is backgrounded on Android (Foreground Service confirmed working on real Samsung device with battery saver)." This cannot be satisfied in an emulator or Expo Go — requires a production APK installed on a real device.
- **Google Maps API key:** Required for react-native-maps Google Maps provider on Android. Must be provisioned before Android map screens can be tested.

**Missing dependencies with fallback:**
- None.

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies To Phase 3 |
|-----------|-------------------|
| All React Native StyleSheets use `marginStart`/`marginEnd` (not left/right) | Every new screen and component |
| `I18nManager.forceRTL` + `writingDirection: 'rtl'` on root view for Arabic | Washer home `_layout.tsx` and customer mobile `_layout.tsx` |
| All UI strings use i18n keys — no hardcoded English (I18N-01) | All new screens; Arabic copy is provided in UI-SPEC |
| Cairo font loaded via `expo-font` with `useFonts` hook | Both mobile apps (may already be wired from Phase 1 scaffold) |
| Use `marginStart`/`marginEnd`, `paddingStart`/`paddingEnd` throughout | All new StyleSheet definitions |
| Map labels switch to Arabic when AR mode active (I18N-06) | react-native-maps `customMapStyle` or Google Maps language parameter |
| dir=ltr exception on numeric-only displays (order numbers, amounts) | Earnings card amounts, order number displays |
| `Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' })` for AED in Arabic | Earnings card, completion earnings display |
| GSD workflow enforcement: no direct repo edits outside GSD | N/A (research only) |

---

## Open Questions

1. **Google Maps API key availability**
   - What we know: react-native-maps requires a Google Maps API key for Android; without it the map is blank.
   - What's unclear: Whether the key has been provisioned during Phase 1/2 setup.
   - Recommendation: Wave 0 of the plan should verify `GOOGLE_MAPS_API_KEY` is set in the environment and documented in `app.json`.

2. **Socket.io auth in washer room join**
   - What we know: The existing `socket.ts` has a TODO comment about JWT verification in the `join:order` handler — it joins the room without validating the token.
   - What's unclear: Whether Phase 2 extended this with proper JWT verification.
   - Recommendation: The new `washer:join-order` handler must verify the washer's JWT and confirm they are the assigned washer for the given orderId before allowing room join. Do not skip this — a malicious actor could join any order room without it.

3. **expo-image-picker API surface in SDK 55**
   - What we know: `launchCameraAsync` is the documented API; `mediaTypes` array syntax (`['images']`) is current.
   - What's unclear: Whether `CameraView` (in-app camera) vs `launchCameraAsync` (system camera) decision (D-07: system camera) requires any additional permission setup in `app.json`.
   - Recommendation: Add `expo-image-picker` plugin to `app.json` with `photosPermission` and `cameraPermission` strings in the plan's Wave 0.

4. **WasherProfile upsert vs create**
   - What we know: `WasherProfile` has a `user_id` unique field and `is_online` boolean. The existing auth scaffold creates users but may or may not create the `WasherProfile` row on registration.
   - What's unclear: Whether every washer already has a `WasherProfile` row or if it needs to be created on first status toggle.
   - Recommendation: Use `upsert` in the `/api/washers/status` route (as shown in the code example above) to be safe regardless of whether the row already exists.

---

## Sources

### Primary (HIGH confidence)
- Expo docs (expo.dev) — expo-location background location, expo-task-manager, expo-image-picker, expo-image-manipulator SDK 55
- react-native-maps GitHub README (v1.27.2) — AnimatedRegion, Marker.Animated, Google Maps provider setup
- `.planning/research/PITFALLS.md` — GPS background tracking pitfalls (verified by prior research session)
- `.planning/research/CONTEXT7_VERIFIED.md` — Socket.io Redis adapter pattern, expo-location background prerequisites
- `packages/db/schema.prisma` — confirmed Order model missing before_photo_url/after_photo_url
- `apps/api/src/lib/socket.ts` — confirmed existing room structure (join:company, join:order)
- `apps/api/src/lib/r2.ts` — confirmed getSignedUploadUrl(), buildPhotoKey() with 60s TTL
- `apps/api/src/workers/order.worker.ts` — confirmed washer-response-timeout case already handles auto-decline
- `packages/types/src/order.ts` — confirmed OrderStatus enum and VALID_TRANSITIONS state machine

### Secondary (MEDIUM confidence)
- Socket.io docs (socket.io/docs/v4) — Redis adapter pubClient/subClient pattern
- Google Maps URL scheme docs — deep-link format for comgooglemaps:// and google.navigation:

### Tertiary (LOW confidence — not blocking)
- UI-SPEC interaction contract formulas (Haversine ETA, retry backoff) — defined by project decisions, not external verification needed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm view on 2026-04-03; already partially installed in package.json
- Architecture: HIGH — derived from existing code structure, established patterns, and UI-SPEC
- Schema gap (before/after photo columns): HIGH — directly verified by reading schema.prisma
- GPS background patterns: HIGH — confirmed by Expo docs and PITFALLS.md prior research
- Pitfalls: HIGH — majority sourced from PITFALLS.md which is itself HIGH confidence

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (Expo SDK releases frequently — re-verify expo-location API if SDK changes)

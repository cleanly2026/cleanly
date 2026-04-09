# Phase 3: Real-Time & Washer App - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 03-real-time-washer-app
**Areas discussed:** Washer job flow, GPS tracking UX, Photo evidence flow, Washer app overall

---

## Washer Job Flow

### Job Alert Style

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen takeover | Uber/Careem-style: entire screen becomes job alert with countdown ring, location preview, accept/decline buttons | ✓ |
| Push notification + banner | System push notification that opens bottom sheet when tapped. Less intrusive. | |
| In-app banner + sound | Persistent banner at top with sound/vibration. Tapping expands to details. | |

**User's choice:** Full-screen takeover
**Notes:** None

### Navigation After Accept

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-launch Maps | Immediately open Google Maps after accepting | |
| Show route preview first | In-app map with route/ETA, then "Navigate" button launches Maps | ✓ |
| You decide | Claude picks standard approach | |

**User's choice:** Show route preview first
**Notes:** None

### Timer Expiry Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-decline + reassign | Job goes to next washer. Missed job disappears. | |
| Auto-decline + offline | Same + sets washer to offline. Must manually go back online. | ✓ |
| You decide | Claude picks based on best practices | |

**User's choice:** Auto-decline + offline
**Notes:** None

---

## GPS Tracking UX

### Customer Map View

| Option | Description | Selected |
|--------|-------------|----------|
| Dot + ETA + washer name | Moving dot, live ETA, washer first name and photo. Uber-style. | ✓ |
| Dot + status only | Moving dot with status bar. No ETA. Simpler. | |
| Dot + ETA + route line | Full route polyline, moving dot, ETA. Most informative. | |

**User's choice:** Dot + ETA + washer name
**Notes:** None

### During In-Progress State

| Option | Description | Selected |
|--------|-------------|----------|
| Switch to status card | Replace map with service-in-progress card (washer name, service type, elapsed time, progress). | ✓ |
| Keep map visible | Keep showing stationary dot with overlay status card. | |
| You decide | Claude picks best UX pattern. | |

**User's choice:** Switch to status card
**Notes:** None

### Carpet Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Same map, different labels | Identical tracking UI with carpet-specific status labels. | ✓ |
| Simplified — just status updates | No live map. Push notifications at key milestones only. | |
| You decide | Claude picks for carpet flow. | |

**User's choice:** Same map, different status labels
**Notes:** None

---

## Photo Evidence Flow

### Camera UX

| Option | Description | Selected |
|--------|-------------|----------|
| In-app camera with overlay | Custom camera screen with frame/guideline overlay. More dev effort. | |
| System camera then review | Launch device camera, return to app to review/confirm before upload. | ✓ |
| You decide | Claude picks balancing quality and dev speed. | |

**User's choice:** System camera then review
**Notes:** None

### Upload Retry

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-retry with progress | Queue locally, auto-retry in background. Progress indicator. Can continue working. | ✓ |
| Manual retry button | Fail with "Retry" button. Must manually retry. | |
| You decide | Claude picks for unreliable networks. | |

**User's choice:** Auto-retry with progress
**Notes:** None

### Photo Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Hard gate — must upload | Cannot advance order without photos. Enforces evidence trail. | |
| Soft reminder | Prompt but allow skipping with reason. Review later. | ✓ |
| You decide | Claude picks for service quality. | |

**User's choice:** Soft reminder
**Notes:** None

---

## Washer App Overall

### Home Screen

| Option | Description | Selected |
|--------|-------------|----------|
| Map-centered with status | Full-screen map, online/offline toggle, earnings summary. Uber driver style. | |
| Dashboard with stats | Card-based: earnings, jobs completed, next job, online/offline toggle. | ✓ |
| You decide | Claude picks for mobile washer context. | |

**User's choice:** Dashboard with stats
**Notes:** None

### Service Checklist

| Option | Description | Selected |
|--------|-------------|----------|
| Step-by-step screens | Each item is own screen. Linear, guided. | |
| Single checklist page | All items on one page with checkboxes. Faster, flexible. | ✓ |
| You decide | Claude picks for cleaning domain. | |

**User's choice:** Single checklist page
**Notes:** None

### Job Completion Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Photo → checklist confirm → done | Sequential: photo prompt, checklist summary, confirm, complete. | ✓ |
| One-tap complete | Single button after photo. Minimal friction. | |
| You decide | Claude picks for quality vs speed. | |

**User's choice:** Photo → checklist confirm → done
**Notes:** None

---

## Claude's Discretion

- Map library choice (Google Maps, Mapbox, react-native-maps)
- Socket.io room design for washer GPS broadcasting
- GPS broadcast interval tuning (5-10s per RT-01)
- Redis caching strategy for washer locations (RT-05)
- Android Foreground Service implementation (WASH-04)
- Checklist items per service category
- ETA calculation approach
- Washer earnings display logic
- Photo compression before upload

## Deferred Ideas

None — discussion stayed within phase scope

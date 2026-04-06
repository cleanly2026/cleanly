---
status: partial
phase: 03-real-time-washer-app
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-08-SUMMARY.md, 03-09-SUMMARY.md]
started: 2026-04-05T10:00:00Z
updated: 2026-04-06T20:40:00Z
---

## Current Test

[testing paused — 15 items blocked by release-build requirement]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running API server. Run `pnpm dev` from scratch. Server boots without errors, Prisma migration applies cleanly, Socket.io initializes with Redis adapter, and a health check returns a live response.
result: issue
reported: "API crashed 3 times on cold start: (1) otplib v13 removed 'authenticator' export — SyntaxError, (2) STRIPE_SECRET_KEY missing crashed Stripe init at module level, (3) pino-pretty not installed. After fixes, server boots but Redis ETIMEDOUT for BullMQ queue and Socket.io Redis adapter."
severity: blocker

### 2. Washer Online/Offline Toggle
expected: On the washer home screen, tapping the toggle pill sends PATCH /api/washers/status and switches between online (gold) and offline states. Going offline shows a confirmation modal first. State persists across app restart (AsyncStorage).
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build to test on physical device."

### 3. Washer Home Dashboard
expected: Washer home screen shows an earnings card (navy background, gold amount), a jobs list or empty state when no jobs exist, and a skeleton loading state while data loads.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 4. Job Alert with Countdown Ring
expected: When a new job is assigned, a full-screen alert appears over the home screen. A gold SVG countdown ring decrements from 30 to 0 seconds. The center text updates every second. The ring turns warning orange at <10 seconds. Service details (icon, name, company, address, distance) are displayed.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 5. Job Alert Auto-Decline on Expiry
expected: If the washer does not tap Accept within 30 seconds, the alert auto-declines: emits job:decline via Socket.io, sets the washer offline (PATCH /api/washers/status), and navigates back to the home screen. No confirmation dialog shown.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 6. Accept Job → En Route Screen
expected: Tapping Accept triggers haptic feedback (success), navigates to the en route screen. The map shows both a navy customer pin and a pulsing gold washer pin. A straight-line polyline connects them. Map auto-fits to show both pins. The bottom sheet shows customer name, service type, and ETA calculated via Haversine at 30km/h.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 7. En Route Navigation Deep-Link
expected: Tapping "Navigate" on the en route screen opens Google Maps with the customer's coordinates pre-filled. On Android it uses google.navigation intent, on iOS it tries comgooglemaps:// with a web URL fallback.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 8. I've Arrived → Photo Upload
expected: Tapping "I've Arrived" sends PATCH /api/orders/:id/status with status 'in_progress' and navigates to the before-photo upload screen. GPS tracking continues (not stopped on arrival).
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 9. Photo Upload Flow
expected: The photo upload screen shows a camera capture UI. After taking a photo, it compresses (max 1200px, JPEG 0.8) and uploads to R2 via presigned URL. On upload failure, exponential backoff retry (2s→4s→8s, 3 attempts). A "Skip" option exists with a reason modal (poor signal / not needed). Upload success broadcasts the photo URL via Socket.io.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 10. Active Job Checklist with 80% Gate
expected: The active job screen shows a per-service checklist (car_wash: 6 items, sofa: 6 items). Each item has a 44px touch target. A progress bar fills as items are checked. The "Complete" / after-photo action is disabled until 80% of items are checked (5 of 6). An inline warning shows when attempting to proceed below threshold.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 11. Job Completion Flow
expected: After checklist + after-photo, the completion screen shows a 3-step flow: summary (order number CLN-XXXXXXXX, service details) → confirm → done. On confirm, GPS tracking stops (stopTracking called) and order status transitions to 'completed' via PATCH API. The washer returns to the home screen.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 12. Customer Live Tracking — Washer on Map
expected: On the customer tracking screen, the washer appears as an animated navy dot (32px circle, white border, Droplets icon) on the map. As GPS updates arrive every 5-10 seconds, the dot moves smoothly via AnimatedRegion interpolation (800ms). Map auto-fits to show both washer and customer pins on first update.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 13. Customer ETA Bottom Sheet
expected: A persistent bottom sheet shows washer name/avatar, a bilingual status label (e.g., "On the way" / "في الطريق"), and a gold ETA chip. ETA updates as the washer moves. When ETA drops below 2 minutes, it shows "Arriving now". For carpet orders, status labels correctly distinguish pickup vs return phase.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 14. Customer InProgressCard During Active Cleaning
expected: When the order transitions to in_progress, the map is replaced by a full-screen InProgressCard: navy background, washer avatar (64px), elapsed time updating every 30 seconds, an indeterminate looping gold progress ring (SVG), and reassurance text below.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 15. Customer Sees Real-Time Photos
expected: When the washer uploads a before or after photo, the customer tracking screen receives it via Socket.io (order:photo-uploaded event) and displays photo thumbnails. On the completion view, before and after photos show side-by-side with labels.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

### 16. Arabic RTL Layout
expected: Switching the app language to Arabic flips all layouts to RTL. All margins use marginStart/marginEnd (no left/right breakage). Horizontal rows reverse direction. Order numbers remain LTR in an isolated container. All UI text shows Arabic translations from the washer and tracking i18n namespaces.
result: blocked
blocked_by: release-build
reason: "Expo Go supports SDK 54, project requires SDK 55. Need EAS development build."

## Summary

total: 16
passed: 0
issues: 1
pending: 0
skipped: 0
blocked: 15

## Gaps

- truth: "API server boots from cold start without errors"
  status: fixed-inline
  reason: "3 crashes: (1) otplib v13 API change — fixed import, (2) Stripe top-level init without key — added lazy proxy, (3) pino-pretty missing — installed. Redis ETIMEDOUT is infrastructure (Upstash connectivity), not code."
  severity: blocker
  test: 1
  artifacts:
    - path: "apps/api/src/services/totp.service.ts"
      issue: "otplib v13 removed authenticator export — fixed to use generateSecret/generateURI/verifySync"
    - path: "apps/api/src/services/stripe.service.ts"
      issue: "Top-level Stripe init crashed without key — fixed with lazy Proxy"
    - path: "apps/api/package.json"
      issue: "pino-pretty missing from devDependencies — installed"
  missing: []

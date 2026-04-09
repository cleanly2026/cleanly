---
phase: 03-real-time-washer-app
plan: "09"
subsystem: customer-mobile
tags: [socket, real-time, photos, tracking]
dependency_graph:
  requires: ["03-08"]
  provides: ["photo-url-wiring"]
  affects: ["apps/customer-mobile/src/hooks/useOrderTracking.ts", "apps/customer-mobile/app/orders/[orderId]/tracking.tsx"]
tech_stack:
  added: []
  patterns: ["socket-event-to-hook-state", "hook-state-to-screen-destructure"]
key_files:
  modified:
    - apps/customer-mobile/src/hooks/useOrderTracking.ts
    - apps/customer-mobile/app/orders/[orderId]/tracking.tsx
decisions:
  - "pickup photo type maps to beforePhotoUrl (carpet model: pickup = before equivalent); return maps to afterPhotoUrl"
  - "Removed unused useState import from tracking.tsx after eliminating local photo state"
metrics:
  duration: "3min"
  completed: "2026-04-05"
  tasks: 1
  files: 2
requirements_closed: [RT-04, PHO-05, PHO-06, WASH-03, WASH-04, WASH-05]
---

# Phase 03 Plan 09: Photo URL Socket Wiring Summary

**One-liner:** Socket `order:photo-uploaded` event now populates `beforePhotoUrl`/`afterPhotoUrl` state in `useOrderTracking`, flowing real-time photo display to the customer tracking screen for both on-site (before/after) and carpet (pickup/return) order types.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire photo URLs through useOrderTracking hook and consume in tracking screen | 11339a6 | useOrderTracking.ts, tracking.tsx |

## What Was Built

**Root cause closed:** VERIFICATION.md gap 4 — `order:photo-uploaded` socket handler in `useOrderTracking` was a no-op. Photo state existed in `tracking.tsx` but was local and never populated.

**Changes made:**

1. `useOrderTracking.ts`:
   - Added `beforePhotoUrl: string | null` and `afterPhotoUrl: string | null` to `TrackingState` type
   - Added both fields initialized to `null` in `useState` initial value
   - Replaced the no-op `order:photo-uploaded` handler with a real `setState` call that maps:
     - `photoType === 'before'` or `photoType === 'pickup'` → `beforePhotoUrl`
     - `photoType === 'after'` or `photoType === 'return'` → `afterPhotoUrl`

2. `tracking.tsx`:
   - Removed local `useState<string | null>(null)` declarations for `beforePhotoUrl` and `afterPhotoUrl`
   - Removed unused `useState` from the React import
   - Added `beforePhotoUrl` and `afterPhotoUrl` to the destructured return of `useOrderTracking()`
   - Existing render JSX (photo thumbnails with Before/After labels) now correctly receives live data

## Decisions Made

- `pickup` maps to `beforePhotoUrl` and `return` maps to `afterPhotoUrl` — for carpet orders the pickup photo is the "before" equivalent and return photo is the "after" equivalent, consistent with the service model
- `useState` removed from import after eliminating all local state in the component

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 2 - Missing critical functionality] Removed unused `useState` import**
- **Found during:** Task 1
- **Issue:** After removing local `beforePhotoUrl`/`afterPhotoUrl` state, `useState` was no longer used in `tracking.tsx` — would cause a lint/compile warning
- **Fix:** Removed `useState` from the React import destructure
- **Files modified:** apps/customer-mobile/app/orders/[orderId]/tracking.tsx
- **Commit:** 11339a6

## Known Stubs

None — photo URLs are now fully wired from socket event through hook state into screen rendering.

## Self-Check

- [x] `useOrderTracking.ts` contains `beforePhotoUrl` in TrackingState type (line 12)
- [x] `useOrderTracking.ts` contains real `setState` handler body for `order:photo-uploaded`
- [x] `tracking.tsx` does NOT contain `setBeforePhotoUrl` or `setAfterPhotoUrl`
- [x] `tracking.tsx` destructures `beforePhotoUrl` and `afterPhotoUrl` from `useOrderTracking()`
- [x] Commit 11339a6 exists

## Self-Check: PASSED

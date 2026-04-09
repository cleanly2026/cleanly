---
phase: 03-real-time-washer-app
plan: 05
status: complete
started: 2026-04-03T15:40:00Z
completed: 2026-04-03T15:55:00Z
duration: 15min
tasks_completed: 2
tasks_total: 2
---

# Plan 03-05 Summary: Washer Active Job + Photo Upload + Completion

## What Was Built

Complete active job lifecycle screens: service checklist with 80% completion gate, photo upload with camera + retry + skip, and sequential job completion flow with GPS stop and order status transition.

## Tasks

### Task 1: ChecklistItem + PhotoUploader components
- Created `ChecklistItem.tsx` — 44px min touch target, RTL-aware row, navy checkmark on checked
- Created `PhotoUploader.tsx` — 5 states (initial/review/uploading/success/error), uses `usePhotoUpload` hook, skip option with reason modal (poor signal / not needed)

### Task 2: Active job, photo upload, and job completion screens
- Created `(photo)/upload.tsx` — renders PhotoUploader with dynamic instruction text per photoType + serviceType
- Created `(job)/active.tsx` — per-category checklist (car_wash: 6 items, sofa: 6 items), progress bar, elapsed time, 80% completion gate, inline warning
- Created `(job)/complete.tsx` — 3-step flow (summary → confirm → done), calls stopTracking() + PATCH /api/orders/:id/status { status: 'completed' }

## Key Files

### Created
- `apps/washer-mobile/src/components/ChecklistItem.tsx`
- `apps/washer-mobile/src/components/PhotoUploader.tsx`
- `apps/washer-mobile/app/(photo)/upload.tsx`
- `apps/washer-mobile/app/(job)/active.tsx`
- `apps/washer-mobile/app/(job)/complete.tsx`

## Decisions
- 80% checklist threshold = Math.ceil(items.length * 0.8) — 5 of 6 items for both car_wash and sofa
- Completion flow stops GPS before API call (fail-safe: GPS stops even if API fails)
- Order number displayed as CLN-{id.slice(0,8)} matching Phase 2 convention

## Self-Check: PASSED
- [x] ChecklistItem has 44px touch target and RTL support
- [x] PhotoUploader uses usePhotoUpload hook with all 5 states
- [x] Active job has per-category checklist with 80% gate
- [x] Completion calls stopTracking() and transitions order status
- [x] No marginLeft/marginRight in any file

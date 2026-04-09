---
phase: 03-real-time-washer-app
plan: "08"
subsystem: washer-mobile
tags: [auth, real-time, gps, wiring]
dependency_graph:
  requires:
    - 03-01 (washer-mobile scaffold)
    - 03-03 (useGpsTracking hook)
    - 03-05 (washer login — stores accessToken/userId in AsyncStorage)
  provides:
    - Real JWT tokens in all washer-mobile API calls
    - GPS userId sent in washer:join-order socket event
  affects:
    - apps/washer-mobile (all screens)
tech_stack:
  added: []
  patterns:
    - React Context for auth state (AuthContext/AuthProvider/useAuth)
    - AsyncStorage multi-read on mount for credential hydration
key_files:
  created:
    - apps/washer-mobile/src/contexts/AuthContext.tsx
  modified:
    - apps/washer-mobile/app/_layout.tsx
    - apps/washer-mobile/app/(home)/index.tsx
    - apps/washer-mobile/app/(job)/alert.tsx
    - apps/washer-mobile/app/(job)/en-route.tsx
    - apps/washer-mobile/app/(job)/complete.tsx
    - apps/washer-mobile/app/(photo)/upload.tsx
    - apps/washer-mobile/src/hooks/useGpsTracking.ts
decisions:
  - "AuthContext reads from AsyncStorage on mount without token refresh — refresh logic is a separate future concern"
  - "useGpsTracking accepts userId as optional param (default null) for backward compatibility"
  - "en-route.tsx navigation fixed from non-existent /(job)/before-photo to /(photo)/upload with photoType=before and nextRoute=/(job)/active"
metrics:
  duration: "3min"
  completed: "2026-04-05"
  tasks: 2
  files: 8
---

# Phase 03 Plan 08: Auth Token Wiring and GPS userId Fix Summary

**One-liner:** JWT auth tokens wired from AsyncStorage via AuthContext into all washer-mobile screens, and GPS join-order event extended with userId to unblock server-side socket routing.

## What Was Built

### Task 1: AuthContext and _layout.tsx wiring (commit b5e8619)

Created `apps/washer-mobile/src/contexts/AuthContext.tsx`:
- `AuthContextType` interface with `token`, `userId`, `isLoading`, `setAuth`, `clearAuth`
- `useAuth()` hook that throws if used outside `AuthProvider`
- `AuthProvider` reads `accessToken` and `userId` from AsyncStorage on mount via `Promise.all`
- `setAuth(accessToken, refreshToken, userId)` stores all three keys and updates state
- `clearAuth()` removes all three keys and resets state to null

Updated `apps/washer-mobile/app/_layout.tsx`:
- Imported `AuthProvider` from `../src/contexts/AuthContext`
- Wrapped `<Stack>` with `<AuthProvider>` so all screens have access to auth
- `'../src/lib/gps-task'` remains as the first import (required for background task registration)

### Task 2: Token stub replacement and GPS userId fix (commit 7293cf3)

Replaced all MOCK_TOKEN/empty token stubs across 5 screens:
- `(home)/index.tsx`: `useAuth()` provides `token` for stats fetch and `OnlineToggle` prop
- `(job)/alert.tsx`: `useAuth()` provides `token` for `useWasherSocket` and `setWasherOffline` API call
- `(job)/en-route.tsx`: `useAuth()` provides `token` and `userId`; handleArrived PATCH now executes with real JWT; navigation fixed from non-existent `/(job)/before-photo` to `/(photo)/upload` with `photoType: 'before'` and `nextRoute: '/(job)/active'`
- `(job)/complete.tsx`: `useAuth()` provides `token` for order PATCH and `userId` for GPS tracking
- `(photo)/upload.tsx`: `useAuth()` provides `token` for PhotoUploader presigned URL request

Fixed GPS userId gap in `useGpsTracking.ts`:
- Function signature: `useGpsTracking(userId: string | null = null)`
- Emit payload: `socket.emit('washer:join-order', { orderId, userId })` — server stores userId on socket so downstream `washer:location` events are broadcast to the correct rooms

## Verification Results

All 5 plan verifications passed:

1. `grep -rn "MOCK_TOKEN" apps/washer-mobile/` — zero matches
2. `grep -rn "const token = ''" apps/washer-mobile/` — zero matches
3. `grep -n "userId" apps/washer-mobile/src/hooks/useGpsTracking.ts` — userId in signature and emit payload
4. `grep -n "AuthProvider" apps/washer-mobile/app/_layout.tsx` — AuthProvider wraps Stack
5. `grep -rn "before-photo" apps/washer-mobile/app/` — only in a comment (no navigation to non-existent screen)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `useAuth` `setAuth`/`clearAuth` are defined but callers (login screen) are outside this plan's scope — washer login is in Phase 1. AuthContext reads what Phase 1 stored in AsyncStorage.
- Token refresh is explicitly deferred per plan instructions — AuthContext only reads the stored accessToken without refresh rotation.

## Self-Check: PASSED

Files created/modified:
- FOUND: apps/washer-mobile/src/contexts/AuthContext.tsx
- FOUND: apps/washer-mobile/app/_layout.tsx (AuthProvider wrapping)
- FOUND: apps/washer-mobile/src/hooks/useGpsTracking.ts (userId in emit)

Commits:
- b5e8619: feat(03-08): create AuthContext and wire AuthProvider into _layout.tsx
- 7293cf3: feat(03-08): replace all MOCK_TOKEN stubs with useAuth and fix GPS userId

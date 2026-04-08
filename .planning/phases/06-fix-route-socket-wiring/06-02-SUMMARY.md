---
phase: 06-fix-route-socket-wiring
plan: 02
subsystem: company-web
tags: [auth, socket, company-dashboard, real-time, jwt]
requirements: [COMP-05, COMP-06, ORD-02]

dependency_graph:
  requires: []
  provides:
    - auth-context: React context with JWT decode, companyId, localStorage persistence, socket lifecycle
    - socket-room-join: correct join:company event wiring matching server handler
    - auth-gate: login/MFA gate in main.tsx blocking dashboard access when unauthenticated
  affects:
    - apps/company-web/src/lib/auth-context.tsx
    - apps/company-web/src/main.tsx
    - apps/company-web/src/router.tsx
    - apps/company-web/src/hooks/useOrderSocket.ts
    - apps/company-web/src/lib/socket.ts

tech_stack:
  added: []
  patterns:
    - JWT client-side decode using atob() for companyId extraction — no /me endpoint
    - AuthProvider wraps BrowserRouter: auth state available before routing decisions
    - storedCompanyId pattern for socket reconnect room rejoin

key_files:
  created:
    - apps/company-web/src/lib/auth-context.tsx
  modified:
    - apps/company-web/src/main.tsx
    - apps/company-web/src/router.tsx
    - apps/company-web/src/hooks/useOrderSocket.ts
    - apps/company-web/src/lib/socket.ts

decisions:
  - decodeJwtPayload uses atob() — browser-native, zero dependencies, companyId comes from JWT payload.companyId
  - AuthProvider wraps BrowserRouter in main.tsx — required so useAuth is available inside AuthGate which uses useAuth before rendering AppRoutes
  - storedCompanyId in socket.ts — stores companyId module-level so reconnect handler can rejoin room without prop drilling
  - Removed emit('leave') from useOrderSocket cleanup — server has no leave handler; Socket.io auto-cleans rooms on disconnect

metrics:
  duration: 8min
  completed: 2026-04-09
  tasks_completed: 2
  files_modified: 5
---

# Phase 06 Plan 02: Company Auth Context + Socket Join Fix Summary

**One-liner:** JWT auth context with client-side companyId decode, auth-gated app shell, and corrected join:company socket event matching server handler.

## What Was Built

Wired the company-web auth layer and fixed the socket room join event mismatch that was blocking real-time order updates.

### Task 1 — Create auth context and wire login flow into app shell

Created `apps/company-web/src/lib/auth-context.tsx` — a React context that:
- Decodes `companyId` and `userId` from the JWT access token client-side using `atob()` (no `/me` endpoint required)
- Persists tokens to `localStorage` so `api.ts`'s `getAccessToken()` continues to work unchanged
- Connects the socket on login and on mount (if tokens exist from a previous session)
- Exports `AuthProvider` and `useAuth` hook

Updated `apps/company-web/src/main.tsx`:
- Added `AuthGate` component that shows `LoginPage` or `MfaPage` when not authenticated, `AppRoutes` when authenticated
- `AuthProvider` wraps `BrowserRouter` so `useAuth` is available inside `AuthGate`

Updated `apps/company-web/src/router.tsx`:
- Replaced `const companyId = 'TODO_FROM_AUTH'` with `const { companyId } = useAuth()`
- `companyId!` non-null assertion is safe — `AppRoutes` only renders when `isAuthenticated` is `true`

### Task 2 — Fix socket join event mismatch (INT-05) and connect with auth token

Fixed `apps/company-web/src/hooks/useOrderSocket.ts`:
- Changed `socket.emit('join', \`company:${companyId}\`)` to `socket.emit('join:company', { companyId, token })` to match server handler signature
- Removed `socket.emit('leave', ...)` on cleanup — server has no leave handler

Updated `apps/company-web/src/lib/socket.ts`:
- Added `storedCompanyId` module-level variable for reconnect room rejoin
- Handles already-connected case (skips reconnect, just re-joins room)
- On reconnect, `join:company` is re-emitted so room membership survives transient disconnects

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows wired. `companyId` flows from JWT decode through auth context to `OrderFeed` and `useOrderSocket`.

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | e85077f | feat(06-02): create auth context and wire login flow into app shell |
| Task 2 | 18f5c4a | fix(06-02): fix socket join event mismatch INT-05 and reconnect handling |

## Self-Check: PASSED

- [x] `apps/company-web/src/lib/auth-context.tsx` exists — FOUND
- [x] `apps/company-web/src/main.tsx` contains `AuthProvider` — FOUND
- [x] `apps/company-web/src/router.tsx` uses `useAuth().companyId` — FOUND
- [x] Zero `TODO_FROM_AUTH` matches in company-web — CONFIRMED
- [x] `join:company` event in both `useOrderSocket.ts` and `socket.ts` — CONFIRMED
- [x] Commits e85077f and 18f5c4a exist in git log — CONFIRMED

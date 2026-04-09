---
phase: 07-auth-guards-housekeeping
plan: "01"
subsystem: api-security, company-web-auth
tags: [auth, crash-fix, testing, route-guard]
dependency_graph:
  requires: []
  provides: [admin-exchange-503, auth-gate-test]
  affects: [apps/api/src/routes/auth/admin.ts, apps/company-web/src/components/AuthGate.tsx]
tech_stack:
  added: [vitest, "@testing-library/react", jsdom]
  patterns: [graceful-env-guard, lazy-secret-resolution, component-extraction]
key_files:
  created:
    - apps/api/src/routes/auth/__tests__/admin-exchange.test.ts
    - apps/company-web/src/components/AuthGate.tsx
    - apps/company-web/src/__tests__/auth-gate.test.tsx
  modified:
    - apps/api/src/routes/auth/admin.ts
    - apps/api/src/test-helpers/build-app.ts
    - apps/company-web/src/main.tsx
    - apps/company-web/package.json
    - apps/company-web/vite.config.ts
decisions:
  - "AuthGate extracted from main.tsx to components/AuthGate.tsx to enable isolated unit testing"
  - "buildTestApp validator fixed from () => ({ value: true }) to (data) => ({ value: data }) to preserve request body for POST routes"
  - "vitest + @testing-library/react added to company-web devDependencies — no testing framework existed before"
metrics:
  duration: "~10min"
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_changed: 8
requirements_closed: [AUTH-03, AUTH-04]
---

# Phase 7 Plan 01: Auth Guards & Housekeeping Summary

**One-liner:** Removed ADMIN_EXCHANGE_SECRET crash-risk non-null assertion with lazy 503 fallback, added AuthGate smoke tests using extracted component + vitest setup.

## Objective

Close AUTH-03/AUTH-04 gaps: fix the module-level `process.env.ADMIN_EXCHANGE_SECRET!` crash-risk and add regression tests for both the env guard and the existing AuthGate route protection.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix ADMIN_EXCHANGE_SECRET crash-risk assertion (D-02) | 976aa48 | admin.ts, admin-exchange.test.ts, build-app.ts |
| 2 | Add AuthGate smoke test for route guard verification (D-01) | 9aed0c1 | AuthGate.tsx, auth-gate.test.tsx, main.tsx, package.json, vite.config.ts |
| - | Update pnpm-lock.yaml | 2e56d9d | pnpm-lock.yaml |

## What Was Built

### Task 1: Admin Exchange Env Guard
- Removed `const EXCHANGE_SECRET = process.env.ADMIN_EXCHANGE_SECRET!` from module scope (crash-risk)
- Added lazy secret resolution inside the POST /exchange handler: reads env on each request
- Returns 503 Service Unavailable with warning log when secret is missing
- `verifyExchangeSignature` now accepts `secret` as an explicit parameter (no module-level closure)
- Integration test proves: 503 when env unset, 401 when env set but signature wrong

### Task 2: AuthGate Smoke Test
- Extracted `AuthGate` component from `main.tsx` to `src/components/AuthGate.tsx` (enables isolated testing)
- Updated `main.tsx` to import AuthGate from the new file (behavior unchanged)
- Added vitest + @testing-library/react + jsdom to company-web devDependencies
- Configured vitest jsdom environment in vite.config.ts
- Added `"test": "vitest run"` to company-web package.json
- Smoke test: unauthenticated state → LoginPage rendered, AppRoutes absent; authenticated state → AppRoutes rendered, LoginPage absent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed buildTestApp passthrough validator preserving request body**
- **Found during:** Task 1 — POST /exchange handler received `true` instead of parsed JSON body
- **Issue:** `setValidatorCompiler(() => () => ({ value: true }))` caused Fastify to replace `request.body` with `true` (the `value` property of the validator result). POST route handlers reading `request.body` would crash or get wrong values.
- **Fix:** Changed to `(data) => ({ value: data })` — preserves actual parsed body while still skipping Zod schema validation in test context.
- **Files modified:** `apps/api/src/test-helpers/build-app.ts`
- **Commit:** 976aa48
- **Impact:** Existing GET-based integration tests unaffected; POST route tests now work correctly.

**2. [Rule 2 - Missing Infrastructure] Added vitest test infrastructure to company-web**
- **Found during:** Task 2 — no testing framework existed in company-web
- **Fix:** Added vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom to devDependencies; configured jsdom environment in vite.config.ts; added test script.
- **Files modified:** `apps/company-web/package.json`, `apps/company-web/vite.config.ts`
- **Commit:** 9aed0c1

**3. [Rule 2 - Missing Structure] Extracted AuthGate to testable component file**
- **Found during:** Task 2 — AuthGate was an internal function in main.tsx with no export, making isolation impossible
- **Fix:** Moved AuthGate to `src/components/AuthGate.tsx` with named export; updated main.tsx import.
- **Files modified:** `apps/company-web/src/main.tsx`, `apps/company-web/src/components/AuthGate.tsx` (new)
- **Commit:** 9aed0c1

## Verification Results

```
# Task 1 tests
vitest run apps/api/src/routes/auth/__tests__/admin-exchange.test.ts
  ✓ returns 503 when ADMIN_EXCHANGE_SECRET is not set
  ✓ returns 401 when ADMIN_EXCHANGE_SECRET is set but signature is wrong
  2 passed

# Task 2 tests
vitest run apps/company-web/src/__tests__/auth-gate.test.tsx
  ✓ renders LoginPage when not authenticated
  ✓ renders AppRoutes when authenticated
  2 passed

# Non-null assertion gone
grep -rn "ADMIN_EXCHANGE_SECRET!" apps/api/src/ → no results
```

## Known Stubs

None. All functionality is wired with real behavior — no placeholder or stub data.

## Self-Check: PASSED

- apps/api/src/routes/auth/admin.ts: EXISTS, contains `reply.status(503)`, no `ADMIN_EXCHANGE_SECRET!`
- apps/api/src/routes/auth/__tests__/admin-exchange.test.ts: EXISTS, contains `503`
- apps/company-web/src/__tests__/auth-gate.test.tsx: EXISTS, contains `isAuthenticated: false` and `isAuthenticated: true`
- apps/company-web/src/components/AuthGate.tsx: EXISTS
- Commits 976aa48, 9aed0c1, 2e56d9d: VERIFIED in git log

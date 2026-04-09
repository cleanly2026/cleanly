---
phase: 01-foundation
plan: "06"
subsystem: auth
tags: [auth, otp, twilio, jwt, refresh-tokens, rate-limiting, washer-pin]
dependency_graph:
  requires: ["01-04", "01-05"]
  provides: ["phone-otp-auth", "washer-pin-auth", "refresh-token-rotation"]
  affects: ["02-booking", "customer-mobile", "washer-mobile"]
tech_stack:
  added: ["twilio@5.13.1", "bcryptjs@3.0.3", "@types/bcryptjs"]
  patterns: ["Twilio Verify API", "opaque refresh token + bcrypt hash in Redis", "per-phone rate limiting via @fastify/rate-limit config"]
key_files:
  created:
    - apps/api/src/services/otp.service.ts
    - apps/api/src/services/auth.service.ts
    - apps/api/src/services/otp.service.test.ts
    - apps/api/src/routes/auth/otp.ts
    - apps/api/src/routes/auth/washer.ts
  modified:
    - apps/api/src/server.ts
    - apps/api/package.json
    - pnpm-lock.yaml
decisions:
  - "Refresh token stored as bcrypt hash in Redis at rt:{userId} — single token per user, enables instant revocation on logout"
  - "Rate limit keyGenerator uses req.body.phone not req.ip — prevents distributed attacks while allowing shared IPs (NAT, corporate)"
  - "washer.ts uses findFirst (not findUnique) — role is not part of the phone unique constraint, findUnique requires unique field set"
  - "POST /auth/refresh decodes expired access token via jwt.decode (not verify) to extract userId for Redis lookup"
  - "Test mock pattern: shared mock objects (mockVerifications, mockVerificationChecks) rather than accessing constructor results array — works correctly with module-level Twilio instantiation"
metrics:
  duration: "5min"
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_created: 5
  files_modified: 3
---

# Phase 01 Plan 06: Phone OTP Auth + Washer PIN Auth Summary

Phone OTP auth with Twilio Verify, JWT + opaque refresh token rotation in Redis, and washer dual-factor OTP+PIN verification.

## What Was Built

### Task 1: OTP Service + Auth Service (TDD)

**apps/api/src/services/otp.service.ts** — Twilio Verify abstraction:
- `sendOtp(phone)` — calls Twilio Verify to dispatch SMS OTP, returns `{ success: false, error }` on Twilio failure (never throws)
- `verifyOtp(phone, code)` — checks verification status, returns `{ valid: check.status === 'approved' }`

**apps/api/src/services/auth.service.ts** — JWT + refresh token lifecycle:
- `createTokenPair(fastify, userId, role, companyId?)` — signs 15-min JWT, generates 64-char hex opaque refresh token, stores bcrypt hash at `rt:{userId}` in Redis with 2592000s (30-day) TTL
- `rotateRefreshToken(fastify, userId, role, oldToken)` — validates hash, atomically deletes old key, issues new pair; returns `null` if token not found or invalid (never throws)
- `revokeRefreshToken(userId)` — DEL `rt:{userId}` for logout

**apps/api/src/services/otp.service.test.ts** — 4 vitest unit tests, all green:
- sendOtp success path
- sendOtp error path (no-throw verified)
- verifyOtp approved status
- verifyOtp pending status (returns valid:false)

### Task 2: Auth Routes + Server Registration

**apps/api/src/routes/auth/otp.ts** — Customer phone OTP routes:
- `POST /auth/otp/send` — rate-limited 3 requests/phone/15min (AUTH-07), calls sendOtp, returns `{ success: true }` or 503
- `POST /auth/otp/verify` — verifies OTP, upserts customer user via Prisma, returns `{ accessToken, refreshToken }`
- `POST /auth/refresh` — decodes (not verifies) expired access token to extract userId, calls rotateRefreshToken, returns new token pair

**apps/api/src/routes/auth/washer.ts** — Washer dual-factor route:
- `POST /auth/washer/verify` — requires valid OTP AND valid 4-digit bcrypt PIN; returns 401 on either failure

**apps/api/src/server.ts** — route registration added:
```typescript
await server.register(otpRoutes, { prefix: '/auth/otp' })
await server.register(washerRoutes, { prefix: '/auth/washer' })
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Twilio mock test pattern**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Plan's test used `(Twilio as ReturnType<typeof vi.fn>).mock.results[0].value` to access the mock client, but this fails because the Twilio constructor is called once at module load time, not per-test. `clearAllMocks()` resets the results array, causing all tests after the first to fail with "Cannot read properties of undefined (reading 'value')".
- **Fix:** Extracted `mockVerifications` and `mockVerificationChecks` as shared module-level mock objects, referenced directly in tests without going through constructor results array.
- **Files modified:** apps/api/src/services/otp.service.test.ts
- **Commit:** f17b60a

**2. [Rule 1 - Bug] Fixed washer findUnique → findFirst**
- **Found during:** Task 2 implementation review
- **Issue:** `prisma.user.findUnique({ where: { phone, role: 'washer' } })` is invalid — Prisma only accepts unique field combinations in `findUnique.where`. The `role` field is not part of a unique constraint with `phone`.
- **Fix:** Changed to `findFirst({ where: { phone, role: 'washer' } })` which accepts arbitrary filter conditions.
- **Files modified:** apps/api/src/routes/auth/washer.ts
- **Commit:** d61d24f

## Success Criteria Verification

- [x] Customer can POST /auth/otp/send — Twilio sendOtp called
- [x] Customer can POST /auth/otp/verify — JWT + refresh token pair returned
- [x] 4th OTP send returns 429 — rate limit max: 3, timeWindow: '15 minutes', keyed by phone
- [x] Washer POST /auth/washer/verify fails with wrong PIN — bcrypt.compare returns false → 401
- [x] Refresh token stored in Redis as rt:{userId} with 30-day TTL — confirmed in auth.service.ts

## Commits

| Hash | Task | Description |
|------|------|-------------|
| f17b60a | Task 1 | feat(01-06): OTP service (Twilio abstraction) and auth service (refresh token rotation) |
| d61d24f | Task 2 | feat(01-06): OTP auth routes, washer PIN route, and server registration |

## Self-Check: PASSED

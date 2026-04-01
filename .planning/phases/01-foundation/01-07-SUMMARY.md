---
phase: 01-foundation
plan: "07"
subsystem: authentication
tags: [auth, totp, mfa, google-sso, jwt, company-admin, platform-admin]
dependency_graph:
  requires: ["01-04", "01-05", "01-06"]
  provides: ["company-auth", "admin-auth", "totp-service", "jwt-exchange"]
  affects: ["admin-web", "api-auth"]
tech_stack:
  added: ["otplib", "qrcode", "next-auth@4"]
  patterns: ["two-step-mfa", "pre-mfa-session-token", "hmac-jwt-exchange", "timing-safe-compare"]
key_files:
  created:
    - apps/api/src/services/totp.service.ts
    - apps/api/src/routes/auth/company.ts
    - apps/api/src/routes/auth/admin.ts
    - apps/admin-web/auth.ts
    - apps/admin-web/middleware.ts
    - apps/admin-web/app/api/auth/[...nextauth]/route.ts
  modified:
    - apps/api/src/server.ts
    - apps/admin-web/package.json
decisions:
  - "Used otplib v13.4.0 instead of speakeasy (unmaintained since 2019) for TOTP"
  - "HMAC-SHA256 signature exchange pattern prevents admin-web Auth.js session from leaking directly to Fastify"
  - "Pre-MFA session token (5min TTL in Redis) prevents replay — single-use deletion on success"
  - "Timing-safe bcrypt compare runs even when user not found to prevent email enumeration timing attacks"
  - "next-auth v4 used for admin-web (NextAuth v4.24.13 compatible with Next.js 15)"
metrics:
  duration: "10min"
  completed: "2026-04-01"
  tasks: 2
  files: 8
---

# Phase 01 Plan 07: Company Admin TOTP MFA and Platform Admin Google SSO Summary

Company admin two-step login (email+bcrypt password + otplib TOTP MFA) and platform admin Google SSO restricted to @cleanly.ae domain, exchanging Auth.js sessions for Fastify JWTs via HMAC-SHA256.

## What Was Built

### Task 1: Company Admin email + bcrypt + TOTP MFA Routes

**apps/api/src/services/totp.service.ts** — TOTP service using `otplib` (not speakeasy):
- `generateTotpSecret()` — creates base32 secret for Google Authenticator enrollment
- `generateTotpQrCode(email, secret)` — generates QR code data URL for TOTP setup
- `verifyTotpToken(token, secret)` — verifies 6-digit TOTP code with clock-skew tolerance

**apps/api/src/routes/auth/company.ts** — Two-step company admin login:
- `POST /auth/company/login` — email + password step; rate-limited (10/email/15min); timing-safe bcrypt compare (runs even when user not found to prevent timing attacks); returns pre-MFA session token if TOTP enabled, or full JWT pair if TOTP not configured
- `POST /auth/company/mfa` — TOTP verification step; consumes pre-MFA Redis key (single-use, 5min TTL); issues full JWT + refresh token pair on success

### Task 2: Platform Admin Google SSO and JWT Exchange Endpoint

**apps/admin-web/auth.ts** — NextAuth v4 config:
- Google provider with `@cleanly.ae` domain restriction enforced in `signIn` callback
- Logs and rejects any non-cleanly.ae email attempt with warning

**apps/admin-web/app/api/auth/[...nextauth]/route.ts** — Next.js App Router handler for NextAuth routes

**apps/admin-web/middleware.ts** — Route protection middleware:
- Redirects unauthenticated requests to `/auth/signin` with `callbackUrl`
- Passes all `/auth/*` and static asset routes through

**apps/api/src/routes/auth/admin.ts** — JWT exchange endpoint:
- `POST /auth/admin/exchange` — validates HMAC-SHA256 signature (timingSafeEqual) before issuing Fastify JWT
- Zod schema enforces `@cleanly.ae` email constraint at input validation layer
- Upserts admin user record on first successful exchange

**apps/api/src/server.ts** — All 4 auth paths now registered:
- `/auth/otp` — customer phone OTP (Plan 06)
- `/auth/washer` — washer OTP + PIN (Plan 06)
- `/auth/company` — company admin email + TOTP MFA (Plan 07)
- `/auth/admin` — platform admin Google SSO exchange (Plan 07)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 06 auth.service.ts was missing when Plan 07 started**
- **Found during:** Task 1 setup
- **Issue:** Plan 07 depends on `auth.service.ts` (createTokenPair, revokeRefreshToken) from Plan 06. Plan 06 was executed by a parallel agent — its files were committed before this agent started.
- **Fix:** No fix needed — parallel agent had already committed plan 06 services before plan 07 execution began. Files were present when needed.
- **Outcome:** Normal parallel execution — no actual blocking occurred.

**2. [Rule 1 - Bug] Prisma findUnique with role filter requires findFirst**
- **Found during:** Task 1 (company.ts)
- **Issue:** `prisma.user.findUnique({ where: { email, role: 'company_member' } })` would fail — unique constraint is on email alone, not email+role. Prisma requires findFirst for compound non-unique filters.
- **Fix:** Used `prisma.user.findFirst({ where: { email, role: 'company_member' } })` in company.ts login route.
- **Files modified:** apps/api/src/routes/auth/company.ts

**3. [Rule 2 - Security] timingSafeEqual buffer length mismatch protection**
- **Found during:** Task 2 (admin.ts)
- **Issue:** `crypto.timingSafeEqual` throws if buffers have different lengths. If the incoming signature is not exactly 64 chars, the comparison would throw rather than return false.
- **Fix:** Added safe buffer handling with `padEnd(64, '0').slice(0, 64)` before comparison. The Zod schema also validates `z.string().length(64)` so invalid-length signatures are rejected at schema validation before reaching the comparison.
- **Files modified:** apps/api/src/routes/auth/admin.ts

## Auth Gates (User Setup Required)

The following credentials must be configured before auth flows work end-to-end:

| Service | Env Var | Where to Get |
|---------|---------|--------------|
| Google OAuth | `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |
| Google OAuth | `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials → OAuth Client Secret |
| NextAuth | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| NextAuth | `NEXTAUTH_URL` | App URL (e.g., http://localhost:3003) |
| JWT Exchange | `ADMIN_EXCHANGE_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

OAuth redirect URI to add in Google Cloud Console: `{NEXTAUTH_URL}/api/auth/callback/google`

## Known Stubs

None. All auth endpoints are fully wired. TOTP secret generation/enrollment endpoint is not in scope for this plan (company admin onboarding is Phase 2) — `generateTotpSecret()` and `generateTotpQrCode()` are exported but not yet registered as routes.

## Self-Check: PASSED

Files verified present:
- apps/api/src/services/totp.service.ts: FOUND
- apps/api/src/routes/auth/company.ts: FOUND
- apps/api/src/routes/auth/admin.ts: FOUND
- apps/admin-web/auth.ts: FOUND
- apps/admin-web/middleware.ts: FOUND
- apps/admin-web/app/api/auth/[...nextauth]/route.ts: FOUND

Commits verified:
- 9abc890: feat(01-07): company admin email+bcrypt+TOTP MFA routes
- 667122d: feat(01-07): platform admin Google SSO with JWT exchange endpoint

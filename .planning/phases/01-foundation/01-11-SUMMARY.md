---
phase: 01-foundation
plan: "11"
subsystem: auth
tags: [react, next-intl, otp, google-sso, totp, vite, auth-screens]

# Dependency graph
requires:
  - phase: 01-06
    provides: Fastify OTP auth endpoints (POST /auth/otp/send, /auth/otp/verify)
  - phase: 01-07
    provides: Company auth endpoints (POST /auth/company/login, /auth/company/mfa) and admin Auth.js Google SSO
  - phase: 01-10
    provides: UI components (OtpInput, PhoneInput, AuthCard, LanguageToggle, PinInput)
provides:
  - Customer web phone OTP entry screen calling /auth/otp/send
  - Customer web OTP verification screen calling /auth/otp/verify with countdown timer
  - Company web email+password login form calling /auth/company/login
  - Company web TOTP MFA challenge screen calling /auth/company/mfa
  - Platform admin Google SSO sign-in page using next-auth signIn('google')
  - Auth client libraries for customer-web and company-web (type-safe fetch wrappers)
affects: [02-customer-booking, 02-company-dashboard, 02-admin-panel]

# Tech tracking
tech-stack:
  added: []
  patterns: [auth-client fetch wrapper pattern, countdown timer with useEffect cleanup, URL-encoded phone forwarding between auth screens]

key-files:
  created:
    - apps/customer-web/src/lib/auth-client.ts
    - apps/customer-web/app/[locale]/auth/layout.tsx
    - apps/customer-web/app/[locale]/auth/page.tsx
    - apps/customer-web/app/[locale]/auth/verify/page.tsx
    - apps/company-web/src/lib/auth-client.ts
    - apps/company-web/src/pages/auth/LoginPage.tsx
    - apps/company-web/src/pages/auth/MfaPage.tsx
    - apps/admin-web/app/[locale]/auth/signin/page.tsx
  modified: []

key-decisions:
  - "Company web uses hardcoded English strings for Phase 1 scaffold (TODO: wire i18next in Phase 2 when company dashboard is fully built)"
  - "Phone number passed via URL search param from entry to verify screen for seamless flow"

patterns-established:
  - "Auth client pattern: type-safe fetch wrappers returning { success/error } or { accessToken/refreshToken/error } with specific error codes (rate_limited, invalid_otp, wrong_credentials, network)"
  - "Auth screen gold CTA pattern: bg-brand-gold text-brand-navy with min-h-[44px] touch target"
  - "OTP countdown pattern: useEffect with cleanup timeout, color shift at 30s threshold"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-06]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 01 Plan 11: Auth Screen Integration Summary

**Auth screens for all 3 surfaces: customer phone OTP with countdown timer, company email+password+TOTP MFA, and admin Google SSO -- all calling Fastify API endpoints via type-safe fetch wrappers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T07:52:57Z
- **Completed:** 2026-04-01T07:55:34Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Customer web auth flow: phone entry screen (PhoneInput + AuthCard) and OTP verification screen (OtpInput + countdown timer + resend) with full i18n via next-intl
- Company admin auth flow: email+password login form with timing-safe error messages and TOTP MFA challenge screen
- Platform admin Google SSO: single "Continue with Google" button using next-auth signIn with i18n labels
- Auth client libraries for both customer-web (Next.js) and company-web (Vite) with proper environment variable patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Customer web auth screens (phone OTP entry + code verification)** - `9602257` (feat)
2. **Task 2: Company admin and platform admin auth screens** - `c4be6e3` (feat)

## Files Created/Modified
- `apps/customer-web/src/lib/auth-client.ts` - Type-safe sendOtp/verifyOtp fetch wrappers with 971 country code prepend
- `apps/customer-web/app/[locale]/auth/layout.tsx` - Auth layout with LanguageToggle in top bar
- `apps/customer-web/app/[locale]/auth/page.tsx` - Phone number entry with PhoneInput, gold CTA, loading spinner
- `apps/customer-web/app/[locale]/auth/verify/page.tsx` - OTP code entry with countdown timer, resend logic, token storage
- `apps/company-web/src/lib/auth-client.ts` - companyLogin/verifyMfa fetch wrappers for Vite SPA (import.meta.env)
- `apps/company-web/src/pages/auth/LoginPage.tsx` - Email+password form with timing-safe error messages
- `apps/company-web/src/pages/auth/MfaPage.tsx` - 6-digit TOTP input with back navigation
- `apps/admin-web/app/[locale]/auth/signin/page.tsx` - Google SSO with signIn('google') and i18n labels

## Decisions Made
- Company web uses hardcoded English strings for Phase 1 scaffold -- i18next will be wired in Phase 2 when company dashboard is fully built (Vite SPA does not use next-intl)
- Phone number passed via URL search param between auth entry and verify screens for seamless UX flow

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `apps/company-web/src/pages/auth/LoginPage.tsx` - Hardcoded English strings (TODO Phase 2: replace with i18next t() calls). Intentional: company-web Vite SPA does not have i18next wired yet in Phase 1.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All auth UI screens ready for end-to-end testing once API server is running
- Customer web auth flow is fully bilingual (AR/EN) via next-intl
- Company web auth needs i18next integration in Phase 2
- Token storage uses localStorage -- will need httpOnly cookie approach for production security hardening

## Self-Check: PASSED

All 8 files exist. Both commit hashes (9602257, c4be6e3) verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-04-01*

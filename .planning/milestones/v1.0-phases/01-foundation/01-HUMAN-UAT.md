---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-01T08:15:00Z
updated: 2026-04-01T08:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Tailwind brand styling renders correctly
expected: Navy background (bg-brand-navy), gold CTA buttons (bg-brand-gold), Cairo font active on auth screens
result: [pending]

### 2. Customer phone OTP end-to-end flow
expected: Enter UAE phone at /en/auth, receive SMS via Twilio, enter 6-digit code, get JWT stored in localStorage
result: [pending]

### 3. Company admin email + TOTP MFA flow
expected: Login with email+password, advance to TOTP screen, enter authenticator code, receive tokens
result: [pending]

### 4. Admin Google SSO domain restriction
expected: Google OAuth completes for @cleanly.ae, rejects non-@cleanly.ae emails
result: [pending]

### 5. Arabic RTL visual layout inspection
expected: /ar/auth renders RTL (text right-aligned, layout mirrored), Cairo font active, zero hardcoded English strings
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

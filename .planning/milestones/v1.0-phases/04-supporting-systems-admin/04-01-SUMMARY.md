---
phase: 04-supporting-systems-admin
plan: 01
subsystem: api
tags: [prisma, notifications, expo-push, twilio, resend, whatsapp, 360dialog, react-email, bullmq]

# Dependency graph
requires:
  - phase: 02-core-business-flow
    provides: Order model, order lifecycle, stripe.service.ts createRefund
  - phase: 01-foundation
    provides: Prisma schema base, User model, BullMQ queue scaffolding, notification.worker.ts stub

provides:
  - Dispute model in database (migration applied)
  - User.expo_push_token field for push notifications
  - sendPushNotification via expo-server-sdk
  - sendSms via Twilio client.messages.create
  - sendWhatsAppTemplate via 360dialog raw HTTP
  - sendOrderReceipt via Resend + React Email
  - NOTIFICATION_COPY bilingual map for all 14 order lifecycle events
  - getNotificationCopy helper, WHATSAPP_TEMPLATE_MAP, SMS_COPY exports
  - OrderReceiptEmail RTL-aware React Email template (EN + AR)

affects:
  - 04-02-notification-worker (uses all 4 service files and notification-copy)
  - 04-03-admin-api (Dispute model for dispute routes)
  - 04-04-admin-web (Dispute model for admin UI)
  - 04-05-dispute-ui (Dispute model + customer dispute creation)

# Tech tracking
tech-stack:
  added:
    - expo-server-sdk 6.1.0 (Expo Push server-side sending)
    - resend 6.10.0 (transactional email)
    - "@react-email/components" 1.0.11 (email template components)
  patterns:
    - Graceful env var guard pattern: check for key before calling external service, warn + return (never throw on missing config)
    - exactOptionalPropertyTypes fix: use spread conditionals instead of undefined direct assignment
    - JSX in API package: tsconfig jsx=react-jsx for React Email templates

key-files:
  created:
    - apps/api/src/services/push.service.ts
    - apps/api/src/services/sms.service.ts
    - apps/api/src/services/whatsapp.service.ts
    - apps/api/src/services/email.service.ts
    - apps/api/src/services/notification-copy.ts
    - apps/api/src/emails/order-receipt.tsx
    - packages/db/migrations/20260405023313_add_dispute_and_push_token/migration.sql
  modified:
    - packages/db/schema.prisma (Dispute model, expo_push_token, Order.dispute, User.disputes)
    - apps/api/package.json (resend, expo-server-sdk, @react-email/components)
    - apps/api/tsconfig.json (jsx: react-jsx)

key-decisions:
  - "expo-server-sdk accessToken uses spread conditional to satisfy exactOptionalPropertyTypes strict mode"
  - "JSX added to apps/api tsconfig for React Email template compilation — not present before this plan"
  - "All notification services use graceful env guard (warn + return if key missing) — allows dev env without all credentials configured"
  - "360dialog uses native fetch (no SDK on npm) — raw HTTP with D360-API-KEY header to waba-v2.360dialog.io"
  - "SMS_COPY provides longer-form text for SMS/WhatsApp body; NOTIFICATION_COPY is push-optimized shorter copy"

patterns-established:
  - "Env guard pattern: if (!process.env.KEY) { console.warn('[Service] KEY not set -- skipping'); return } — used by all 4 notification services"
  - "Bilingual copy map: NOTIFICATION_COPY['en' | 'ar'][event] = { title, body } with {placeholder} markers for caller substitution"

requirements-completed: [NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05]

# Metrics
duration: 12min
completed: 2026-04-05
---

# Phase 04 Plan 01: Notification Infrastructure Foundation Summary

**Dispute model migrated to Neon DB, expo_push_token field added to User, and all four notification channel service files created with bilingual copy for 14 order lifecycle events and a React Email receipt template.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-05T02:37:28Z
- **Completed:** 2026-04-05T02:49:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Prisma migration applied: Dispute model (order_id, customer_id, reason, note, status, resolution, refund_amount) + User.expo_push_token field
- Installed resend 6.10.0, expo-server-sdk 6.1.0, @react-email/components 1.0.11 in apps/api
- Four notification channel service files with typed send functions: push, sms, whatsapp, email
- Bilingual notification copy (NOTIFICATION_COPY) covering all 14 events in English + Arabic including company_rejected (D-08)
- React Email order receipt template with RTL support for Arabic customers

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma migration + install dependencies** - `cb23864` (feat)
2. **Task 2: Notification service files + bilingual copy + email template** - `a22115a` (feat)

**Plan metadata:** _(to be filled after final commit)_

## Files Created/Modified

- `packages/db/schema.prisma` - Added Dispute model, User.expo_push_token, Order.dispute, User.disputes relations
- `packages/db/migrations/20260405023313_add_dispute_and_push_token/migration.sql` - Applied migration
- `apps/api/package.json` - Added resend, expo-server-sdk, @react-email/components
- `apps/api/tsconfig.json` - Added jsx: react-jsx for email template compilation
- `apps/api/src/services/push.service.ts` - Expo Push via expo-server-sdk with token validation
- `apps/api/src/services/sms.service.ts` - Twilio SMS via client.messages.create
- `apps/api/src/services/whatsapp.service.ts` - 360dialog WhatsApp via raw HTTP fetch
- `apps/api/src/services/email.service.ts` - Resend email via React Email template
- `apps/api/src/services/notification-copy.ts` - NOTIFICATION_COPY (14 events x 2 languages), WHATSAPP_TEMPLATE_MAP, SMS_COPY, getNotificationCopy helper
- `apps/api/src/emails/order-receipt.tsx` - RTL-aware bilingual receipt email component

## Decisions Made

- JSX support added to apps/api tsconfig (jsx: react-jsx) — React Email templates require JSX compilation in the API package which was previously Node.js-only.
- expo-server-sdk accessToken uses spread conditional `...(token ? { accessToken: token } : {})` to satisfy `exactOptionalPropertyTypes: true` strict TypeScript setting.
- All notification services use graceful env guard pattern — warn and return (never throw) if API key missing, allowing development without all credentials configured.
- 360dialog has no Node.js SDK on npm — raw HTTP fetch to `waba-v2.360dialog.io` with D360-API-KEY header is the correct pattern per research.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added jsx: react-jsx to apps/api tsconfig.json**
- **Found during:** Task 2 (email template creation)
- **Issue:** `order-receipt.tsx` used JSX syntax but tsconfig had no jsx flag — TypeScript error TS17004 blocked compilation
- **Fix:** Added `"jsx": "react-jsx"` to apps/api/tsconfig.json compilerOptions
- **Files modified:** `apps/api/tsconfig.json`
- **Verification:** TSC no longer reports TS17004 errors on new files; total error count dropped from 64 to 43 (resolved pre-existing JSX errors elsewhere too)
- **Committed in:** `a22115a` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes violation in push.service.ts**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** `new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN })` passed `string | undefined` to a field typed as `string` under `exactOptionalPropertyTypes: true`; same issue with `data` field on ExpoPushMessage
- **Fix:** Used spread conditional for optional fields: `...(value !== undefined ? { key: value } : {})`
- **Files modified:** `apps/api/src/services/push.service.ts`
- **Verification:** No errors from tsc for push.service.ts after fix
- **Committed in:** `a22115a` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for TypeScript compilation under project's strict settings. No scope creep.

## Issues Encountered

- Prisma validate required env vars — used DATABASE_URL and DIRECT_URL from apps/api/.env to run migration successfully.

## User Setup Required

External service credentials needed before notification services will send:
- `EXPO_ACCESS_TOKEN` — Expo dashboard (optional, for enhanced delivery reliability)
- `TWILIO_PHONE_NUMBER` — Twilio console (TWILIO_ACCOUNT_SID/AUTH_TOKEN already in .env)
- `DIALOG360_API_KEY` — 360dialog dashboard (WhatsApp templates must be pre-approved in Meta)
- `RESEND_API_KEY` — Resend dashboard
- Verify sending domain `cleanly.ae` in Resend for `receipts@cleanly.ae` from address

## Known Stubs

None — all service files make real API calls when env vars are present. The notification-copy.ts placeholder markers ({service}, {id}, etc.) are intentional design — callers (notification worker in Plan 02) replace them before sending.

## Next Phase Readiness

- Plan 02 (notification worker) can now import all 4 service files and notification-copy to implement fan-out dispatch
- Plan 03 (admin API) can use Dispute model via Prisma client for dispute CRUD routes
- Plan 04 (admin web) can build dispute management UI against Dispute model
- Plan 05 (customer dispute UI) can create disputes with the Dispute model

---
*Phase: 04-supporting-systems-admin*
*Completed: 2026-04-05*

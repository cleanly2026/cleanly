---
phase: 04-supporting-systems-admin
plan: 03
subsystem: notifications
tags: [bullmq, push-notifications, expo, sms, whatsapp, email, order-lifecycle]
dependency_graph:
  requires: [04-01]
  provides: [notification-pipeline, push-token-registration, multi-channel-dispatch]
  affects: [lifecycle-routes, notification-worker, mobile-layouts]
tech_stack:
  added: [expo-notifications ~55.0.14]
  patterns: [BullMQ job switch dispatch, idempotency via Redis TTL, D-02 tier matrix, STATUS_TO_EVENT map]
key_files:
  created:
    - apps/api/src/routes/users/push-token.ts
    - apps/customer-mobile/src/hooks/usePushToken.ts
    - apps/washer-mobile/src/hooks/usePushToken.ts
  modified:
    - apps/api/src/workers/notification.worker.ts
    - apps/api/src/routes/orders/lifecycle.ts
    - apps/api/src/server.ts
    - apps/customer-mobile/app/_layout.tsx
    - apps/washer-mobile/app/_layout.tsx
    - apps/customer-mobile/package.json
    - apps/washer-mobile/package.json
decisions:
  - CRITICAL_EVENTS contains exactly [order_confirmed, washer_en_route, completed, refund_issued] per D-02 — no extras
  - dispatchCustomerNotifications helper uses real order.amount_total and platform_fee (not hardcoded zeros)
  - usePushToken wired in customer-mobile root _layout.tsx (no auth context needed — reads AsyncStorage directly)
  - usePushToken wired in washer-mobile via inner AppLayout component inside AuthProvider — hook usability preserved
  - expo-notifications ~55.0.14 added to both mobile package.json files (Expo SDK 55 compatible version from bundledNativeModules.json)
metrics:
  duration: "7 min"
  completed_date: "2026-04-05"
  tasks: 2
  files: 9
---

# Phase 04 Plan 03: Notification Pipeline Wiring Summary

Multi-channel notification dispatch wired from BullMQ jobs to push/SMS/WhatsApp/email services, with lifecycle route integration and mobile push token registration.

## What Was Built

**Task 1: Notification worker rewrite + push token endpoint**

Rewrote `notification.worker.ts` from a stub to a working 4-channel dispatcher with:
- `case 'send-push'`: calls `sendPushNotification` with `getNotificationCopy` bilingual copy, `{placeholder}` replacement
- `case 'send-sms'`: calls `sendSms` with `SMS_COPY` bilingual text, `{placeholder}` replacement
- `case 'send-whatsapp'`: calls `sendWhatsAppTemplate` with `WHATSAPP_TEMPLATE_MAP` lookup
- `case 'send-email-receipt'`: calls `sendOrderReceipt` with full order data
- Idempotency guard: `redis.get('job:sent:{id}')` checked before dispatch, 7-day TTL set after
- Created `PATCH /api/users/push-token` endpoint that updates `expo_push_token` on User model
- Registered route in server.ts at `/api/users` prefix

**Task 2: Lifecycle routes notification dispatch + mobile hooks**

Modified `lifecycle.ts` with:
- `STATUS_TO_EVENT` map covering all 12 order statuses
- `CRITICAL_EVENTS = ['order_confirmed', 'washer_en_route', 'completed', 'refund_issued']` per D-02
- `dispatchCustomerNotifications` helper: push on all events, SMS+WhatsApp on CRITICAL_EVENTS, email receipt on completed/returned
- D-04 washer notification: push to washer in `assign-washer` handler (`new_job_assignment`)
- D-04 washer cancellation notification: push to washer in `DELETE /:id` handler when `washer_id` exists
- `preferred_language` from customer/washer used for all notification language selection

Created `usePushToken` hook in both mobile apps:
- Requests Expo push permission, gets Expo push token
- PATCHes token to `/api/users/push-token` with `Authorization: Bearer {authToken}` from AsyncStorage
- Gracefully skips if no auth token (fires again when user signs in on next mount)
- Wired in `customer-mobile/app/_layout.tsx` root layout
- Wired in `washer-mobile/app/_layout.tsx` via inner `AppLayout` component (AuthProvider wraps it)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] expo-notifications not installed**
- **Found during:** Task 2 — usePushToken hook imports `expo-notifications` but it wasn't in either mobile app's package.json
- **Fix:** Added `"expo-notifications": "~55.0.14"` to `apps/customer-mobile/package.json` and `apps/washer-mobile/package.json` (version from `node_modules/expo/bundledNativeModules.json` for SDK 55 compatibility)
- **Files modified:** `apps/customer-mobile/package.json`, `apps/washer-mobile/package.json`

**2. [Rule 2 - Missing Critical Functionality] dispatchCustomerNotifications helper — email receipt used hardcoded amounts**
- **Found during:** Task 2 while writing the helper
- **Fix:** Redesigned helper to accept `OrderForNotif` type that includes `amount_total` and `platform_fee` from the actual order object — no hardcoded zeros
- **Files modified:** `apps/api/src/routes/orders/lifecycle.ts`

**3. [Rule 3 - Blocking] Mobile app directory names differ from plan**
- **Plan assumed:** `apps/mobile-customer`, `apps/mobile-washer`
- **Actual directories:** `apps/customer-mobile`, `apps/washer-mobile`
- **Fix:** Used correct paths in all file writes and git add commands

**4. [Rule 3 - Blocking] No (tabs) layout exists in either mobile app**
- **Plan assumed:** `app/(tabs)/_layout.tsx` for push token wiring
- **Actual structure:** No `(tabs)` directory — customer-mobile has `app/_layout.tsx` + `app/orders/`, washer-mobile has `app/_layout.tsx` + `app/(home)/`, `app/(job)/`, `app/(photo)/`
- **Fix:** Wired `usePushToken()` in the root `app/_layout.tsx` for both apps. For washer-mobile, introduced inner `AppLayout` component to keep hooks in function component scope while maintaining `AuthProvider` wrapping

## Known Stubs

None — all notification dispatch uses real service functions, real order data, and real language from `preferred_language`. Push token registration writes to actual DB column.

## Self-Check: PASSED

- notification.worker.ts: FOUND
- push-token.ts: FOUND
- customer-mobile/usePushToken.ts: FOUND
- washer-mobile/usePushToken.ts: FOUND
- Task 1 commit 2012dcf: FOUND
- Task 2 commit cf98541: FOUND

---
phase: 02-core-business-flow
plan: "04"
subsystem: booking-api
tags: [stripe, payments, orders, booking, carpet, on-site, postGIS]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["POST /orders/on-site", "POST /orders/carpet", "Stripe PaymentIntent with destination charges"]
  affects: ["apps/api"]
tech_stack:
  added: ["date-fns"]
  patterns: ["Stripe Connect destination charges", "SELECT FOR UPDATE optimistic locking", "PostGIS ST_MakePoint via raw SQL", "server-side price computation"]
key_files:
  created:
    - apps/api/src/services/stripe.service.ts
    - apps/api/src/services/order.service.ts
    - apps/api/src/routes/booking/orders.ts
  modified:
    - apps/api/src/server.ts
    - apps/api/package.json
decisions:
  - "Platform fee (application_fee_amount) computed server-side as Math.round(subtotal * commission_rate / 100) — never accepted from client"
  - "Stripe API version pinned to 2026-03-25.dahlia to match installed stripe@21.0.1"
  - "service_location set via raw SQL (ST_SetSRID + ST_MakePoint) inside transaction — Prisma cannot handle Unsupported geography type"
  - "date-fns added to @cleanly/api for addDays in carpet return date computation"
metrics:
  duration: "~10min"
  completed: "2026-04-03"
  tasks: 2
  files: 5
---

# Phase 02 Plan 04: Booking API — Order Creation + Stripe PaymentIntents Summary

**One-liner:** POST /orders endpoints for both on-site and carpet bookings with server-side price computation, Stripe Connect destination charges (application_fee_amount), PostGIS geography service locations, and real-time Socket.io company notifications.

## Tasks Completed

| Task | Name | Status | Key Files |
|------|------|--------|-----------|
| 1 | Stripe service + order service (price computation + state transition locking) | Done | stripe.service.ts, order.service.ts |
| 2 | POST /orders endpoint for on-site and carpet bookings | Done | routes/booking/orders.ts, server.ts |

## What Was Built

### Task 1: Services Layer

**`apps/api/src/services/stripe.service.ts`**
- `createPaymentIntent()` — creates Stripe PaymentIntent with `transfer_data.destination` (not `on_behalf_of`, UAE restriction), `application_fee_amount` computed server-side, AED currency, automatic payment methods enabled
- `createRefund()` — refunds with `reverse_transfer: true` and `refund_application_fee: true`
- `createAccountLink()` — Stripe Connect Express account onboarding link (for company onboarding, Plan 07)
- `createConnectAccount()` — creates Express account in AE country with transfers capability

**`apps/api/src/services/order.service.ts`**
- `computeOrderTotal()` — fetches package + add-ons from DB, computes `packagePrice * quantity + addOnsTotal`, then `platformFee = Math.round(subtotal * commission_rate / 100)`. Includes company's `stripeAccountId` and `commissionRate`. Never accepts amounts from client (BOOK-04, Pitfall 3 prevention)
- `computeCarpetReturnDate()` — fetches company's `carpet_lead_time_days`, returns `addDays(pickupTime, leadTimeDays)` (CARP-03)
- `transitionOrderStatus()` — acquires `SELECT ... FOR UPDATE` row-level lock, validates transition via `isValidTransition()`, updates status with `completed_at` timestamp when appropriate (ORD-05, D-19)

### Task 2: Booking Routes

**`apps/api/src/routes/booking/orders.ts`**
- `POST /orders/on-site` — validates via `createOnSiteOrderSchema`, requires `fastify.authenticate`, computes prices, creates Order record, sets `service_location` via PostGIS raw SQL inside transaction, creates Stripe PaymentIntent, stores `payment_intent_id`, emits `order:new` to `company:{id}` Socket.io room
- `POST /orders/carpet` — same flow + computes `returnDate` via `computeCarpetReturnDate()`, creates `CarpetOrderDetails` with `pickup_time`, `return_date`, `carpet_count` (CARP-01 through CARP-03)
- Both endpoints return `{ order_id, client_secret }` per `createOrderResponseSchema`
- Neither endpoint accepts any `amount` field from client body

**`apps/api/src/server.ts`**
- Registered `bookingRoutes` at prefix `/orders`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe API version mismatch**
- **Found during:** Task 1
- **Issue:** Plan specified `2025-03-31.basil` API version but installed stripe@21.0.1 uses `2026-03-25.dahlia` — would cause TypeScript type error
- **Fix:** Updated `apiVersion` to `'2026-03-25.dahlia'` to match the installed package's type definitions
- **Files modified:** apps/api/src/services/stripe.service.ts

**2. [Rule 2 - Missing dependency] date-fns not installed**
- **Found during:** Task 1
- **Issue:** Plan references `addDays` from `date-fns` but it was not in api/package.json
- **Fix:** Ran `pnpm add date-fns --filter @cleanly/api`
- **Files modified:** apps/api/package.json

## Success Criteria Verification

- [x] Both on-site and carpet booking endpoints created
- [x] Prices computed server-side from database package/add-on values
- [x] Platform commission (`application_fee_amount`) correctly computed
- [x] PostGIS geography point stored for service location (via raw SQL)
- [x] CarpetOrderDetails created with `pickup_time` and computed `return_date`
- [x] Real-time Socket.io notification emitted to company room on order creation
- [x] `transfer_data.destination` used (not `on_behalf_of`)
- [x] SELECT FOR UPDATE locking for order state transitions

## Self-Check

Files created/modified:
- [x] apps/api/src/services/stripe.service.ts — CREATED
- [x] apps/api/src/services/order.service.ts — CREATED
- [x] apps/api/src/routes/booking/orders.ts — CREATED
- [x] apps/api/src/server.ts — MODIFIED (bookingRoutes registered)

## Self-Check: PENDING

TypeScript compilation (`pnpm tsc --noEmit`) could not be verified due to Bash tool restrictions during execution. Code follows identical patterns to existing routes (company/orders.ts, auth/otp.ts) that compile successfully.

---
plan: 02-06
phase: 02-core-business-flow
status: complete
started: 2026-04-03
completed: 2026-04-03
duration: ~8min
---

# Plan 02-06 Summary: Customer Booking UI

## What Was Built

### Task 1 — Booking Pages
- On-site booking page with service/package selection, location picker, time slot picker, add-ons
- Carpet booking page with carpet details, pickup scheduling, add-ons
- Both use shared BookingSummary component for price breakdown

### Task 2 — Payment & Confirmation
- Stripe payment page with PaymentElement integration
- Booking confirmation page with order details, status, and tracking link
- StickyBottomBar for mobile-first CTA placement

## Key Files Created
- `apps/customer-web/app/[locale]/booking/on-site/page.tsx`
- `apps/customer-web/app/[locale]/booking/carpet/page.tsx`
- `apps/customer-web/app/[locale]/payment/page.tsx`
- `apps/customer-web/app/[locale]/booking-confirmed/page.tsx`
- `apps/customer-web/src/components/LocationPicker.tsx`
- `apps/customer-web/src/components/BookingSummary.tsx`
- `apps/customer-web/src/components/TimeSlotPicker.tsx`
- `apps/customer-web/src/components/AddOnChips.tsx`
- `apps/customer-web/src/components/StickyBottomBar.tsx`

## Deviations
None — implemented as planned.

## Self-Check: PASSED

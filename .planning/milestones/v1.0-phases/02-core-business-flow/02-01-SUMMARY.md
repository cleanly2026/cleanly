---
phase: 02-core-business-flow
plan: 01
subsystem: shared-contracts
tags: [schema, types, i18n, zod, prisma]
dependency_graph:
  requires: []
  provides:
    - avg_rating/review_count/carpet_lead_time_days on Company model
    - Zod schemas: companyListQuerySchema, companyProfileResponseSchema (discovery)
    - Zod schemas: createOnSiteOrderSchema, createCarpetOrderSchema, assignWasherSchema (booking)
    - Zod schemas: companyProfileSchema, packageSchema, washerSchema (company)
    - i18n keys: discovery, booking, order, dashboard namespaces in en.json and ar.json
  affects:
    - All Phase 2 plans (02-02 through 02-09) depend on these contracts
tech_stack:
  added: []
  patterns:
    - Zod schemas exported from @cleanly/types barrel index
    - Bilingual i18n namespaces (en/ar) for all Phase 2 screens
key_files:
  created:
    - packages/types/src/discovery.ts
    - packages/types/src/booking.ts
    - packages/types/src/company.ts
  modified:
    - packages/db/schema.prisma
    - packages/db/migrations/20260402212432_add_company_rating_and_carpet_lead_time/migration.sql
    - packages/types/src/index.ts
    - packages/i18n/locales/en.json
    - packages/i18n/locales/ar.json
decisions:
  - Zod schemas organized by domain (discovery, booking, company) not by HTTP method — matches downstream plan naming conventions
  - carpet_lead_time_days stored on Company model (not global config) — per-company configurability required by CARP-03
  - avg_rating uses Decimal(3,2) — 0.00 to 5.00 range with two decimal places for display precision
metrics:
  duration: ~10min
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 8
---

# Phase 2 Plan 01: Schema Migration and Type Contracts Summary

**One-liner:** Prisma schema extended with avg_rating/review_count/carpet_lead_time_days on Company, 3 Zod domain type files created for discovery/booking/company, and all Phase 2 i18n keys seeded in both en.json and ar.json.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Prisma schema migration | `6fffbcd` | schema.prisma, migration SQL |
| 2 | Zod type contracts + i18n keys | `533957b` | discovery.ts, booking.ts, company.ts, index.ts, en.json, ar.json |

## What Was Built

### Task 1: Prisma Schema Migration

Added three fields to the `Company` model addressing DISC-04 and CARP-03:

- `avg_rating Decimal @default(0) @db.Decimal(3, 2)` — company listing display (0.00–5.00)
- `review_count Int @default(0)` — company listing display
- `carpet_lead_time_days Int @default(5)` — estimated return date calculation for carpet orders

Migration `20260402212432_add_company_rating_and_carpet_lead_time` applied to Neon database. Prisma client regenerated.

### Task 2: Zod Type Contracts and i18n Keys

**`packages/types/src/discovery.ts`** — Discovery API contracts:
- `companyListQuerySchema` — GET /companies query params (city_id, category, page)
- `citySchema` — City listing response item
- `companyListItemSchema` — Company card data for listing (avg_rating, review_count, starting_price)
- `companyProfileResponseSchema` — Full company profile with packages, add-ons, reviews

**`packages/types/src/booking.ts`** — Booking and order API contracts:
- `createOnSiteOrderSchema` — POST /orders for car wash and sofa (D-05, D-06)
- `createCarpetOrderSchema` — POST /orders for carpet with pickup_time (D-07, D-18)
- `createOrderResponseSchema` — POST /orders response with Stripe client_secret
- `rescheduleReturnDateSchema` — PATCH /orders/:id/carpet-return-date (CARP-04)
- `transitionOrderStatusSchema` — PATCH /orders/:id/status
- `assignWasherSchema` — PATCH /orders/:id/assign-washer (ORD-03)
- `washerResponseSchema` — POST /orders/:id/washer-response (ORD-04)
- `orderSummarySchema` — Order display data for booking confirmation (BOOK-04)

**`packages/types/src/company.ts`** — Company dashboard API contracts:
- `companyProfileSchema` — PUT /company/profile with bilingual fields (COMP-01, D-15)
- `companyServicesSchema` — PUT /company/services (COMP-02)
- `packageSchema` — POST /company/packages (COMP-03)
- `addOnSchema` — POST /company/packages/:id/add-ons (COMP-03)
- `washerSchema` — POST /company/washers (COMP-04)
- `stripeConnectResponseSchema` — Stripe Connect AccountLink URL (COMP-07)

**i18n keys** — Phase 2 namespaces in both languages:
- `discovery`: categories, city picker, empty states, company listing/profile labels, GPS error
- `booking`: booking CTAs, payment labels, carpet-specific fields, error messages, confirmation
- `order`: all 14 order statuses (on-site + carpet), cancel flow
- `dashboard`: order feed, filters, onboarding steps, package/washer management

## Verification Results

- `pnpm prisma validate` — PASSED
- `pnpm tsc --noEmit` in packages/types — PASSED
- JSON parse verification for en.json and ar.json — PASSED (all 4 namespaces present in both)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates contracts only (Zod schemas and i18n keys), not UI components or API handlers. No stub patterns apply.

## Self-Check: PASSED

Files exist:
- packages/types/src/discovery.ts — FOUND
- packages/types/src/booking.ts — FOUND
- packages/types/src/company.ts — FOUND
- packages/i18n/locales/en.json (discovery namespace) — FOUND
- packages/i18n/locales/ar.json (discovery namespace) — FOUND

Commits exist:
- 6fffbcd (Task 1 — schema migration) — FOUND
- 533957b (Task 2 — Zod types + i18n) — FOUND

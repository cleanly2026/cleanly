---
phase: 01-foundation
plan: "02"
subsystem: shared-packages
tags: [types, i18n, config, contracts, bilingual]
dependency_graph:
  requires:
    - 01-01  # monorepo scaffold with packages/ directories
  provides:
    - JWTPayload and UserRole types for auth routes
    - OrderStatus enum and VALID_TRANSITIONS for order lifecycle
    - en.json and ar.json locale files for all Phase 1 UI strings
    - shared Tailwind config with brand tokens
    - shared ESLint config with no-hardcoded-strings rule
  affects:
    - All downstream plans that import from @cleanly/types
    - All UI components that consume @cleanly/i18n locale strings
    - packages/db (Prisma schema must mirror OrderStatus enum values)
tech_stack:
  added: []
  patterns:
    - Zod schemas co-located with TypeScript interfaces for runtime + compile-time validation
    - satisfies operator for type-safe locale record enforcement (Messages type inference)
    - State machine via VALID_TRANSITIONS Record — application layer enforces, not DB constraints
key_files:
  created:
    - packages/types/src/auth.ts
    - packages/types/src/order.ts
    - packages/types/src/api.ts
    - packages/types/tsconfig.json
    - packages/i18n/locales/en.json
    - packages/i18n/locales/ar.json
    - packages/i18n/tsconfig.json
    - packages/config/eslint.config.js
    - packages/config/tailwind.config.ts
  modified:
    - packages/types/src/index.ts  # barrel export (was empty stub)
    - packages/i18n/src/index.ts   # type-safe accessor (was empty stub)
decisions:
  - "14-state OrderStatus enum kept as single enum (D-02 locked) — application layer enforces valid transitions per order type via VALID_TRANSITIONS"
  - "Zod schemas co-located with TypeScript interfaces in auth.ts — single source of truth for validation used by both API and clients"
  - "i18n index.ts uses satisfies Record<Locale, Messages> — TypeScript enforces that ar.json matches en.json structure at compile time"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 9
  files_modified: 2
---

# Phase 01 Plan 02: Shared Type Contracts and Bilingual i18n Locales Summary

**One-liner:** JWT auth contracts with Zod validation, 14-state OrderStatus with dual state machines, and complete AR/EN Phase 1 locale files with type-safe accessor.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build packages/types with auth, order, and API contracts | f18b8d3 | auth.ts, order.ts, api.ts, index.ts, tsconfig.json |
| 2 | Create bilingual i18n locale files with all Phase 1 auth strings | 25eb3d8 | en.json, ar.json, i18n/index.ts, i18n/tsconfig.json, eslint.config.js, tailwind.config.ts |

## What Was Built

### packages/types

- **auth.ts** — JWTPayload interface (sub, role, companyId, iat, exp), UserRole type, JWTPayloadSchema Zod validator, plus full Zod schemas for all auth flows: SendOtpRequest, VerifyOtpRequest, WasherPinVerify, CompanyLogin, CompanyTotpVerify, RefreshToken. TokenPair interface for access+refresh token responses.

- **order.ts** — OrderStatus enum with all 14 states (4 shared + 3 on-site specific + 7 carpet specific). VALID_TRANSITIONS state machine as `Record<OrderType, Partial<Record<OrderStatus, OrderStatus[]>>>`. isValidTransition() helper function. Mirrors D-02 locked decision.

- **api.ts** — ApiError, Pagination, and Language Zod schemas for standard API response shapes.

- **index.ts** — barrel re-export of all three modules.

### packages/i18n

- **locales/en.json** — 40+ English strings covering auth.otp, auth.washer, auth.company, auth.admin, auth.empty, auth.error, auth.terms_copy, auth.lang_toggle, and common namespace.

- **locales/ar.json** — Arabic translations with identical key structure to en.json. All top-level keys match: auth and common. All nested keys match.

- **src/index.ts** — Type-safe accessor using `satisfies Record<Locale, Messages>`. getMessages() returns correctly-typed Messages object. TypeScript will error at compile time if ar.json diverges from en.json structure.

### packages/config

- **eslint.config.js** — Shared ESLint config with `no-restricted-syntax` rule preventing hardcoded JSX text (enforces i18n convention from day one).

- **tailwind.config.ts** — Brand color tokens (surface #F8F7F4, navy #1A2744, gold #C9A84C, muted #E8E5DF), semantic colors, Cairo font family variable, type scale (label/body/heading/display), font weights, and spacing scale.

## Verification Results

All 5 plan verification checks passed:
1. JWTPayload in packages/types/src/auth.ts — PASS
2. pickup_scheduled in packages/types/src/order.ts — PASS
3. isValidTransition in packages/types/src/order.ts — PASS
4. Arabic OTP send_cta string in ar.json — PASS
5. C9A84C brand gold token in tailwind.config.ts — PASS

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The `phone_placeholder` and `pin_placeholder` values in both locale files are legitimate i18n strings for form field placeholder attributes, not implementation stubs.

## Self-Check: PASSED

Files verified:
- packages/types/src/auth.ts — FOUND
- packages/types/src/order.ts — FOUND
- packages/types/src/api.ts — FOUND
- packages/i18n/locales/en.json — FOUND
- packages/i18n/locales/ar.json — FOUND
- packages/config/tailwind.config.ts — FOUND
- packages/config/eslint.config.js — FOUND

Commits verified:
- f18b8d3 (Task 1) — FOUND
- 25eb3d8 (Task 2) — FOUND

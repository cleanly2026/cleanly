---
phase: 01-foundation
plan: "10"
subsystem: ui
tags: [react, tailwind, rtl, otp, auth, i18n, vitest, testing-library]

# Dependency graph
requires:
  - phase: 01-08
    provides: i18n infrastructure with next-intl and expo-i18next

provides:
  - OtpInput: 6-box with auto-advance, backspace retreat, paste, dir=ltr digit order
  - PinInput: 4-box masked wrapper over OtpInput
  - PhoneInput: +971 UAE prefix with logical CSS properties
  - LanguageToggle: EN/AR switcher with Arabic label, localStorage persistence, next-intl router
  - AuthCard: branded navy wrapper with wordmark slot, no hardcoded strings
  - packages/ui barrel export for all 5 auth components

affects:
  - 01-11 (auth screens depend on all 5 components)
  - packages/ui consumers

# Tech tracking
tech-stack:
  added:
    - vitest ^2.0.0 (test runner)
    - "@vitejs/plugin-react" ^4.3.0
    - "@testing-library/react" ^16.0.0
    - "@testing-library/jest-dom" ^6.4.0
    - clsx ^2.1.1
    - tailwind-merge ^2.6.0
    - tailwindcss ^4.0.0 (dev)
    - jsdom ^24.0.0 (test environment)
  patterns:
    - OtpInput base with masked prop — PinInput is a thin wrapper (DRY)
    - dir="ltr" on digit container — RTL-safe digit display without CSS hacks
    - Logical Tailwind properties throughout (ps-/pe-/ms-/me- never pl-/pr-/ml-/mr-)
    - Vitest + @testing-library/react for component behavior tests in packages/ui

key-files:
  created:
    - packages/ui/src/otp-input.tsx
    - packages/ui/src/pin-input.tsx
    - packages/ui/src/phone-input.tsx
    - packages/ui/src/language-toggle.tsx
    - packages/ui/src/auth-card.tsx
    - packages/ui/src/otp-input.test.tsx
    - packages/ui/src/test-setup.ts
    - packages/ui/tailwind.config.ts
    - packages/ui/vitest.config.ts
  modified:
    - packages/ui/src/index.ts (barrel export updated)
    - packages/ui/package.json (added test scripts, clsx, tailwind-merge, dev deps)
    - package.json (pnpm overrides for react/react-dom version alignment)

key-decisions:
  - "pnpm overrides align react and react-dom at 19.2.4 across monorepo — fixes version mismatch that broke vitest"
  - "dir=ltr on OtpInput container: digit boxes always LTR even in Arabic RTL mode per UI-SPEC"
  - "LanguageToggle imports next/navigation and next-intl — stays in packages/ui as it is a web-only component"
  - "PinInput is a 3-line wrapper over OtpInput with masked=true — avoids duplicating OTP logic"

patterns-established:
  - "Logical Tailwind properties only: ps-/pe-/ms-/me- never pl-/pr-/ml-/mr- in any UI component"
  - "OtpInput dir=ltr pattern for RTL-safe digit display"
  - "min-h-[44px] on interactive elements for WCAG 2.5.5 AA touch targets"
  - "w-12 h-14 (48x56px) for OTP/PIN boxes — WCAG 2.5.5 enhanced touch targets"

requirements-completed:
  - I18N-02

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 01 Plan 10: Auth UI Components Summary

**Five RTL-first auth UI components (OtpInput, PinInput, PhoneInput, LanguageToggle, AuthCard) built in packages/ui with TDD, logical Tailwind properties, and WCAG 2.5.5 touch targets**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T06:43:16Z
- **Completed:** 2026-04-01T06:51:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- OtpInput with auto-advance, backspace retreat, paste support, dir=ltr digit container for RTL-safe display
- PinInput (4-box masked) as a thin wrapper over OtpInput base
- PhoneInput with +971 UAE prefix and logical CSS properties (ps-/pe-)
- LanguageToggle with correct Arabic/English labels, localStorage persistence, and next-intl router integration
- AuthCard navy wrapper with no hardcoded strings (title passed as prop)
- 8 passing Vitest tests covering box count, onChange, dir=ltr, invalid state, masked mode, disabled state

## Task Commits

Each task was committed atomically:

1. **Task 1: OtpInput and PinInput components** - `a0a42c7` (feat)
2. **Task 2: PhoneInput, LanguageToggle, AuthCard, index.ts** - `970dd9e` (feat)

## Files Created/Modified

- `packages/ui/src/otp-input.tsx` - 6-box OTP input with auto-advance, backspace, paste, dir=ltr, invalid/disabled states
- `packages/ui/src/pin-input.tsx` - 4-box masked PIN input wrapping OtpInput
- `packages/ui/src/phone-input.tsx` - UAE +971 prefix phone input with logical CSS properties
- `packages/ui/src/language-toggle.tsx` - EN/AR switcher with localStorage persistence and next-intl routing
- `packages/ui/src/auth-card.tsx` - Navy-background branded auth card wrapper
- `packages/ui/src/otp-input.test.tsx` - 8 Vitest behavior tests
- `packages/ui/src/test-setup.ts` - @testing-library/jest-dom setup
- `packages/ui/tailwind.config.ts` - Brand colors (navy, gold, muted, surface) and semantic colors
- `packages/ui/vitest.config.ts` - Vitest config with jsdom environment
- `packages/ui/src/index.ts` - Barrel export for all 5 components
- `packages/ui/package.json` - Added clsx, tailwind-merge, vitest, @testing-library/* deps
- `package.json` - pnpm overrides for react/react-dom version alignment

## Decisions Made

- pnpm overrides at root align `react` and `react-dom` to `^19.2.0` — the monorepo had react@19.0.0 in apps and react-dom@19.2.4 hoisted to root, causing a Vitest incompatibility error; overrides fix this globally
- `dir="ltr"` on OtpInput's container div ensures digit boxes always render left-to-right even when the page is in RTL Arabic mode — this is per the UI-SPEC requirement
- LanguageToggle placed in `packages/ui` with `next/navigation` + `next-intl` imports — it is a web-only auth component and web apps are the consumers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed React version mismatch breaking Vitest**
- **Found during:** Task 1 (TDD test infrastructure setup)
- **Issue:** Root node_modules had `react@19.0.0` (from apps using `^19.0.0`) and `react-dom@19.2.4`, causing React version mismatch error in Vitest
- **Fix:** Added `pnpm.overrides` to root `package.json` to pin both `react` and `react-dom` to `^19.2.0`
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Verification:** All 8 Vitest tests pass after override
- **Committed in:** `a0a42c7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary for test infrastructure to function. Aligning React versions is correct for the whole monorepo — no scope creep.

## Issues Encountered

- React version mismatch between `react@19.0.0` (app packages using `^19.0.0`) and `react-dom@19.2.4` (latest resolved). Fixed via pnpm overrides.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 auth UI components are ready for use by Plan 11 (auth screens)
- Components export cleanly from `@cleanly/ui`
- TDD coverage ensures OtpInput behavior is correct before auth screens depend on it
- No blockers for Plan 11

---
*Phase: 01-foundation*
*Completed: 2026-04-01*

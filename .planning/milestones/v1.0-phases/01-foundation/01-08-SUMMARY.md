---
phase: 01-foundation
plan: "08"
subsystem: i18n
tags: [i18n, rtl, next-intl, expo, cairo-font, tailwind]
dependency_graph:
  requires: [01-02]
  provides: [i18n-routing, rtl-layout-contract, expo-i18n]
  affects: [customer-web, admin-web, customer-mobile, washer-mobile]
tech_stack:
  added: [next-intl, i18next, react-i18next, expo-localization, "@react-native-async-storage/async-storage", expo-router]
  patterns: [next-intl App Router routing, Cairo font with display:swap, await params (Next.js 16), I18nManager.forceRTL, AsyncStorage language persistence]
key_files:
  created:
    - apps/customer-web/src/i18n/routing.ts
    - apps/customer-web/src/i18n/request.ts
    - apps/customer-web/middleware.ts
    - apps/customer-web/next.config.ts
    - apps/customer-web/app/[locale]/layout.tsx
    - apps/customer-web/app/[locale]/page.tsx
    - apps/customer-web/tailwind.config.ts
    - apps/admin-web/next.config.ts
    - apps/admin-web/src/i18n/routing.ts
    - apps/admin-web/src/i18n/request.ts
    - apps/admin-web/app/[locale]/layout.tsx
    - apps/customer-mobile/src/i18n/expo-i18n.ts
    - apps/customer-mobile/app/_layout.tsx
    - apps/washer-mobile/src/i18n/expo-i18n.ts
    - apps/washer-mobile/app/_layout.tsx
  modified:
    - apps/admin-web/middleware.ts
    - apps/customer-mobile/package.json
    - apps/washer-mobile/package.json
decisions:
  - "next-intl localePrefix: 'always' — explicit /en and /ar URLs for SEO and locale clarity"
  - "admin-web middleware chains next-intl intlMiddleware with existing auth.js guard — locale routing and auth both preserved"
  - "Cairo font weight ['400','600'] only — UI-SPEC minimum subset reduces font payload"
  - "expo-router ~5.0.0 pinned to match Expo SDK 55 compatibility window"
metrics:
  duration: 7min
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_created: 15
  files_modified: 3
---

# Phase 01 Plan 08: i18n Infrastructure and RTL Layout Contract Summary

**One-liner:** next-intl App Router routing with Cairo font + dir=rtl/ltr for web apps; i18next + I18nManager.forceRTL for Expo mobile apps — shared locale files from @cleanly/i18n.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | next-intl App Router setup for customer-web and admin-web | 6c66807 | routing.ts, request.ts, middleware.ts, next.config.ts, [locale]/layout.tsx, [locale]/page.tsx, tailwind.config.ts (customer-web); next.config.ts, routing.ts, request.ts, [locale]/layout.tsx, middleware.ts (admin-web) |
| 2 | Expo i18next setup for customer-mobile and washer-mobile | aedf7ba | expo-i18n.ts, app/_layout.tsx (both mobile apps) |

## What Was Built

### Task 1: next-intl App Router i18n

- **customer-web routing.ts** — `defineRouting({ locales: ['en','ar'], defaultLocale: 'en', localePrefix: 'always' })`. The `localePrefix: 'always'` ensures every URL explicitly includes the locale for SEO and user bookmarking clarity.

- **customer-web request.ts** — `getRequestConfig` loads messages from `@cleanly/i18n/locales/{locale}.json` using dynamic import, feeding the shared locale files into server components via NextIntlClientProvider.

- **customer-web middleware.ts** — `createMiddleware(routing)` handles locale detection and redirection. Matcher excludes API, _next, _vercel, and static asset paths.

- **customer-web next.config.ts** — `withNextIntl` plugin wraps the config; `transpilePackages` includes `@cleanly/ui`, `@cleanly/i18n`, `@cleanly/types` for monorepo cross-package imports.

- **customer-web app/[locale]/layout.tsx** — Root layout with three critical i18n properties:
  1. `const { locale } = await params` — Next.js 16 async params (Pitfall 4 prevented)
  2. `dir={dir}` on `<html>` where `dir = locale === 'ar' ? 'rtl' : 'ltr'`
  3. Cairo font with `display: 'swap'` and `variable: '--font-cairo'` (I18N-05: zero CLS)

- **customer-web tailwind.config.ts** — extends `sharedTailwindConfig.theme.extend` from `@cleanly/config/tailwind.config`, wiring brand colors, Cairo font variable, and logical spacing tokens into the app.

- **admin-web** — identical Cairo+RTL layout pattern; next-intl routing added via `withNextIntl` plugin; middleware updated to chain `intlMiddleware(req)` after auth guard, preserving the existing NextAuth.js session protection.

### Task 2: Expo i18next

- **expo-i18n.ts (customer-mobile + washer-mobile)** — i18next initialized with en/ar resources from `@cleanly/i18n/locales/{locale}.json`. Device locale detected via `expo-localization`, falls back to 'en' if unsupported locale. `switchLanguage()` function:
  - Persists choice to AsyncStorage key `preferred_language` (I18N-04)
  - Calls `I18nManager.forceRTL(lang === 'ar')` when direction change needed
  - Documents that caller must trigger app restart (RTL layout direction is set at native boot time)

- **app/_layout.tsx** — Both Expo apps import `../src/i18n/expo-i18n` to initialize i18n before any screen renders.

## RTL Layout Contract

This plan establishes the RTL layout contract for all subsequent UI phases:

1. **Web apps** — `dir` attribute set on `<html>` from locale param. Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`) are the only margin/padding classes permitted.
2. **Mobile apps** — `marginStart`/`marginEnd` (not `marginLeft`/`marginRight`) throughout. RTL direction toggled via `I18nManager.forceRTL` + app restart.
3. **Font** — Cairo (`subsets: ['arabic','latin']`) is the universal font across all surfaces, loaded via `--font-cairo` CSS variable on web and via React Native StyleSheet on mobile.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] admin-web middleware chained with next-intl**

- **Found during:** Task 1 — admin-web already had a working NextAuth.js auth middleware
- **Issue:** Plan specified only `next.config.ts` and `[locale]/layout.tsx` for admin-web. The existing auth middleware would conflict with next-intl locale routing if left as-is.
- **Fix:** Updated `apps/admin-web/middleware.ts` to chain `intlMiddleware(req)` at the end of the auth guard, and updated auth redirect to use `/en/auth/signin` path. Added `apps/admin-web/src/i18n/routing.ts` and `src/i18n/request.ts` to support `getRequestConfig`.
- **Files modified:** apps/admin-web/middleware.ts, apps/admin-web/src/i18n/routing.ts, apps/admin-web/src/i18n/request.ts
- **Commit:** 6c66807

**2. [Rule 2 - Missing Critical Functionality] admin-web next.config.ts uses withNextIntl plugin**

- **Found during:** Task 1
- **Issue:** Plan spec showed admin-web next.config.ts without `withNextIntl` (unlike customer-web). Without the plugin, next-intl server-side message loading via `getMessages()` in the layout would fail.
- **Fix:** Added `createNextIntlPlugin('./src/i18n/request.ts')` to admin-web next.config.ts.
- **Files modified:** apps/admin-web/next.config.ts
- **Commit:** 6c66807

## Known Stubs

- `apps/customer-web/app/[locale]/page.tsx` — placeholder home page uses `t('common.loading')`. This is intentional — a real home page screen is out of scope for this infrastructure plan. Plan 09+ will replace this with the actual customer home screen.

## Self-Check: PASSED

Files verified:
- FOUND: apps/customer-web/app/[locale]/layout.tsx
- FOUND: apps/customer-web/src/i18n/routing.ts
- FOUND: apps/customer-mobile/src/i18n/expo-i18n.ts
- FOUND: apps/washer-mobile/src/i18n/expo-i18n.ts

Commits verified:
- FOUND: 6c66807 (feat(01-08): next-intl App Router i18n for customer-web and admin-web)
- FOUND: aedf7ba (feat(01-08): Expo i18next setup for customer-mobile and washer-mobile)

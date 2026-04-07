---
quick_task: 260408-0ki
subsystem: washer-mobile, packages/i18n
tags: [i18n, washer-mobile, translation, react-i18next]
key-files:
  modified:
    - apps/washer-mobile/app/(photo)/upload.tsx
    - apps/washer-mobile/app/(job)/active.tsx
    - apps/washer-mobile/app/(job)/alert.tsx
    - packages/i18n/locales/en.json
    - packages/i18n/locales/ar.json
decisions:
  - Checklist items stored as translation key arrays (not translated string arrays) so keys are stable for ChecklistItem `key` prop
  - discovery.categories.* reused for service type labels in alert.tsx and active.tsx — single source of truth for car_wash/sofa/carpet labels
  - bodyBefore/After/Pickup/Return added as distinct keys (not parameterized) — each body text is unique and non-interpolated
  - distanceAway/loadingMap added to washer.jobAlert namespace rather than creating a new namespace
metrics:
  duration: ~8min
  completed: "2026-04-08"
  tasks: 1
  files: 5
---

# Quick Task 260408-0ki: Fix i18n gap in washer-mobile

**One-liner:** Replaced all hardcoded English UI strings in washer-mobile's photo/upload, job/active, and job/alert screens with `useTranslation()` t() calls backed by new keys in en.json and ar.json.

## What Was Done

### Task 1: Replace hardcoded strings with t() calls (commit 164464f)

**upload.tsx**
- Removed `INSTRUCTION_MAP` and `BODY_MAP` static objects
- Added `useTranslation` import
- Replaced with inline key resolution using existing `washer.photo.beforeOnSite`, `washer.photo.beforeCarpet`, `washer.photo.afterOnSite`, `washer.photo.afterCarpet` keys
- Added 4 new body text keys: `washer.photo.bodyBefore`, `washer.photo.bodyAfter`, `washer.photo.bodyPickup`, `washer.photo.bodyReturn`

**active.tsx**
- Removed hardcoded `CHECKLISTS` object with English string arrays
- Added `useTranslation` import
- Replaced with `CHECKLIST_KEYS` mapping service type to i18n key arrays
- Items resolved via `itemKeys.map((key) => t(key))` at render time
- `ChecklistItem` key prop now uses the stable translation key (not the translated string)
- Translated: heading (`washer.checklist.heading`), progress (`washer.checklist.progress`), warning (`washer.checklist.incompleteWarning`), job badge (`washer.checklist.jobActive`), complete button (`washer.checklist.completeJob`), service label (`discovery.categories.*`)

**alert.tsx**
- Replaced `{serviceType || 'Service'}` with `t('discovery.categories.${serviceType}', { defaultValue: ... })`
- Replaced `{(estimatedDistanceNum / 1000).toFixed(1)} km away` with `t('washer.jobAlert.distanceAway', ...)`
- Replaced hardcoded `"Loading map…"` with `t('washer.jobAlert.loadingMap')`

**en.json additions:**
- `washer.photo.bodyBefore/After/Pickup/Return`
- `washer.checklist.jobActive`, `washer.checklist.completeJob`
- `washer.checklist.items.car_wash.*` (6 items)
- `washer.checklist.items.sofa.*` (6 items)
- `washer.jobAlert.distanceAway`, `washer.jobAlert.loadingMap`

**ar.json additions:** Full Arabic translations for all new keys above.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all strings are wired to translation keys with Arabic counterparts.

## Self-Check: PASSED

- `apps/washer-mobile/app/(photo)/upload.tsx` — modified, committed in 164464f
- `apps/washer-mobile/app/(job)/active.tsx` — modified, committed in 164464f
- `apps/washer-mobile/app/(job)/alert.tsx` — modified, committed in 164464f
- `packages/i18n/locales/en.json` — modified, committed in 164464f
- `packages/i18n/locales/ar.json` — modified, committed in 164464f

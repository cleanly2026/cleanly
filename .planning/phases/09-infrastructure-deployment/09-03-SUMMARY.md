---
phase: 09-infrastructure-deployment
plan: 03
status: partial
updated: 2026-04-14
---

# Plan 09-03 Summary — Vercel Projects for Web Apps

## What was built

Three Vercel projects are deployed from the monorepo, each wired to its own app root with the correct Framework Preset. `.vercelignore` files strip non-source artifacts from the build upload, and `09-VERCEL-RUNBOOK.md` documents every reproducible setting.

An admin-web SSR 500 was uncovered during verification and fixed in the same plan (commit `44ef3a3`) — the Dashboard page was passing JSX-returning render functions from a Server Component across the RSC boundary to a Client Component `<DataTable>`. Extracted into `app/[locale]/recent-orders-table.tsx`.

## Deployed URLs

### Production (verified HTTP 200)

| Project | URL |
|---|---|
| customer-web | https://cleanly-customer-web.vercel.app |
| admin-web | https://cleanly-admin-web.vercel.app |
| company-web | https://cleanly-company-web.vercel.app |

### Preview / Staging

**Deferred.** No `*-staging.vercel.app` URLs yet. Task 1 acceptance criteria called for 6 URLs (3 prod + 3 preview); only production is live. This is accepted as an MVP scope cut — preview environments will be added in a follow-up before public launch. See runbook "Known Issues / Follow-ups".

## `.vercelignore` content

Identical content written to `apps/customer-web/.vercelignore`, `apps/admin-web/.vercelignore`, `apps/company-web/.vercelignore`:

```
.planning
.claude
**/*.test.ts
**/*.test.tsx
**/__tests__/**
coverage
.turbo
```

## Cache-poisoning check

Not conclusive from HTML-level grep — Next.js and Vite inline `NEXT_PUBLIC_*` / `VITE_*` env vars into JS chunks rather than the initial SSR HTML. Confirmed via runbook instructions; staging will get a second, differentiable check once the staging URLs exist.

## Key files

- created: `apps/customer-web/.vercelignore`
- created: `apps/admin-web/.vercelignore`
- created: `apps/company-web/.vercelignore`
- created: `.planning/phases/09-infrastructure-deployment/09-VERCEL-RUNBOOK.md`
- created: `apps/admin-web/app/[locale]/recent-orders-table.tsx` (bug-fix scope-in)
- modified: `apps/admin-web/app/[locale]/page.tsx` (bug-fix scope-in)

## Note for Plan 09-04

Only production Vercel URLs exist today. Plan 09-04's CORS allowlist + R2 CORS JSON should reflect this — include the three production URLs + three `localhost:*` dev URLs in `AllowedOrigins`. Add staging URLs to both the R2 policy and Fly secrets when the staging surface lands.

Production URLs to include:
- `https://cleanly-customer-web.vercel.app`
- `https://cleanly-admin-web.vercel.app`
- `https://cleanly-company-web.vercel.app`

## Acceptance criteria (delta)

| # | Criterion | Status |
|---|---|---|
| 1 | Three Vercel projects exist, correct Root Directory each | ✓ |
| 2 | customer/admin = Next.js, company = Vite | ✓ |
| 3 | company-web Output Directory = `dist` | ✓ |
| 4 | Ignored Build Step set per project | Documented in runbook; dashboard config to be confirmed by user |
| 5 | Env vars scoped to Preview + Production | **Production only** — Preview deferred |
| 6 | First deploys triggered | ✓ (all three return 200) |
| 7 | Six URLs (prod + preview) | **Three (prod)** — preview deferred |
| 8 | `.vercelignore` files exist | ✓ |
| 9 | Runbook documents every setting | ✓ |
| 10 | No secret values in runbook | ✓ (key names only) |

Status `partial` reflects the deferred Preview scope. Core goal (all three web apps deployed and rendering) is met.

---
phase: 09-infrastructure-deployment
artifact: VERCEL-RUNBOOK
updated: 2026-04-14
---

# Vercel Deployment Runbook

Reproducible settings, env-var inventory, deploy + rollback commands for the three Vercel-hosted web surfaces.

> **Note on Preview/Staging:** Separate `*-staging.vercel.app` URLs are deferred — only Production scope is populated today. When the staging surface lands, add Preview-scoped env vars to each project and repeat the cache-poisoning check against the Preview URL.

## Project Inventory

| Project | Root Directory | Framework Preset | Output Directory | Production URL |
|---|---|---|---|---|
| `cleanly-customer-web` | `apps/customer-web` | Next.js | `.next` (auto) | https://cleanly-customer-web.vercel.app |
| `cleanly-admin-web` | `apps/admin-web` | Next.js | `.next` (auto) | https://cleanly-admin-web.vercel.app |
| `cleanly-company-web` | `apps/company-web` | **Vite** | `dist` | https://cleanly-company-web.vercel.app |

## Per-Project Settings

All three projects share these settings, except where noted:

| Setting | customer-web | admin-web | company-web |
|---|---|---|---|
| Framework Preset | Next.js | Next.js | **Vite** |
| Root Directory | `apps/customer-web` | `apps/admin-web` | `apps/company-web` |
| Build Command | (auto — Turborepo detected) | (auto) | (auto) |
| Output Directory | `.next` (auto) | `.next` (auto) | **`dist`** |
| Install Command | (auto — pnpm) | (auto) | (auto) |
| Node Version | 20.x | 20.x | 20.x |
| Ignored Build Step | `npx turbo-ignore @cleanly/customer-web --fallback=HEAD^1` | `npx turbo-ignore @cleanly/admin-web --fallback=HEAD^1` | `npx turbo-ignore @cleanly/company-web --fallback=HEAD^1` |

> **⚠ Vite vs Next.js — the single most error-prone setting:** `company-web` MUST use Framework Preset = **Vite** and Output Directory = **`dist`**. Setting it to Next.js (the Vercel default for this monorepo) will deploy an empty build. If company-web deploys successfully but renders blank, check Framework Preset first.

## Environment Variables (Production scope)

Set these in Vercel → Project → Settings → Environment Variables. Scope = **Production** only (Preview rows deferred — see note above).

### customer-web (key names only)

| Variable | Scope |
|---|---|
| `NEXT_PUBLIC_API_URL` | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production |
| `NEXT_PUBLIC_SENTRY_DSN` | Production |

### admin-web (key names only)

| Variable | Scope |
|---|---|
| `NEXT_PUBLIC_API_URL` | Production |
| `NEXT_PUBLIC_SENTRY_DSN` | Production |
| `NEXTAUTH_SECRET` | Production |
| `NEXTAUTH_URL` | Production |
| `GOOGLE_CLIENT_ID` | Production |
| `GOOGLE_CLIENT_SECRET` | Production |
| `ADMIN_EXCHANGE_SECRET` | Production |

> `ADMIN_EXCHANGE_SECRET` MUST equal the same value set on the `cleanly-api` Fly app. If they drift, admin login will 401.

### company-web (key names only)

| Variable | Scope |
|---|---|
| `VITE_API_URL` | Production |
| `VITE_SENTRY_DSN` | Production |

## `.vercelignore` Content

Identical content applied to all three app roots:

```
.planning
.claude
**/*.test.ts
**/*.test.tsx
**/__tests__/**
coverage
.turbo
```

Purpose: strips non-source artifacts from the Vercel upload context and prevents `tsc` from attempting to compile test files in production builds.

## Cache-Poisoning Verification

Turbo can poison the build cache if `NEXT_PUBLIC_*` / `VITE_*` env vars aren't declared under `tasks.build.env` in `turbo.json` (fixed in Plan 01). To verify the correct env value was baked in:

```bash
# Production HTML / JS should reference the production API URL
curl -sL https://cleanly-customer-web.vercel.app | grep -o "cleanly-api[a-z-]*\.fly\.dev" | sort -u
curl -sL https://cleanly-company-web.vercel.app | grep -o "cleanly-api[a-z-]*\.fly\.dev" | sort -u
```

Note: Next.js and Vite inline `PUBLIC_` vars into **JS chunks**, not the initial HTML. If the grep above is empty, fetch the main JS bundle and grep there instead.

When staging lands, the same grep against `*-staging.vercel.app` should return the staging API URL (`cleanly-api-staging.fly.dev`). If staging returns the production URL, Turbo cache is poisoned — revisit `turbo.json` Plan 01 changes.

## Deploy

**Git-driven (preferred):** Any push to `master` auto-deploys all three projects that have changes under their Root Directory. `turbo-ignore` in Ignored Build Step short-circuits unchanged apps.

**Manual (from app directory):**
```bash
# One-time: link each app to its Vercel project
cd apps/customer-web && vercel link
cd ../admin-web && vercel link
cd ../company-web && vercel link

# Production deploy
vercel --prod                    # from inside an app directory
vercel --prod --force            # bypass cache if you need to
```

## Rollback

**CLI:**
```bash
vercel rollback <deployment-url> --yes
```

**Dashboard:** Project → Deployments → find the last-known-good deployment → **Promote to Production**.

Vercel preserves deployments indefinitely, so rollback is instant — no rebuild required.

## Manual Rebuild

Needed when env vars change (Vercel only re-reads env at build time):

**CLI:**
```bash
vercel --prod --force
```

**Dashboard:** Project → Deployments → latest → **⋯ → Redeploy** (check "Use existing Build Cache: No" if the change was env-related).

## Known Issues / Follow-ups

- **Preview/staging URLs deferred** — only Production scope is populated. Add `Preview`-scoped env vars + re-run cache-poisoning check when staging lands. Output URLs will be `cleanly-*-git-<branch>.vercel.app` unless a separate staging project is created.
- **Sentry DSNs** — set to placeholders until staging/production Sentry projects are wired in a later phase.
- **admin-web `/[locale]` SSR 500 fix** (commit `44ef3a3`) — DataTable render functions moved into a client component; the Server Component no longer passes functions across the RSC boundary.

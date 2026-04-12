# Cleanly - Sentry Error Monitoring Setup

| Field | Value |
|-------|-------|
| Provider | Sentry |
| Tier | Free (5K errors/mo) |
| Cost | $0/mo (free tier) |
| Dashboard | https://sentry.io |

---

## Prerequisites

- Gmail account (personal)

---

## Signup Checklist

1. Go to https://sentry.io
2. Click **Sign Up** -> Sign up with Google (personal Gmail)
3. Create organization:
   - **Organization name:** `cleanly`
   - **Organization slug:** `cleanly` (used in DSN URLs)

### Create 6 Projects

Create one project per app surface:

| # | Project Name | Platform | Purpose |
|---|-------------|----------|---------|
| 1 | `api` | Node.js | Fastify API + BullMQ workers |
| 2 | `customer-web` | Next.js | Customer web app |
| 3 | `admin-web` | Next.js | Admin panel |
| 4 | `company-web` | React (Vite) | Company dashboard |
| 5 | `customer-mobile` | React Native | Customer mobile app (Expo) |
| 6 | `washer-mobile` | React Native | Washer mobile app (Expo) |

For each project:
4. Click **Create Project**
5. Select the appropriate platform
6. Name the project as listed above
7. Copy the **DSN** from the project settings (Settings -> Client Keys (DSN))

### Create Auth Token

8. Navigate to **Settings** -> **Auth Tokens** -> **Create New Token**
9. Scopes: `project:releases`, `project:read`
10. Name: `cleanly-ci`
11. Copy the auth token

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| API DSN | api project -> Settings -> Client Keys | `https://xxx@oXXX.ingest.sentry.io/xxx` |
| Customer Web DSN | customer-web project -> Settings -> Client Keys | Same format |
| Admin Web DSN | admin-web project -> Settings -> Client Keys | Same format |
| Company Web DSN | company-web project -> Settings -> Client Keys | Same format |
| Customer Mobile DSN | customer-mobile project -> Settings -> Client Keys | Same format |
| Washer Mobile DSN | washer-mobile project -> Settings -> Client Keys | Same format |
| Auth Token | Settings -> Auth Tokens | Long alphanumeric string |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Sentry** | `api_dsn` | API project DSN |
| | `customer_web_dsn` | Customer web project DSN |
| | `admin_web_dsn` | Admin web project DSN |
| | `company_web_dsn` | Company web (Vite) project DSN |
| | `customer_mobile_dsn` | Customer mobile project DSN |
| | `washer_mobile_dsn` | Washer mobile project DSN |
| | `auth_token` | CI auth token (`project:releases`, `project:read`) |

Vault: `Cleanly`
Tags: `monitoring`, `sentry`, `error-tracking`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| API DSN | Fly.io | `SENTRY_DSN` | API + Worker runtime |
| Org slug | Fly.io | `SENTRY_ORG` | API runtime (value: `cleanly`) |
| Customer Web DSN | Vercel | `NEXT_PUBLIC_SENTRY_DSN` | customer-web env vars |
| Admin Web DSN | Vercel | `NEXT_PUBLIC_SENTRY_DSN` | admin-web env vars |
| Company Web DSN | Vercel/Netlify | `VITE_SENTRY_DSN` | company-web env vars |
| Customer Mobile DSN | Expo/EAS | Built into app config | customer-mobile |
| Washer Mobile DSN | Expo/EAS | Built into app config | washer-mobile |
| Auth Token | GitHub Environments | `SENTRY_AUTH_TOKEN` | CI — source map upload in deploy pipeline |

> **Note:** Each web app project in Vercel gets its OWN DSN. Do not share DSNs across projects — errors must route to the correct Sentry project.

---

## Billing Alert

- **Plan:** Free tier — 5,000 errors/month
- **Alert:** Set alert at **4,000 errors/mo** (80% threshold)
  - Settings -> Subscription -> Usage -> Set alert
- **Upgrade trigger:** If consistently hitting 4K+ errors/mo, evaluate Team plan ($26/mo)

---

## Post-Phase-8

- Phase 9: Fly.io secrets will include `SENTRY_DSN` and `SENTRY_ORG`
- Phase 9: Vercel env vars will include per-app `NEXT_PUBLIC_SENTRY_DSN` / `VITE_SENTRY_DSN`
- Phase 10: GitHub Environment `SENTRY_AUTH_TOKEN` set for CI source map upload
- Phase 10: Sentry release tagging and alert routing configuration

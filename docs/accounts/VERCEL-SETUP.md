# Cleanly - Vercel Account Setup

| Field | Value |
|-------|-------|
| Provider | Vercel |
| Tier | Hobby (free) |
| Cost | $0/mo |
| Dashboard | https://vercel.com |

---

## Prerequisites

- GitHub account (for Git integration)
- Gmail account (personal)

---

## Signup Checklist

1. Go to https://vercel.com
2. Click **Sign Up** -> **Continue with GitHub** (recommended for seamless Git integration)
3. Authorize Vercel to access your GitHub account
4. Select **Hobby** tier (free, sufficient for launch)
5. Complete account setup

> **NOTE:** Project linking and monorepo import is Phase 9. Phase 8 only creates the Vercel account.

### Create Deploy Token

6. Navigate to **Settings** -> **Tokens**
7. Click **Create Token**:
   - **Name:** `cleanly-ci-deploy`
   - **Scope:** Full Account
   - **Expiration:** No expiration (or 1 year)
8. Copy the token (shown once)

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| Email | Account settings | Personal Gmail or GitHub email |
| Deploy Token | Settings -> Tokens | `xxx` (long alphanumeric) |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Vercel** | `email` | Account email |
| | `deploy_token` | CI deploy token |

Vault: `Cleanly`
Tags: `hosting`, `vercel`, `deployment`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Deploy Token | GitHub Environments | `VERCEL_TOKEN` | CI — deploy pipeline |

---

## Billing Alert

- **Plan:** Hobby tier is free
- **No billing alert needed** unless upgrading to Pro ($20/mo)
- **Upgrade trigger:** If bandwidth exceeds 100GB/mo or need team features

---

## Post-Phase-8

- Phase 9: Import monorepo and link to Vercel projects (customer-web, admin-web, company-web)
- Phase 9: Set per-project environment variables (`NEXT_PUBLIC_*`, `VITE_*`, Sentry DSNs)
- Vercel Edge Network provides CDN for all web apps automatically
- Preview deployments per PR are included in Hobby tier

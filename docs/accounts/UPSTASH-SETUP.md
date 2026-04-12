# Cleanly - Upstash Redis Setup

| Field | Value |
|-------|-------|
| Provider | Upstash |
| Tier | Fixed Plan ($10/mo) |
| Cost | $10/mo |
| Dashboard | https://console.upstash.com |

---

## Prerequisites

- Gmail account (personal)
- Credit card for Fixed Plan billing

---

## Signup Checklist

1. Go to https://console.upstash.com
2. Click **Sign Up** -> Sign in with Google (use personal Gmail)
3. Navigate to **Redis** tab
4. Click **Create Database**:
   - **Name:** `cleanly-redis`
   - **Region:** Select closest to your primary server region (Singapore if Neon is ap-southeast-1, or Frankfurt)
   - **Type:** Regional (not Global)
5. **CRITICAL: Select Fixed Plan ($10/mo)**
   - After database creation, go to database settings or billing
   - The plan toggle may require scrolling — look for "Fixed Plan" vs "Pay-As-You-Go"
   - Select **Fixed Plan** at $10/mo

> **WARNING:** Do NOT use Pay-As-You-Go. BullMQ polls Redis continuously even when idle. PAYG billing is unpredictable and can reach $30-100+/mo. The Fixed Plan at $10/mo is predictable and sufficient for launch.

6. Set up payment method under Billing

---

## What to Capture

From the Upstash Redis database detail page:

| Field | Where to Find | Format |
|-------|---------------|--------|
| Connection string | Details tab -> "Redis URL" or "Endpoint" | `rediss://default:xxx@xxx.upstash.io:6379` |
| REST URL | Details tab -> "REST URL" | `https://xxx.upstash.io` |
| REST Token | Details tab -> "REST Token" | Long alphanumeric string |
| Password | Details tab -> "Password" | Alphanumeric string |

**CRITICAL:** Connection URL must start with `rediss://` (TLS). Upstash enforces TLS by default. If the URL starts with `redis://` (no `s`), something is wrong.

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Upstash Redis** | `connection_string` | `rediss://default:xxx@xxx.upstash.io:6379` |
| | `rest_url` | `https://xxx.upstash.io` |
| | `rest_token` | REST API token |
| | `password` | Database password |

Vault: `Cleanly`
Tags: `redis`, `upstash`, `bullmq`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Connection string | Fly.io | `UPSTASH_REDIS_URL` | API + Worker runtime (BullMQ, rate limiting, cache) |
| REST URL | Fly.io | `UPSTASH_REDIS_REST_URL` | API runtime (optional REST access) |
| REST Token | Fly.io | `UPSTASH_REDIS_REST_TOKEN` | API runtime (optional REST access) |

---

## Billing Alert

- **Plan:** Fixed Plan at $10/mo
- **Alert:** Set billing alert at **$15/mo** (catches unexpected upgrade or additional database)
  - Dashboard -> Account -> Billing -> Set alert
- **Payment method:** Must be set during signup for Fixed Plan

---

## Post-Phase-8

- Phase 9: Fly.io secrets will be set with `UPSTASH_REDIS_URL`
- BullMQ workers on Fly.io will connect using the TLS connection string
- Rate limiting middleware (`@fastify/rate-limit`) uses same Redis instance

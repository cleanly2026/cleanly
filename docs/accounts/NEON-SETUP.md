# Cleanly - Neon PostgreSQL Setup

| Field | Value |
|-------|-------|
| Provider | Neon |
| Tier | Free (0.5 GiB storage, 5 compute hours/mo) |
| Cost | $0/mo (free tier) |
| Dashboard | https://console.neon.tech |

---

## Prerequisites

- Gmail account (personal — will migrate to business email post-entity)
- Decision on region: **ap-southeast-1 (Singapore)** for lowest Gulf latency, or **eu-central-1 (Frankfurt)** as EU alternative

> **IMPORTANT:** Neon has NO Bahrain region. Singapore (ap-southeast-1) provides the lowest latency to UAE/Gulf users (~80ms). Frankfurt (eu-central-1) is the alternative if EU data residency matters. Choose during provisioning.

---

## Signup Checklist

1. Go to https://console.neon.tech
2. Click **Sign Up** -> Sign in with Google (use personal Gmail)
3. Create a new project:
   - **Project name:** `cleanly`
   - **Region:** `ap-southeast-1` (Singapore) or `eu-central-1` (Frankfurt) — user decides
   - **Postgres version:** Latest (16+)
   - **Database name:** `cleanly`
   - **Role name:** Leave default (`neondb_owner`)
4. Wait for project creation (~10 seconds)
5. On the connection details page, note the two connection strings (see below)

---

## What to Capture

From the Neon dashboard **Connection Details** panel:

| Field | Where to Find | Format |
|-------|---------------|--------|
| Pooled connection URL | Connection string dropdown -> "Pooled" toggle ON | `postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/cleanly?sslmode=require` |
| Direct connection URL | Connection string dropdown -> "Pooled" toggle OFF | `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/cleanly?sslmode=require` |
| Password | Shown once at project creation; also in Connection Details | Random string |

**CRITICAL:** The pooled URL contains `-pooler` in the hostname. The direct URL does NOT. Both are needed:
- **Pooled URL** (`DATABASE_URL`) — used at runtime by Prisma via `@prisma/adapter-neon` + PgBouncer
- **Direct URL** (`DIRECT_URL`) — used ONLY for `prisma migrate deploy` (migrations cannot run through PgBouncer)

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Neon** | `database_url_pooled` | Pooled connection string (contains `-pooler`) |
| | `direct_url` | Direct connection string (no `-pooler`) |
| | `password` | Database password |

Vault: `Cleanly`
Tags: `database`, `neon`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Pooled URL | Fly.io | `DATABASE_URL` | API + Worker runtime |
| Direct URL | Fly.io | `DIRECT_URL` | API runtime (migrations) |
| Direct URL | GitHub Environments | `NEON_DIRECT_URL` | CI — `prisma migrate deploy` in deploy pipeline |

---

## Billing Alert

- **Plan:** Free tier — 0.5 GiB storage, 5 compute hours/month
- **Alert:** Set usage alert at **80% of compute hours** (4 hours)
  - Dashboard -> Project Settings -> Usage -> Set alert threshold
- **Upgrade trigger:** If compute hours consistently exceed 4h/mo, evaluate Launch plan ($19/mo)

---

## Post-Phase-8

- Phase 9: Fly.io secrets will be set with `DATABASE_URL` and `DIRECT_URL`
- Phase 10: GitHub Environment secret `NEON_DIRECT_URL` set for CI migration pipeline
- Database branching can be used for safe schema migrations in staging

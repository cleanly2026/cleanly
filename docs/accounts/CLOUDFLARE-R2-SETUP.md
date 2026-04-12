# Cleanly - Cloudflare R2 Storage Setup

| Field | Value |
|-------|-------|
| Provider | Cloudflare R2 |
| Tier | Free (10GB storage, 1M Class A + 10M Class B ops/mo) |
| Cost | $0/mo (free tier) |
| Dashboard | https://dash.cloudflare.com -> R2 |

---

## Prerequisites

- Gmail account (personal) or existing Cloudflare account
- Credit card on file (Cloudflare requires it even for free tier R2)

---

## Signup Checklist

1. Go to https://dash.cloudflare.com
2. Sign up or log in with personal Gmail
3. Navigate to **R2 Object Storage** in the left sidebar
4. If first time, activate R2 (may require credit card on file)

### Create Bucket

5. Click **Create Bucket**:
   - **Bucket name:** `cleanly-photos`
   - **Location:** Automatic (or select closest to your server region)
6. Confirm bucket creation

### Set CORS Policy

7. Navigate to the `cleanly-photos` bucket -> **Settings** -> **CORS Policy**
8. Add the following CORS configuration:

```json
[{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "PUT", "DELETE"],
  "AllowedHeaders": ["content-type"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3000
}]
```

> **CRITICAL:** `AllowedHeaders` must be `["content-type"]` specifically, NOT `["*"]` (wildcard). This is per VCL-06 security requirement.

### Create R2 API Token

9. Navigate to **R2** -> **Manage R2 API Tokens** (or Account -> R2 API Tokens)
10. Click **Create API Token**:
    - **Token name:** `cleanly-api-rw`
    - **Permissions:** Object Read & Write
    - **Specify bucket(s):** Select `cleanly-photos` ONLY (not all buckets)
11. Copy the credentials immediately (shown once):
    - Access Key ID
    - Secret Access Key
12. Note your **Account ID** from the R2 overview page or Cloudflare dashboard sidebar

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| Account ID | Dashboard sidebar or R2 overview | 32-char hex string |
| Access Key ID | Shown at token creation | Alphanumeric string |
| Secret Access Key | Shown at token creation (once!) | Alphanumeric string |
| Public URL | R2 bucket settings (if public access enabled) | `https://pub-xxx.r2.dev` or custom domain |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Cloudflare R2** | `account_id` | 32-char hex |
| | `access_key_id` | R2 API token access key |
| | `secret_access_key` | R2 API token secret key |
| | `public_url` | Public bucket URL (if enabled) |

Vault: `Cleanly`
Tags: `storage`, `cloudflare`, `r2`, `photos`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Account ID | Fly.io | `R2_ACCOUNT_ID` | API runtime |
| Access Key ID | Fly.io | `R2_ACCESS_KEY_ID` | API runtime |
| Secret Access Key | Fly.io | `R2_SECRET_ACCESS_KEY` | API runtime |
| Bucket name | Fly.io | `R2_BUCKET_NAME` | API runtime (value: `cleanly-photos`) |
| Public URL | Fly.io | `R2_PUBLIC_URL` | API runtime |

---

## Billing Alert

- **Plan:** Free tier — 10GB storage, 1M Class A ops + 10M Class B ops/month
- **Alert:** Set storage alert at **8GB** (80% of free tier)
  - Dashboard -> R2 -> Usage monitoring
- **Note:** Zero egress fees (vs S3's $0.09/GB). At typical image workloads, R2 is 50-90x cheaper than S3 on egress.

---

## Post-Phase-8

- Phase 9: Fly.io secrets will include all R2 env vars
- Presigned URL generation (15-min TTL) for washer photo uploads is already implemented in v1.0
- Use `sharp` library for server-side image compression before R2 upload

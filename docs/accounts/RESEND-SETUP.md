# Cleanly - Resend Email Setup

| Field | Value |
|-------|-------|
| Provider | Resend |
| Tier | Free (3,000 emails/mo permanent) |
| Cost | $0/mo (free tier) |
| Dashboard | https://resend.com |

---

## Prerequisites

- Gmail account (personal)
- Access to DNS management for sender domain (e.g., Cloudflare DNS if using cleanly.ae or similar)

---

## Signup Checklist

1. Go to https://resend.com
2. Click **Get Started** -> Sign up with personal Gmail
3. Once in dashboard, navigate to **Domains** -> **Add Domain**
4. Enter your sender domain (e.g., `cleanly.ae` or `mail.cleanly.ae`)
5. Resend will provide DNS records to add:

### Domain Verification DNS Records

Add these records to your DNS provider (Cloudflare):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| TXT | `@` or subdomain | `resend-verification=...` | Domain ownership verification |
| MX | `@` or subdomain | `feedback-smtp.resend.com` | Bounce handling |
| TXT | `resend._domainkey` | DKIM public key (provided by Resend) | Email authentication (DKIM) |
| TXT | `@` | `v=spf1 include:resend.dev ~all` | SPF record |

6. Add all DNS records in your DNS provider
7. Return to Resend dashboard and click **Verify Domain**
8. Wait for verification (usually < 5 minutes, can take up to 24h for DNS propagation)
9. Navigate to **API Keys** -> **Create API Key**:
   - **Name:** `cleanly-api`
   - **Permission:** Sending access
   - **Domain:** Select your verified domain

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| API Key | API Keys page after creation | Starts with `re_` |
| Verified domain | Domains page | e.g., `cleanly.ae` |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Resend** | `api_key` | `re_...` |
| | `domain` | Verified sender domain |

Vault: `Cleanly`
Tags: `email`, `resend`, `notifications`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| API Key | Fly.io | `RESEND_API_KEY` | API runtime |

---

## Billing Alert

- **Plan:** Free tier — 3,000 emails/month (permanent, not trial)
- **No billing alert needed** unless upgrading to a paid plan
- **Upgrade trigger:** If sending >2,500 emails/mo consistently, evaluate Pro plan ($20/mo for 50K emails)

---

## Post-Phase-8

- Phase 9: Fly.io secrets will include `RESEND_API_KEY`
- React Email templates (JSX) can be used for rich HTML emails
- Delivery tracking available in Resend dashboard

# Cleanly - Google Play Console Setup

| Field | Value |
|-------|-------|
| Provider | Google Play Console |
| Tier | Personal developer account |
| Cost | $25 one-time registration fee |
| Dashboard | https://play.google.com/console |

---

## Prerequisites

- Google account (personal Gmail)
- Credit card or debit card for $25 registration fee
- Government-issued ID (for identity verification)

---

## Signup Checklist

1. Go to https://play.google.com/console
2. Click **Create a developer account**
3. Select **Personal** account type (acceptable per project decisions — will migrate to Organization post-entity)
4. Fill in developer details:
   - **Developer name:** Your name (will show as publisher until org migration)
   - **Email:** Personal Gmail
   - **Phone:** Your phone number
   - **Website:** Can leave blank for now
5. Pay the **$25 one-time registration fee**
6. Complete identity verification (may require ID upload)
7. Wait for account approval (usually 24-48 hours)

### Create Internal Testing Track

8. Once account is approved, create a new app:
   - **App name:** `Cleanly` (customer app)
   - **Default language:** English (US)
   - **App or game:** App
   - **Free or paid:** Free
9. Navigate to **Testing** -> **Internal testing**
10. Create an internal testing track:
    - **Track name:** `Internal Testing`
    - This allows distributing staging builds to testers without Play Store review
11. Add tester email addresses (at minimum, your own Gmail)

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| Email | Account email | Personal Gmail |
| Developer ID | Developer account settings | Numeric ID |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Google Play** | `email` | Account email |
| | `developer_id` | Numeric developer ID |

Vault: `Cleanly`
Tags: `mobile`, `android`, `google-play`, `distribution`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Service Account JSON | GitHub Environments | `GOOGLE_PLAY_SERVICE_ACCOUNT` | CI — automated Play Store uploads (Phase 10) |

> **Note:** Service Account for automated uploads is created in Phase 10 (CI/CD). Phase 8 only creates the developer account and internal testing track.

---

## Billing

- **Cost:** $25 one-time registration fee
- **No recurring billing** — no alert needed
- **Future:** If migrating to Organization account, there may be additional verification

---

## Post-Phase-8

- Phase 10: Create a Google Cloud Service Account for automated uploads via CI
- Phase 11: Upload first internal testing build via EAS Build
- Phase 11: Distribute to internal testers for staging validation
- Post-entity: Migrate from Personal to Organization developer account

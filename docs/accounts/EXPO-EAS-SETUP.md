# Cleanly - Expo EAS Account Setup

| Field | Value |
|-------|-------|
| Provider | Expo / EAS (Expo Application Services) |
| Tier | Free (with build queue) |
| Cost | $0/mo (free tier) |
| Dashboard | https://expo.dev |

---

## Prerequisites

- Gmail account (personal)
- Node.js 20+ installed locally
- Expo CLI: `npx expo` (comes with project)

---

## Signup Checklist

1. Go to https://expo.dev
2. Click **Sign Up** -> Create account
   - **Username:** `cleanly2026`
   - **Email:** Personal Gmail
3. Verify email address
4. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
5. Log in to EAS CLI:
   ```bash
   npx eas login
   ```
6. Verify account ownership:
   ```bash
   npx eas whoami
   # Should output: cleanly2026
   ```

### Verify Project IDs

Project IDs should already exist in the app config files:

7. Check `apps/customer-mobile/app.json`:
   - Verify `"owner": "cleanly2026"` is set
   - Verify `expo.extra.eas.projectId` exists
8. Check `apps/washer-mobile/app.json`:
   - Verify `"owner": "cleanly2026"` is set
   - Verify `expo.extra.eas.projectId` exists

If project IDs are missing, run in each mobile app directory:
```bash
cd apps/customer-mobile && npx eas init
cd apps/washer-mobile && npx eas init
```

### Create Access Token

9. Go to https://expo.dev -> **Account Settings** -> **Access Tokens**
10. Click **Create Token**:
    - **Name:** `cleanly-ci`
    - **Type:** Robot (for CI usage)
11. Copy the access token (shown once)

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| Email | Account settings | Personal Gmail |
| Password | Set at signup | (store securely) |
| Access Token | Account Settings -> Access Tokens | Long alphanumeric string |
| Customer Mobile Project ID | `apps/customer-mobile/app.json` -> `expo.extra.eas.projectId` | UUID |
| Washer Mobile Project ID | `apps/washer-mobile/app.json` -> `expo.extra.eas.projectId` | UUID |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Expo EAS** | `email` | Account email |
| | `password` | Account password |
| | `access_token` | CI robot token |

Vault: `Cleanly`
Tags: `mobile`, `expo`, `eas`, `builds`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Access Token | Fly.io | `EXPO_ACCESS_TOKEN` | Push notification sending from API |

> **Note:** EAS Build credentials are managed via `eas credentials` and stored in Expo's servers, not as env vars.

---

## Billing Alert

- **Plan:** Free tier — builds use a shared queue (may have wait times)
- **No billing alert needed** for free tier
- **Upgrade trigger:** If build queue wait time exceeds 15 minutes consistently, evaluate EAS Build priority plan ($99/mo)

---

## Post-Phase-8

- Phase 9: No Vercel/Fly.io action needed for Expo (Expo uses its own build infra)
- Phase 11: Run first EAS Build for both mobile apps
- Phase 11: Configure EAS Update (OTA) for hot-fix deployments without app store review
- Push notifications require development builds (not Expo Go) from SDK 52+

# Cleanly - Twilio Verify Setup

| Field | Value |
|-------|-------|
| Provider | Twilio |
| Tier | Pay-per-use |
| Cost | ~$0.05/OTP verification |
| Dashboard | https://console.twilio.com |

---

## Prerequisites

- Gmail account (personal)
- Credit card for pay-per-use billing

---

## Signup Checklist

1. Go to https://console.twilio.com
2. Click **Sign Up** -> Create account with personal Gmail
3. Verify your email and phone number
4. Complete the onboarding wizard:
   - **What do you plan to build?** -> "Phone verification"
   - **Language:** Node.js
5. Once in dashboard, navigate to **Verify** -> **Services**
6. Click **Create Service**:
   - **Friendly name:** `Cleanly OTP`
   - **Code length:** 6 (default)
   - **Channels:** Enable SMS (required), disable Voice/Email unless needed
7. Note the **Verify Service SID** (starts with `VA`)
8. Navigate to **Account** -> **Keys & Credentials** -> **API Keys** (or use Account SID + Auth Token from dashboard home)

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| Account SID | Dashboard home -> Account Info | Starts with `AC` |
| Auth Token | Dashboard home -> Account Info -> Show | Long alphanumeric string |
| Verify Service SID | Verify -> Services -> Cleanly OTP -> Service SID | Starts with `VA` |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Twilio** | `account_sid` | `AC...` |
| | `auth_token` | Auth token string |
| | `verify_service_sid` | `VA...` |

Vault: `Cleanly`
Tags: `sms`, `otp`, `twilio`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Account SID | Fly.io | `TWILIO_ACCOUNT_SID` | API runtime |
| Auth Token | Fly.io | `TWILIO_AUTH_TOKEN` | API runtime |
| Verify Service SID | Fly.io | `TWILIO_VERIFY_SERVICE_SID` | API runtime |

---

## Billing Alert

- **Plan:** Pay-per-use ($0.05/OTP verification)
- **Alert:** Set budget alert at **$20/mo**
  - Dashboard -> Billing -> Set Usage Triggers -> $20 threshold
- **Estimate:** At ~100 OTPs/day during beta = ~$5/mo

---

## Post-Phase-8

- Phase 9: Fly.io secrets will be set with all three Twilio vars
- UAE SMS delivery is reliable via Twilio Verify
- No sender ID needed for Verify (uses Twilio's shared pool)

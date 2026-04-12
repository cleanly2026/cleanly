# Cleanly - 360dialog WhatsApp Setup

| Field | Value |
|-------|-------|
| Provider | 360dialog |
| Tier | Standard |
| Cost | ~$50/mo per WhatsApp number |
| Dashboard | https://hub.360dialog.com |

---

## Prerequisites

- Gmail account (personal)
- WhatsApp Business-eligible phone number (dedicated to Cleanly — not a personal WhatsApp number)
- Facebook Business Manager account (for Meta template review)

---

## Signup Checklist

1. Go to https://hub.360dialog.com
2. Click **Sign Up** -> Create account with personal Gmail
3. Complete account verification
4. Connect your Facebook Business Manager account (required by Meta for WhatsApp Business API)
5. Register a phone number for WhatsApp Business API
6. Generate an API key from the 360dialog Hub dashboard

### Template Submission

> **Phase 8 success = templates SUBMITTED, not approved.** Meta review takes up to 48 hours. Submit templates on day 1 to maximize lead time.

7. Navigate to **Templates** -> **Create Template**
8. Submit the following message templates:

**Template 1: `booking_confirmation`**
- Category: UTILITY
- Language: English (en) + Arabic (ar)
- Body (en): "Your {{1}} booking with {{2}} is confirmed! Order #{{3}}. Your washer will arrive at {{4}}."
- Body (ar): "تم تأكيد حجز {{1}} مع {{2}}! رقم الطلب #{{3}}. سيصل الغاسل في {{4}}."

**Template 2: `order_status_update`**
- Category: UTILITY
- Language: English (en) + Arabic (ar)
- Body (en): "Order #{{1}} update: {{2}}. Track your order in the Cleanly app."
- Body (ar): "تحديث الطلب #{{1}}: {{2}}. تابع طلبك في تطبيق Cleanly."

**Template 3: `washer_arriving`**
- Category: UTILITY
- Language: English (en) + Arabic (ar)
- Body (en): "Your washer {{1}} is on the way! ETA: {{2}} minutes. Track live in the Cleanly app."
- Body (ar): "الغاسل {{1}} في الطريق! الوقت المتوقع: {{2}} دقائق. تابع مباشرة في تطبيق Cleanly."

9. Submit all templates for Meta review
10. Monitor approval status in the Templates section (allow up to 48h)

---

## What to Capture

| Field | Where to Find | Format |
|-------|---------------|--------|
| API Key | Hub dashboard -> API Keys | Alphanumeric string |
| Phone Number | Hub dashboard -> Numbers | International format (+971...) |
| Template names | Templates section after submission | `booking_confirmation`, `order_status_update`, `washer_arriving` |

---

## 1Password Storage

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - 360dialog** | `api_key` | API key string |
| | `phone_number` | WhatsApp Business number |

Vault: `Cleanly`
Tags: `whatsapp`, `360dialog`, `notifications`, `phase-8`

---

## Where Secrets Go

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| API Key | Fly.io | `DIALOG360_API_KEY` | API runtime (gated by `WHATSAPP_ENABLED`) |

> **Note:** WhatsApp sending is gated by `WHATSAPP_ENABLED=true` env var. Until templates are approved by Meta and the flag is set, WhatsApp notification code paths silently no-op with a log warning.

---

## Billing Alert

- **Plan:** ~$50/mo per WhatsApp number (flat fee, no per-message markup from 360dialog)
- **Alert:** Set payment method during signup
- **Note:** Meta charges per-conversation fees on top of the 360dialog flat fee. Monitor Meta billing separately via Facebook Business Manager.

---

## Post-Phase-8

- Monitor template approval status (up to 48h from submission)
- Once templates are approved, set `WHATSAPP_ENABLED=true` in Fly.io secrets
- Phase 9: Fly.io secrets will include `DIALOG360_API_KEY`
- At >5,000 WhatsApp messages/day, compare 360dialog flat fee vs Twilio per-message pricing

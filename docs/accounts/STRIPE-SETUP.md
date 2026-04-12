# Cleanly - Stripe + Stripe Connect UAE Setup

> **STATUS: DEFERRED -- Phase 8.5: Entity-gated provisioning**
>
> Stripe account creation and Stripe Connect UAE onboarding are blocked on UAE trade license issuance. This document is a placeholder with instructions for when the entity requirements are met.

| Field | Value |
|-------|-------|
| Provider | Stripe + Stripe Connect |
| Tier | Standard (2.9% + 30 fils per transaction) |
| Cost | Per-transaction fees |
| Dashboard | https://dashboard.stripe.com |

---

## Why Deferred

1. **Stripe account (ACCT-01):** A basic Stripe account can be created with a personal email, but AED currency enablement and full live mode activation benefit from entity documentation.

2. **Stripe Connect UAE (ACCT-02):** Stripe Connect in the UAE uses **manual onboarding** (not the self-serve Express onboarding flow). This requires:
   - Opening a Stripe support ticket
   - Providing UAE trade license documentation
   - Stripe manual review and approval (timeline: days to weeks)
   - This cannot be self-served through the dashboard

Until the UAE trade license is issued, both Stripe and Stripe Connect provisioning are deferred to Phase 8.5.

---

## What Will Be Needed (Phase 8.5)

When the trade license is ready, gather these before starting:

| Document / Info | Purpose |
|-----------------|---------|
| UAE trade license scan (PDF/JPG) | Stripe identity verification + Connect onboarding |
| Bank account details (AED account, IBAN) | Payout destination |
| Business email address | Account owner email (migrate from personal Gmail) |
| Business phone number | Account verification |
| Business address (trade license address) | Stripe compliance |
| Authorized representative details | KYC for Connect platform |

### Stripe Connect UAE Manual Onboarding Process

1. Create Stripe account at https://dashboard.stripe.com
2. Complete business verification with trade license
3. Enable AED currency in account settings
4. Contact Stripe Support to request Connect platform activation for UAE
5. Provide trade license and business documentation via support ticket
6. Wait for Stripe manual review and approval
7. Configure Connect settings: Destination Charges model, 15-20% platform commission
8. Set up webhook endpoints for payment events

---

## 1Password Storage (Placeholder)

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Stripe** | `secret_key_test` | `sk_test_...` |
| | `secret_key_live` | `sk_live_...` |
| | `publishable_key_test` | `pk_test_...` |
| | `publishable_key_live` | `pk_live_...` |
| | `webhook_secret_staging` | `whsec_...` |
| | `webhook_secret_production` | `whsec_...` |
| | `connect_webhook_secret` | `whsec_...` |

Vault: `Cleanly`
Tags: `payments`, `stripe`, `connect`, `phase-8.5`

---

## Where Secrets Go (Placeholder)

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Secret Key (test/live) | Fly.io | `STRIPE_SECRET_KEY` | API runtime |
| Webhook Secret | Fly.io | `STRIPE_WEBHOOK_SECRET` | API runtime |
| Connect Webhook Secret | Fly.io | `STRIPE_CONNECT_WEBHOOK_SECRET` | API runtime |
| Publishable Key (test/live) | Vercel | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | customer-web env vars |
| (none) | GitHub | — | No CI secrets needed for Stripe |

> **Note:** Use test mode keys (`sk_test_`, `pk_test_`) for staging. Switch to live keys (`sk_live_`, `pk_live_`) for production. The webhook secret must match the endpoint's registered webhook in Stripe dashboard.

---

## Billing Alert (Phase 8.5)

- **Plan:** Standard pricing (2.9% + AED 1.00 per successful charge)
- **Alert:** Set Stripe Radar alert for unusual transaction volume
- **Payout schedule:** T+5 for UAE accounts (5 business days)

---

## Critical Notes

- Stripe webhook endpoint requires **raw body handler** (not Fastify JSON parser) for signature verification — already implemented in v1.0
- Apple Pay and Google Pay support require domain verification in Stripe dashboard
- Connect uses Destination Charges model — platform receives full payment, then transfers to connected account minus commission

# Cleanly - Apple Developer Program + APNs p8 Key

> **STATUS: DEFERRED -- Phase 8.5: Entity-gated provisioning**
>
> Apple Developer Organization enrollment requires a D-U-N-S number tied to the UAE trade license. Enrolling under a personal Gmail creates costly rework (Apple ID association is effectively permanent). This document is a placeholder with instructions for when the entity requirements are met.

| Field | Value |
|-------|-------|
| Provider | Apple Developer Program |
| Tier | Organization ($99/yr) |
| Cost | $99/year |
| Dashboard | https://developer.apple.com |

---

## Why Deferred

1. **Organization enrollment requires D-U-N-S number:** Apple Developer Organization accounts require a Dun & Bradstreet D-U-N-S number, which is tied to a registered business entity. The UAE trade license must be issued first, then the D-U-N-S number can be obtained (free, takes 5-14 business days).

2. **Apple ID is permanent:** Enrolling under a personal Gmail now means the Apple Developer account is permanently tied to that personal Apple ID. Migrating later requires creating a new account and re-submitting apps. This is costly rework that should be avoided.

3. **APNs p8 key depends on enrollment:** The APNs authentication key (p8 format) can only be generated after Developer Program enrollment is complete. Push notifications in production require this key.

---

## What Will Be Needed (Phase 8.5)

When the trade license is ready, gather these before starting:

| Document / Info | Purpose |
|-----------------|---------|
| UAE trade license | D-U-N-S number application |
| D-U-N-S number | Apple Developer Organization enrollment |
| Business email address | Apple ID for the developer account (NOT personal Gmail) |
| $99 payment method | Annual Developer Program fee |
| Business legal name (matching trade license) | Enrollment application |
| Business phone number | Apple verification call |
| Business address | Enrollment details |

### Enrollment Process

1. **Get D-U-N-S number** (if not already assigned):
   - Go to https://developer.apple.com/enroll/duns-lookup/
   - Search for your business
   - If not found, request a free D-U-N-S number (5-14 business days)
2. Create a new Apple ID using the **business email** (not personal Gmail)
3. Go to https://developer.apple.com/programs/enroll/
4. Select **Organization** enrollment
5. Provide D-U-N-S number, business details, legal entity name
6. Pay $99/year annual fee
7. Wait for Apple review (24-48 hours typically)

### APNs p8 Key Generation

After enrollment is approved:

8. Go to https://developer.apple.com -> **Certificates, Identifiers & Profiles**
9. Navigate to **Keys** -> **Create a Key**
10. Enable **Apple Push Notifications service (APNs)**
11. Download the `.p8` key file (shown **once** -- save immediately)
12. Note the **Key ID** (10-character alphanumeric)
13. Note the **Team ID** from Membership page

### Create App IDs (Bundle Identifiers)

14. Navigate to **Identifiers** -> **App IDs**
15. Create two App IDs:
    - `com.cleanly.customer` — Customer mobile app
    - `com.cleanly.washer` — Washer mobile app
16. Enable capabilities: Push Notifications, Associated Domains (for deep linking)

---

## 1Password Storage (Placeholder)

| Item | Field | Value |
|------|-------|-------|
| **Cleanly - Apple Developer** | `team_id` | 10-char alphanumeric |
| | `key_id` | APNs key ID (10-char) |
| | `p8_key_file` | Contents of the `.p8` file (or file attachment) |
| | `bundle_id_customer` | `com.cleanly.customer` |
| | `bundle_id_washer` | `com.cleanly.washer` |

Vault: `Cleanly`
Tags: `mobile`, `apple`, `ios`, `push-notifications`, `phase-8.5`

---

## Where Secrets Go (Placeholder)

| Secret | Platform | Env Var Name | Scope |
|--------|----------|-------------|-------|
| Team ID | Expo app config | `expo.ios.teamId` | Built into app binary |
| Key ID | Fly.io | `APNS_KEY_ID` | API runtime (if sending push directly) |
| p8 Key contents | Fly.io | `APNS_KEY` | API runtime (if sending push directly) |
| (none) | GitHub | — | EAS Build handles Apple signing via `eas credentials` |

> **Note:** With Expo EAS, Apple signing credentials are managed via `eas credentials` and stored on Expo's servers. The APNs p8 key is needed if the API sends push notifications directly (outside of Expo Push Notifications service).

---

## Billing Alert (Phase 8.5)

- **Cost:** $99/year (auto-renews)
- **Alert:** Calendar reminder 30 days before renewal
- **Payment:** Credit card on Apple ID

---

## Critical Notes

- **Use p8 key format (NOT p12 certificate).** The p8 key does not expire and works across all apps in the team. The older p12 certificate format expires annually and requires per-app certificates.
- **Use production APNs environment (NOT sandbox).** APNs sandbox credentials will fail silently in production. The p8 key works for both environments — configure the environment flag correctly at send time.
- **TestFlight distribution** is available immediately after enrollment (no App Store review needed for beta testing).
- **App Store submission** requires privacy policy, screenshots, and app review (plan 1-2 weeks for first submission).

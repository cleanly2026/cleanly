# Milestones

## v1.0 MVP (Shipped: 2026-04-09)

**Phases completed:** 7 phases, 47 plans, 77 tasks
**Commits:** 201 | **Files:** 876 | **LOC:** ~22,400 TypeScript
**Timeline:** 10 days (2026-03-30 → 2026-04-09)

**Key accomplishments:**

1. **Turborepo monorepo** with 6 apps (customer-web, customer-mobile, company-web, washer-mobile, admin-web, API) + 6 shared packages, full CI pipeline with GitHub Actions
2. **Full booking-to-payout flow** — service discovery by city/category, on-site 7-state + carpet 10-state order lifecycles, Stripe Connect payouts with 15-20% platform commission
3. **Real-time washer GPS tracking** via Socket.io with animated map markers (800ms interpolation), ETA calculation, and before/after photo evidence via Cloudflare R2 presigned URLs
4. **Multi-channel bilingual notifications** — Expo push, Twilio SMS, 360dialog WhatsApp, and Resend email across 14 order lifecycle events in AR/EN
5. **Admin governance panel** — company review/reject workflow, dispute handling with photo evidence viewer, manual refunds, cities/categories CRUD, and audit log
6. **Bilingual Arabic RTL + English** across all 5 app surfaces from day 1 — CSS logical properties, Cairo font, next-intl/i18next, separate _en/_ar DB columns
7. **Four-role auth system** — customer phone OTP, washer OTP+PIN, company email/password+TOTP MFA, admin Google Workspace SSO
8. **Cross-phase integration fixes** — washer job dispatch loop (Phase 5), route prefix + socket room wiring (Phase 6), auth guards + requirements audit (Phase 7)

**Known limitations (from audit):**
- I18N-06: Map label Arabic switching — infrastructure in place, needs human verification on real map component
- WASH-04: Android Foreground Service GPS background tracking — code correct, needs real Samsung device test
- PAY-02: Wallet balance — explicitly scoped out of v1.0

**Phases:**
- Phase 1: Foundation (12 plans)
- Phase 2: Core Business Flow (12 plans)
- Phase 3: Real-Time & Washer App (9 plans)
- Phase 4: Supporting Systems & Admin (8 plans)
- Phase 5: Wire Washer Job Dispatch Loop (1 plan) — gap closure
- Phase 6: Fix Cross-Phase Route & Socket Wiring (3 plans) — gap closure
- Phase 7: Auth Guards & Housekeeping (2 plans) — gap closure

**Archives:**
- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
- [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)

---

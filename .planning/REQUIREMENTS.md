# Requirements: ROFAN

**Defined:** 2026-03-31
**Core Value:** A customer can book a cleaning service, pay securely, and track their washer arriving in real-time — the full end-to-end booking-to-completion flow must work flawlessly.

## v1 Requirements

Requirements for private beta launch. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: Customer can sign up and log in via phone OTP (Twilio Verify)
- [x] **AUTH-02**: Customer session persists across app restart (JWT access + refresh tokens)
- [x] **AUTH-03**: Company admin can log in with email and bcrypt password
- [x] **AUTH-04**: Company admin account requires TOTP MFA for payout access
- [x] **AUTH-05**: Washer can log in via phone OTP + 4-digit PIN
- [x] **AUTH-06**: Platform admin can log in via Google Workspace SSO only
- [x] **AUTH-07**: Rate limiting enforced on OTP endpoints (3/phone/15min)

### Discovery

- [ ] **DISC-01**: Customer can browse three service categories (car wash, carpet, sofa)
- [ ] **DISC-02**: Customer's city is auto-detected via GPS with manual fallback
- [ ] **DISC-03**: Customer can view company listings filtered by city and category
- [x] **DISC-04**: Company listings show name, rating, price range, review count, and logo
- [ ] **DISC-05**: Customer can view a company profile with packages, add-ons, and reviews

### Booking (On-Site — Car Wash + Sofa)

- [ ] **BOOK-01**: Customer can select a package with quantity (per vehicle / per seat)
- [ ] **BOOK-02**: Customer can add optional add-ons to their booking
- [ ] **BOOK-03**: Customer can pin their service location on a map with a parking/address note
- [ ] **BOOK-04**: Customer sees order summary with subtotal, add-ons, platform fee, and total before payment

### Booking (Carpet — Pickup & Return)

- [ ] **CARP-01**: Customer can select carpet cleaning package with quantity (number of carpets/rooms)
- [ ] **CARP-02**: Customer can select a pickup time slot for carpet collection
- [x] **CARP-03**: Customer can see and agree to an estimated return date at booking time
- [ ] **CARP-04**: Customer can reschedule the return date before carpet is out for delivery
- [ ] **CARP-05**: Carpet order follows 10-state lifecycle (pending → accepted → pickup_scheduled → picked_up → in_cleaning → ready_for_return → return_scheduled → out_for_return → returned → completed)

### Payments

- [ ] **PAY-01**: Customer can pay via Stripe (card, Apple Pay, Google Pay)
- [x] **PAY-02**: Customer can pay using wallet balance (topped up via Stripe)
- [ ] **PAY-03**: Platform commission (15-20%) is auto-deducted before company payout
- [x] **PAY-04**: Company receives payout via Stripe Connect with 7-14 day delay after completion
- [ ] **PAY-05**: Stripe webhook handles payment capture, refunds, and disputes
- [x] **PAY-06**: Refund flow reverses transfer before issuing customer refund

### Order Lifecycle (On-Site)

- [ ] **ORD-01**: On-site order follows 7-state lifecycle (pending → accepted → washer_assigned → washer_en_route → in_progress → completed + cancelled)
- [ ] **ORD-02**: Company receives real-time notification when new order is placed
- [ ] **ORD-03**: Company can assign a washer to an accepted order
- [x] **ORD-04**: Washer can accept or decline job assignment (30s timer)
- [ ] **ORD-05**: Order state transitions use database-level locking to prevent race conditions
- [ ] **ORD-06**: Customer can cancel order with policy enforcement (free before arrival, fee after)

### Real-Time Tracking

- [ ] **RT-01**: Washer location broadcasts every 5-10s via Socket.io during en_route and in_progress
- [x] **RT-02**: Customer sees live washer dot on map during on-site service
- [x] **RT-03**: Customer sees live washer dot during carpet pickup and carpet return delivery
- [ ] **RT-04**: Socket.io uses Redis adapter from first deployment for horizontal scaling
- [ ] **RT-05**: Washer location cached in Redis (not written to DB per GPS ping)

### Photo Evidence

- [ ] **PHO-01**: Washer uploads before photo when arriving at on-site job
- [ ] **PHO-02**: Washer uploads after photo when completing on-site job
- [ ] **PHO-03**: Washer uploads pickup photo when collecting carpet (condition + quantity)
- [ ] **PHO-04**: Washer uploads return photo when delivering cleaned carpet
- [ ] **PHO-05**: Photos uploaded via presigned R2 URLs (not proxied through API)
- [ ] **PHO-06**: Photo upload has retry logic for poor mobile connections

### Washer App

- [ ] **WASH-01**: Washer can go online/offline to receive job assignments
- [ ] **WASH-02**: Washer sees new job alert with accept/decline and countdown timer
- [ ] **WASH-03**: Washer can launch Google Maps navigation to customer location
- [ ] **WASH-04**: Washer app tracks GPS in background using Android Foreground Service
- [ ] **WASH-05**: Washer can complete per-category service checklist during job
- [ ] **WASH-06**: Washer can mark job as complete (triggers after photo + payout queue)

### Company Dashboard

- [ ] **COMP-01**: Company can set up profile with bilingual fields (name, description in EN + AR)
- [ ] **COMP-02**: Company can manage city coverage and service categories
- [x] **COMP-03**: Company can create/edit/delete packages and add-ons with bilingual names
- [x] **COMP-04**: Company can manage washer staff accounts
- [x] **COMP-05**: Company sees live order feed with real-time updates
- [x] **COMP-06**: Company can assign washers to incoming orders
- [ ] **COMP-07**: Company can complete Stripe Connect onboarding for payouts

### Admin Panel

- [ ] **ADM-01**: Admin can review and verify/reject company applications
- [ ] **ADM-02**: Admin can view platform-wide order list and details
- [ ] **ADM-03**: Admin can manage cities and service categories
- [ ] **ADM-04**: Admin can handle disputes with photo evidence viewer
- [ ] **ADM-05**: Admin can issue manual refunds
- [ ] **ADM-06**: Admin can view audit log of all admin actions

### Bilingual (AR/EN)

- [x] **I18N-01**: All UI strings use i18n keys — no hardcoded English
- [x] **I18N-02**: Arabic mode uses RTL layout with CSS logical properties throughout
- [x] **I18N-03**: Database content fields have _en and _ar columns (not JSON)
- [x] **I18N-04**: Customer can switch language; preference persists to profile
- [x] **I18N-05**: Arabic font (Cairo) loaded with zero CLS
- [x] **I18N-06**: Map labels switch to Arabic when AR mode is active

### Notifications

- [ ] **NOTF-01**: Push notification sent on key order status changes (Expo Push)
- [ ] **NOTF-02**: SMS sent for order confirmation and washer arrival (Twilio)
- [ ] **NOTF-03**: WhatsApp notification for order confirmation (360dialog)
- [ ] **NOTF-04**: Email receipt sent after order completion (Resend)
- [ ] **NOTF-05**: All notifications sent in customer's preferred language

### Infrastructure

- [x] **INFRA-01**: Turborepo monorepo with 6 apps and shared packages
- [x] **INFRA-02**: Prisma schema with all tables including both order lifecycle models
- [x] **INFRA-03**: Fastify API server on persistent host (Railway/Fly.io) with Socket.io
- [x] **INFRA-04**: Neon PostgreSQL (Bahrain region) with connection pooling
- [x] **INFRA-05**: Upstash Redis (Fixed Plan) for caching, rate limiting, and Socket.io adapter
- [x] **INFRA-06**: BullMQ workers with graceful shutdown and idempotent job handlers
- [x] **INFRA-07**: Cloudflare R2 for photo storage with signed URLs only
- [x] **INFRA-08**: GitHub Actions CI pipeline (lint + typecheck + test per PR)
- [x] **INFRA-09**: Sentry error tracking on all 5 app surfaces
- [x] **INFRA-10**: Zod validation on every API endpoint

## v2 Requirements

Deferred to post-private-beta. Tracked but not in current roadmap.

### Retention & Growth

- **RET-01**: Loyalty points earned per completed order
- **RET-02**: Points redeemable as wallet credit at checkout
- **RET-03**: Promo code engine (percentage and fixed discounts, expiry, category/city scoping)
- **RET-04**: Referral program (customer gets credit for inviting friends)
- **RET-05**: 1-tap rebook from order history
- **RET-06**: Scheduled bookings (future date + time slot for on-site services)

### Company Tools

- **CTOOL-01**: Revenue analytics dashboard (orders by day/week/month)
- **CTOOL-02**: Washer performance metrics (ratings, jobs, on-time rate)
- **CTOOL-03**: Payout history with PDF invoice download
- **CTOOL-04**: Company-level promo code creation
- **CTOOL-05**: Holiday/unavailability schedule management

### Enhanced Features

- **ENH-01**: Preferred washer selection for repeat customers
- **ENH-02**: Eco-friendly / verified company badges
- **ENH-03**: Real-time ETA with Google Maps Distance Matrix
- **ENH-04**: In-app photo timeline for order history

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| In-app chat / messaging | Creates off-platform dynamics and support burden; use WhatsApp deep-links instead |
| Instant auto-dispatch (platform assigns washer) | Breaks marketplace trust model; companies must control their staff |
| Subscriptions / recurring bookings | Different payment logic and cancellation handling; defer to v2+ |
| AI pricing recommendations | Needs 1000+ orders of training data; premature at launch |
| AI chatbot for support | Arabic LLM quality unreliable; hallucination risk; defer until support volume justifies |
| B2B / fleet / corporate accounts | Completely different sales motion and billing; Phase 3+ |
| Multi-region expansion (KSA, Egypt) | Launch UAE first; expand after unit economics are positive |
| New service categories (mattress, curtain) | Validate core 3 categories first |
| Real-time availability calendar | Company scheduling is fluid; stale data causes false expectations |
| Payment splitting / group booking | <1% use case; significant complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| I18N-01 | Phase 1 | Complete |
| I18N-02 | Phase 1 | Complete |
| I18N-03 | Phase 1 | Complete |
| I18N-04 | Phase 1 | Complete |
| I18N-05 | Phase 1 | Complete |
| I18N-06 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Complete |
| INFRA-07 | Phase 1 | Complete |
| INFRA-08 | Phase 1 | Complete |
| INFRA-09 | Phase 1 | Complete |
| INFRA-10 | Phase 1 | Complete |
| DISC-01 | Phase 2 | Pending |
| DISC-02 | Phase 2 | Pending |
| DISC-03 | Phase 2 | Pending |
| DISC-04 | Phase 2 | Complete |
| DISC-05 | Phase 2 | Pending |
| BOOK-01 | Phase 2 | Pending |
| BOOK-02 | Phase 2 | Pending |
| BOOK-03 | Phase 2 | Pending |
| BOOK-04 | Phase 2 | Pending |
| CARP-01 | Phase 2 | Pending |
| CARP-02 | Phase 2 | Pending |
| CARP-03 | Phase 2 | Complete |
| CARP-04 | Phase 2 | Pending |
| CARP-05 | Phase 2 | Pending |
| PAY-01 | Phase 2 | Pending |
| PAY-02 | Phase 2 | Complete |
| PAY-03 | Phase 2 | Pending |
| PAY-04 | Phase 2 | Complete |
| PAY-05 | Phase 2 | Pending |
| PAY-06 | Phase 2 | Complete |
| ORD-01 | Phase 2 | Pending |
| ORD-02 | Phase 2 | Pending |
| ORD-03 | Phase 2 | Pending |
| ORD-04 | Phase 2 | Complete |
| ORD-05 | Phase 2 | Pending |
| ORD-06 | Phase 2 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| COMP-05 | Phase 2 | Complete |
| COMP-06 | Phase 2 | Complete |
| COMP-07 | Phase 2 | Pending |
| RT-01 | Phase 3 | Pending |
| RT-02 | Phase 3 | Complete |
| RT-03 | Phase 3 | Complete |
| RT-04 | Phase 3 | Pending |
| RT-05 | Phase 3 | Pending |
| PHO-01 | Phase 3 | Pending |
| PHO-02 | Phase 3 | Pending |
| PHO-03 | Phase 3 | Pending |
| PHO-04 | Phase 3 | Pending |
| PHO-05 | Phase 3 | Pending |
| PHO-06 | Phase 3 | Pending |
| WASH-01 | Phase 3 | Pending |
| WASH-02 | Phase 3 | Pending |
| WASH-03 | Phase 3 | Pending |
| WASH-04 | Phase 3 | Pending |
| WASH-05 | Phase 3 | Pending |
| WASH-06 | Phase 3 | Pending |
| NOTF-01 | Phase 4 | Pending |
| NOTF-02 | Phase 4 | Pending |
| NOTF-03 | Phase 4 | Pending |
| NOTF-04 | Phase 4 | Pending |
| NOTF-05 | Phase 4 | Pending |
| ADM-01 | Phase 4 | Pending |
| ADM-02 | Phase 4 | Pending |
| ADM-03 | Phase 4 | Pending |
| ADM-04 | Phase 4 | Pending |
| ADM-05 | Phase 4 | Pending |
| ADM-06 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 84 total
- Mapped to phases: 84
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation — traceability populated*

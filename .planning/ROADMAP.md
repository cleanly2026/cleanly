# Roadmap: ROFAN

## Overview

Four phases deliver the complete private beta: Foundation lays the monorepo, database schema, auth for all four roles, and RTL/i18n infrastructure — everything that must be correct before any UI is written. Core Business Flow builds the full booking-to-payout loop across both order models (7-state on-site and 10-state carpet pickup-return), company dashboard, and Stripe Connect payouts. Real-Time & Washer App adds GPS tracking, photo evidence, and the washer mobile app — the "wow moment" features that make the live service feel real. Supporting Systems & Admin completes the platform with multi-channel notifications, admin governance panel, and private-beta readiness across all 5 surfaces.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Monorepo scaffold, Neon/Prisma schema, all-role auth, RTL/i18n infrastructure
- [ ] **Phase 2: Core Business Flow** - Discovery, booking (on-site + carpet), payments, order lifecycles, company dashboard
- [ ] **Phase 3: Real-Time & Washer App** - GPS tracking, photo evidence, washer mobile app, customer mobile tracking
- [ ] **Phase 4: Supporting Systems & Admin** - Multi-channel notifications, admin panel, private beta readiness

## Phase Details

### Phase 1: Foundation
**Goal**: The monorepo is running, the full database schema is deployed (including both order state machines), all four authentication paths work, and RTL/Arabic infrastructure is in place — no user-facing features yet, but every subsequent phase can build on this without retrofitting.
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, INFRA-10, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06
**Success Criteria** (what must be TRUE):
  1. A customer can sign up with phone OTP, receive a code, and get back a working JWT that persists across app restart
  2. A washer can log in with phone OTP and 4-digit PIN successfully
  3. A company admin can log in with email/password and complete TOTP MFA challenge
  4. A platform admin can log in via Google Workspace SSO only
  5. Switching the app to Arabic renders the full layout in RTL with Cairo font — no hardcoded English strings visible
**Plans**: 12 plans

Plans:
- [x] 01-01-PLAN.md — Turborepo monorepo scaffold: 6 apps + 6 packages
- [x] 01-02-PLAN.md — Shared type contracts, bilingual i18n locale files, Tailwind config
- [ ] 01-03-PLAN.md — GitHub Actions CI pipeline + Sentry scaffolds
- [ ] 01-04-PLAN.md — Complete Prisma schema (15 tables) + Neon deploy + PostGIS indexes
- [ ] 01-05-PLAN.md — Fastify API skeleton + Redis singleton + BullMQ worker
- [ ] 01-06-PLAN.md — Customer OTP auth + washer OTP+PIN auth routes
- [ ] 01-07-PLAN.md — Company admin TOTP MFA + admin Google SSO routes
- [ ] 01-08-PLAN.md — next-intl RTL setup for web apps + Expo i18next setup
- [ ] 01-09-PLAN.md — Cloudflare R2 storage client scaffold
- [ ] 01-10-PLAN.md — Custom auth UI components (OtpInput, PinInput, PhoneInput, LanguageToggle, AuthCard)
- [ ] 01-11-PLAN.md — Auth screens wired to API (customer, company, admin)
- [ ] 01-12-PLAN.md — Human verification: all 5 Phase 1 success criteria
**UI hint**: yes

### Phase 2: Core Business Flow
**Goal**: A customer can discover cleaning companies by city and category, select a package, book either an on-site service or a carpet pickup-return, pay via Stripe, and have the order progress through its complete lifecycle — including company acceptance, washer assignment, and Stripe Connect payout to the company.
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, BOOK-01, BOOK-02, BOOK-03, BOOK-04, CARP-01, CARP-02, CARP-03, CARP-04, CARP-05, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, ORD-01, ORD-02, ORD-03, ORD-04, ORD-05, ORD-06, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07
**Success Criteria** (what must be TRUE):
  1. Customer can browse car wash, carpet, and sofa categories and see companies filtered to their GPS-detected city
  2. Customer can complete a full on-site booking (package + add-ons + location pin + Stripe payment) and reach a confirmed order screen
  3. Customer can complete a carpet booking (package + pickup slot + return date agreement) and reach a confirmed order screen
  4. Company admin sees the new order in their dashboard in real time and can assign a washer
  5. On-site order advances through all 7 states to completion; carpet order advances through all 10 states to completion
  6. Company receives a Stripe Connect payout (with platform commission deducted) after order completion
**Plans**: TBD
**UI hint**: yes

### Phase 3: Real-Time & Washer App
**Goal**: A washer can receive a job alert, navigate to the customer, broadcast their live GPS location, upload before/after photos, complete a service checklist, and mark the job done — and the customer sees the washer dot moving on their map in real time during the entire service.
**Depends on**: Phase 2
**Requirements**: RT-01, RT-02, RT-03, RT-04, RT-05, PHO-01, PHO-02, PHO-03, PHO-04, PHO-05, PHO-06, WASH-01, WASH-02, WASH-03, WASH-04, WASH-05, WASH-06
**Success Criteria** (what must be TRUE):
  1. Customer sees a live washer dot on the map updating every 5-10 seconds during on-site service (and during carpet pickup/return)
  2. Washer can accept a job with the 30-second countdown timer, launch Google Maps navigation, and go online/offline
  3. Washer uploads before and after photos via presigned R2 URL with retry on poor connection — photos appear in the customer's order view
  4. GPS continues broadcasting when the washer app is backgrounded on Android (Foreground Service confirmed working on real Samsung device with battery saver)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Supporting Systems & Admin
**Goal**: Customers and washers receive timely notifications across all channels in their preferred language, platform admins can review companies, manage disputes with photo evidence, and issue refunds — and the platform is ready to invite private beta users across all 5 app surfaces.
**Depends on**: Phase 3
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06
**Success Criteria** (what must be TRUE):
  1. Customer receives push notification, SMS, and WhatsApp message (in their set language) when order status changes at key milestones
  2. Customer receives an email receipt after order completion (in their set language)
  3. Platform admin can review a company application, approve or reject it, and the company status updates immediately
  4. Platform admin can view a disputed order's before/after photos and issue a manual refund
  5. All 5 app surfaces (customer web, customer mobile, company dashboard, washer mobile, admin panel) are functional end-to-end for private beta invitations
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/12 | In Progress|  |
| 2. Core Business Flow | 0/TBD | Not started | - |
| 3. Real-Time & Washer App | 0/TBD | Not started | - |
| 4. Supporting Systems & Admin | 0/TBD | Not started | - |

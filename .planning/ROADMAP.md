# Roadmap: ROFAN

## Overview

Four phases deliver the complete private beta: Foundation lays the monorepo, database schema, auth for all four roles, and RTL/i18n infrastructure — everything that must be correct before any UI is written. Core Business Flow builds the full booking-to-payout loop across both order models (7-state on-site and 10-state carpet pickup-return), company dashboard, and Stripe Connect payouts. Real-Time & Washer App adds GPS tracking, photo evidence, and the washer mobile app — the "wow moment" features that make the live service feel real. Supporting Systems & Admin completes the platform with multi-channel notifications, admin governance panel, and private-beta readiness across all 5 surfaces.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Monorepo scaffold, Neon/Prisma schema, all-role auth, RTL/i18n infrastructure
- [x] **Phase 2: Core Business Flow** - Discovery, booking (on-site + carpet), payments, order lifecycles, company dashboard
- [x] **Phase 3: Real-Time & Washer App** - GPS tracking, photo evidence, washer mobile app, customer mobile tracking
- [x] **Phase 4: Supporting Systems & Admin** - Multi-channel notifications, admin panel, private beta readiness
- [x] **Phase 5: Wire Washer Job Dispatch Loop** - Server job:alert emission, client handler wiring, accept/decline socket handlers (completed 2026-04-08)
- [ ] **Phase 6: Fix Cross-Phase Route & Socket Wiring** - Route prefix 404 fix, company socket join fix, companyId auth wiring
- [ ] **Phase 7: Auth Guards & Housekeeping** - Company-web route guard, env assertion fix, stale checkbox cleanup

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
- [x] 01-03-PLAN.md — GitHub Actions CI pipeline + Sentry scaffolds
- [x] 01-04-PLAN.md — Complete Prisma schema (15 tables) + Neon deploy + PostGIS indexes
- [x] 01-05-PLAN.md — Fastify API skeleton + Redis singleton + BullMQ worker
- [x] 01-06-PLAN.md — Customer OTP auth + washer OTP+PIN auth routes
- [x] 01-07-PLAN.md — Company admin TOTP MFA + admin Google SSO routes
- [x] 01-08-PLAN.md — next-intl RTL setup for web apps + Expo i18next setup
- [x] 01-09-PLAN.md — Cloudflare R2 storage client scaffold
- [x] 01-10-PLAN.md — Custom auth UI components (OtpInput, PinInput, PhoneInput, LanguageToggle, AuthCard)
- [x] 01-11-PLAN.md — Auth screens wired to API (customer, company, admin)
- [x] 01-12-PLAN.md — Human verification: all 5 Phase 1 success criteria
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
**Plans**: 12 plans

Plans:
- [x] 02-01-PLAN.md — Schema migration + shared type contracts (Zod schemas, i18n keys)
- [x] 02-02-PLAN.md — Client infrastructure (TanStack Query, Socket.io, company-web i18n/router) [DONE: 2026-04-02, 15min, 2 tasks, 11 files]
- [x] 02-03-PLAN.md — Discovery API + customer-web UI (home, company listing, company profile)
- [x] 02-04-PLAN.md — Booking API (on-site + carpet order creation, Stripe PaymentIntent, order service)
- [x] 02-05-PLAN.md — Company management API (profile, services, packages, washers, Stripe Connect) [DONE: 2026-04-03, 25min, 2 tasks, 7 files]
- [x] 02-06-PLAN.md — Customer booking UI (on-site, carpet, payment, confirmation screens)
- [x] 02-07-PLAN.md — Order lifecycle API (state transitions, washer assignment, cancellation)
- [x] 02-08-PLAN.md — Stripe webhooks + BullMQ order worker (payment confirm, payouts, refunds)
- [x] 02-09-PLAN.md — Company dashboard order feed UI (data table, real-time updates, washer assignment) [DONE: 2026-04-02, 4min, 2 tasks, 14 files]
- [x] 02-10-PLAN.md — [GAP CLOSURE] Package CRUD + washer management API (COMP-03, COMP-04)
- [x] 02-11-PLAN.md — [GAP CLOSURE] BullMQ order worker: payouts, timeouts, refunds (PAY-04, PAY-06, ORD-04)
- [x] 02-12-PLAN.md — [GAP CLOSURE] Wire OrderFeed into company-web router (COMP-05, COMP-06)
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
**Plans**: 9 plans

Plans:
- [x] 03-01-PLAN.md — Prisma migration (photo columns) + Socket.io Redis adapter + GPS handlers + API routes
- [x] 03-02-PLAN.md — Washer mobile foundation: packages, GPS task, socket, hooks, home dashboard
- [x] 03-03-PLAN.md — Customer mobile foundation: packages, socket, tracking + ETA hooks
- [x] 03-04-PLAN.md — Washer job alert (30s countdown takeover) + en route (map + navigation)
- [x] 03-05-PLAN.md — Washer active job (checklist) + photo upload + job completion flow
- [x] 03-06-PLAN.md — Customer live tracking map + order complete with photos
- [x] 03-07-PLAN.md — Human verification: all 4 Phase 3 success criteria
- [x] 03-08-PLAN.md — [GAP CLOSURE] AuthContext for washer-mobile + GPS userId fix (RT-01, WASH-01, WASH-02, WASH-06)
- [x] 03-09-PLAN.md — [GAP CLOSURE] Wire photo URLs to customer tracking screen (PHO-01, PHO-02)
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
**Plans**: 8 plans

Plans:
- [x] 04-01-PLAN.md — Schema migration (Dispute + push token) + notification service files + bilingual copy
- [x] 04-02-PLAN.md — Admin guard plugin + all admin API routes (companies, orders, disputes, cities, audit log, refunds)
- [x] 04-03-PLAN.md — Notification worker dispatch + lifecycle route integration + push token registration
- [x] 04-04-PLAN.md — Admin-web sidebar + dashboard + company review pages
- [x] 04-05-PLAN.md — Admin-web disputes/refund + orders + cities/categories + audit log pages
- [x] 04-06-PLAN.md — Customer dispute initiation (API + web UI) + Report Issue flow
- [x] 04-07-PLAN.md — Seed script + error boundaries + manual verification checkpoint
- [x] 04-08-PLAN.md — [GAP CLOSURE] Company rejection email handler + dashboard stats wiring
**UI hint**: yes

### Phase 5: Wire Washer Job Dispatch Loop
**Goal**: The washer job dispatch loop works end-to-end — when a company assigns a washer, the washer receives an in-app job alert, can accept/decline within the countdown timer, and the server processes the response to advance the order lifecycle.
**Depends on**: Phase 3
**Requirements**: WASH-02, ORD-03, ORD-04
**Gap Closure:** Closes INT-02, INT-03, INT-04 from v1.0 audit. Fixes Flow 3 (Washer Job Alert Dispatch).
**Success Criteria** (what must be TRUE):
  1. Server emits `job:alert` to `washer:{userId}` room when company assigns a washer
  2. Washer-mobile receives the alert and navigates to the job alert screen with 30s countdown
  3. `job:accept` and `job:decline` socket events are handled by the server and update order state accordingly
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Server job-dispatch module + job:alert emission + client handleJobAlert fix
**UI hint**: no

### Phase 6: Fix Cross-Phase Route & Socket Wiring
**Goal**: Washer status transitions succeed (no more 404), company dashboard receives real-time events, and company orders load for the authenticated company — completing the on-site order lifecycle and real-time company dashboard flows.
**Depends on**: Phase 5
**Requirements**: WASH-06, ORD-01, ORD-02, PAY-04, NOTF-01, NOTF-02, NOTF-03, NOTF-04, COMP-05, COMP-06
**Gap Closure:** Closes INT-01, INT-05 from v1.0 audit + companyId TODO tech debt. Fixes Flow 1 (On-Site Order Lifecycle) and Flow 2 (Real-Time Company Dashboard).
**Success Criteria** (what must be TRUE):
  1. Washer PATCH to order status endpoint returns 200 (not 404) — order transitions to `in_progress` and `completed`
  2. Company-web joins the correct socket room and receives `order:new` and `order:status-changed` events in real time
  3. Company dashboard loads orders scoped to the authenticated company (not TODO placeholder)
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Add /api prefix to all server route registrations + align client URLs
- [ ] 06-02-PLAN.md — Company-web auth context + socket join fix (companyId wiring + INT-05)
- [ ] 06-03-PLAN.md — Integration tests for route prefix, socket join, and company order scoping (D-04)


**UI hint**: no

### Phase 7: Auth Guards & Housekeeping
**Goal**: Company-web routes are protected behind authentication, crash-risk env assertions are safe, and all planning artifacts accurately reflect the verified state of requirements.
**Depends on**: Phase 6
**Requirements**: AUTH-03, AUTH-04
**Gap Closure:** Closes company-web route guard gap, env assertion tech debt, 22 stale checkboxes, PAY-02 misleading checkbox, dead queue cleanup.
**Success Criteria** (what must be TRUE):
  1. Unauthenticated access to company-web `/orders`, `/packages`, `/washers` redirects to login
  2. API server starts without crash even when ADMIN_EXCHANGE_SECRET env var is missing (graceful error)
  3. REQUIREMENTS.md checkboxes match verification status for all 84 requirements
**Plans**: 0 plans

Plans:
(none yet — run `/gsd:plan-phase 7`)
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 12/12 | Complete |  |
| 2. Core Business Flow | 12/12 | Complete |  |
| 3. Real-Time & Washer App | 9/9 | Complete |  |
| 4. Supporting Systems & Admin | 8/8 | Complete |  |
| 5. Wire Washer Job Dispatch Loop | 1/1 | Complete   | 2026-04-08 |
| 6. Fix Cross-Phase Route & Socket Wiring | 1/3 | In Progress|  |
| 7. Auth Guards & Housekeeping | 0/0 | Not Started |  |

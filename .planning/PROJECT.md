# Cleanly

## What This Is

On-demand mobile cleaning services marketplace for the Gulf region (UAE, Saudi Arabia, Egypt). Three service types with two delivery models: **Car wash** and **sofa cleaning** — the washer comes to the client and cleans on-site. **Carpet cleaning** — the washer collects the carpet from the client, cleans it at the company's facility, and returns it on a pre-agreed date (pickup → clean → return model). Customers choose from verified companies, pay through the app, and track service progress. Built as a bilingual Arabic (RTL) + English platform across 5 app surfaces: customer web, customer mobile, company dashboard, washer mobile app, and admin panel.

## Core Value

A customer can book a cleaning service, pay securely, and track their washer arriving in real-time — the full end-to-end booking-to-completion flow must work flawlessly.

## Current Milestone: v1.1 Ship to Production

**Goal:** Take the complete v1.0 codebase from local development to a deployed, testable, and production-ready platform — with all third-party accounts configured, staging environment validated, and mobile apps distributed to beta testers.

**Target features:**
- Third-party account setup (Stripe, Twilio, Neon, 360dialog, Vercel, Fly.io, Cloudflare, Resend, Sentry, Expo EAS)
- Deployment infrastructure (Fly.io Bahrain for API/workers, Vercel for web apps, Cloudflare DNS)
- CI/CD pipeline (GitHub Actions: lint, typecheck, test, deploy on merge)
- Staging environment with test data + Stripe test mode
- Mobile app distribution via EAS Build (TestFlight + Android internal testing)
- .env.example files and deployment documentation
- Production environment promotion after staging validation
- Real device testing (GPS background, push notifications)

## Current State (v1.0 shipped)

- **Shipped:** 2026-04-09 — 7 phases, 47 plans, ~22,400 LOC TypeScript
- **Tech stack:** Fastify 5 + Prisma 6 + Neon PostgreSQL + Socket.io + BullMQ + Stripe Connect + Expo SDK 55 + Next.js + Vite
- **All 5 surfaces functional:** customer-web (Next.js), customer-mobile (Expo), company-web (Vite SPA), washer-mobile (Expo), admin-web (Next.js)
- **84 requirements:** 81 code-verified, 2 need human testing (map labels AR, GPS background), 1 N/A (wallet balance scoped out)
- **Known tech debt:** Active Washers admin stat is stub (0), wallet balance deferred, 360dialog/Stripe accounts need production setup

## Requirements

### Validated

- ✓ Phone OTP authentication for customers and washers — v1.0
- ✓ Company email/password authentication with TOTP MFA — v1.0
- ✓ Platform admin Google Workspace SSO — v1.0
- ✓ Rate limiting on OTP endpoints (3/phone/15min) — v1.0
- ✓ Bilingual Arabic (RTL) + English throughout — v1.0
- ✓ Service category browsing (car wash, carpet, sofa) — v1.0
- ✓ GPS-based city detection and company filtering — v1.0
- ✓ Company listing with ratings, pricing, reviews — v1.0
- ✓ Package and add-on selection with quantity — v1.0
- ✓ Stripe payment (card, Apple Pay, Google Pay) — v1.0
- ✓ On-site order lifecycle (7 states) — v1.0
- ✓ Carpet order lifecycle (10 states) — v1.0
- ✓ Washer job dispatch with 30s accept/decline — v1.0
- ✓ Database-level order locking — v1.0
- ✓ Order cancellation with policy enforcement — v1.0
- ✓ Company dashboard with real-time order feed — v1.0
- ✓ Company Stripe Connect onboarding for payouts — v1.0
- ✓ Platform commission auto-deducted (15-20%) — v1.0
- ✓ Refund flow with transfer reversal — v1.0
- ✓ Real-time washer GPS tracking via Socket.io — v1.0
- ✓ Before/after photo evidence via presigned R2 URLs — v1.0
- ✓ Carpet pickup/return photo evidence — v1.0
- ✓ Per-category service checklists for washers — v1.0
- ✓ Washer mobile app (GPS, camera, job management) — v1.0
- ✓ Push notifications (Expo) — v1.0
- ✓ SMS notifications (Twilio) — v1.0
- ✓ WhatsApp notifications (360dialog) — v1.0
- ✓ Email receipts (Resend) — v1.0
- ✓ All notifications bilingual — v1.0
- ✓ Admin company review/reject — v1.0
- ✓ Admin dispute handling with photo evidence — v1.0
- ✓ Admin manual refunds — v1.0
- ✓ Admin cities/categories management — v1.0
- ✓ Admin audit log — v1.0
- ✓ Cross-surface API route consistency (/api prefix) — v1.0
- ✓ Company-web auth gate for protected routes — v1.0
- ✓ Graceful env assertion handling — v1.0
- ✓ Turborepo monorepo with CI pipeline — v1.0

### Active

- [ ] Third-party account configuration (Stripe, Twilio, Neon, 360dialog, etc.)
- [ ] Deployment infrastructure (Fly.io, Vercel, Cloudflare)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Staging environment with E2E validation
- [ ] Mobile app distribution (EAS Build, TestFlight, Android internal)
- [ ] Production environment launch
- [ ] Map label Arabic switching (human verification needed)
- [ ] GPS background tracking device testing (Samsung + iPhone)

### Deferred to v1.2+

- [ ] Loyalty points and wallet system
- [ ] Promo codes and discount engine
- [ ] Analytics dashboards for companies

### Out of Scope

- Subscriptions and B2B/fleet accounts — different billing model, deferred
- AI features (smart pricing, sentiment, chatbot) — needs data volume
- Multi-region expansion (KSA, Egypt) — launch UAE first
- In-app chat/messaging — use WhatsApp deep-links
- Instant auto-dispatch — companies control their staff
- Wallet balance (PAY-02) — scoped out of v1.0, revisit in v1.1

## Context

- **Builder**: Solo developer using Claude (vibe coding approach). No team members.
- **Market**: UAE first launch. Companies already lined up to onboard.
- **Business model**: Marketplace — 15-20% platform commission per order via Stripe Connect.
- **Prior experience**: Builder has experience with similar stack from Zooli.ai (Node.js, Neon, BullMQ, Cloudflare R2, Claude).
- **Blueprint**: Comprehensive 22-page Platform Blueprint + 15-page Vibe Coding Guide.
- **Third-party accounts**: None created yet — all need setup from scratch (Stripe, Twilio, Neon, 360dialog, Vercel, Fly.io, Cloudflare, Resend, Sentry, Expo EAS).
- **Timeline**: v1.0 shipped in 10 days. Quality over speed.
- **Supply side**: Companies ready to join.

## Constraints

- **Tech stack**: Fastify, Neon, Prisma, Stripe — validated in v1.0.
- **Languages**: Arabic (RTL) + English from day 1 — established.
- **Monorepo**: Turborepo with 6 apps + shared packages — working.
- **Platforms**: Web (Next.js) + Mobile (Expo) for customers. Vite SPA for companies. Expo for washers.
- **Region**: Neon Bahrain region for Gulf latency.
- **Payments**: Stripe + Stripe Connect — AED, Apple/Google Pay.
- **Security**: Stripe Elements for PCI, signed R2 URLs, rate limiting.
- **Solo builder**: Architecture manageable by one person with AI.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Marketplace model (customer picks company) | Gulf customers trust brand names | ✓ Good — built and functional |
| Washer travels to client for car wash + sofa | Maximum convenience | ✓ Good — 7-state lifecycle works |
| Carpet = pickup → facility clean → return | Deep cleaning needs equipment | ✓ Good — 10-state lifecycle works |
| Bilingual from day 1 (not retrofit) | UAE/KSA/Egypt require Arabic | ✓ Good — RTL/LTR across all surfaces |
| Separate _en/_ar DB columns (not JSON) | Queryable, indexable, enforces translations | ✓ Good — clean schema |
| UAE first, then KSA + Egypt | Concentrate supply/demand | — Pending (launch first) |
| Vite SPA for company dashboard (not Next.js) | No SEO needed, 10x faster HMR | ✓ Good — smooth DX |
| Socket.io for real-time (not Ably) | Free, self-hosted, adequate at launch scale | ✓ Good — GPS tracking works |
| Cloudflare R2 (not S3) | Zero egress fees | ✓ Good — photo system works |
| BullMQ + Upstash Fixed Plan | Avoids PAYG polling cost blowout | ✓ Good — workers stable |
| HMAC exchange for admin SSO→JWT bridge | Bridges Auth.js Google session to Fastify JWT securely | ✓ Good — zero token leakage |
| fastify-type-provider-zod (community) | @fastify/type-provider-zod doesn't exist on npm | ✓ Good — works with zod v3 |
| Pre-MFA session token (5min TTL, Redis) | Prevents TOTP replay attacks | ✓ Good — secure flow |
| Socket job:accept/decline (not HTTP) | Real-time, no polling, 30s countdown UX | ✓ Good — dispatch loop works |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 — milestone v1.1 Ship to Production started*

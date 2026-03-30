# Cleanly

## What This Is

On-demand mobile cleaning services marketplace for the Gulf region (UAE, Saudi Arabia, Egypt). Customers book car wash, carpet cleaning, or sofa/furniture cleaning — the washer always comes to the client. Customers choose from verified companies, pay through the app, and track their washer in real-time. Built as a bilingual Arabic (RTL) + English platform across 5 app surfaces: customer web, customer mobile, company dashboard, washer mobile app, and admin panel.

## Core Value

A customer can book a cleaning service, pay securely, and track their washer arriving in real-time — the full end-to-end booking-to-completion flow must work flawlessly.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Phone OTP authentication for customers and washers
- [ ] Company email/password authentication with MFA
- [ ] Platform admin Google SSO authentication
- [ ] Service category browsing (car wash, carpet, sofa)
- [ ] GPS-based city detection and company filtering
- [ ] Company listing with ratings, pricing, and ETA
- [ ] Package and add-on selection with quantity support
- [ ] Stripe payment (card, Apple Pay, Google Pay, wallet)
- [ ] Real-time washer GPS tracking via Socket.io
- [ ] Before/after photo evidence system
- [ ] Per-category service checklists for washers
- [ ] Order lifecycle management (7 statuses)
- [ ] Customer reviews and ratings
- [ ] Company dashboard with order management
- [ ] Company onboarding (profile, cities, categories, packages)
- [ ] Washer mobile app (GPS, camera, job management)
- [ ] Admin panel for platform oversight
- [ ] Bilingual Arabic (RTL) + English throughout
- [ ] Push notifications (Expo), SMS (Twilio), Email (Resend)
- [ ] Stripe Connect for company payouts
- [ ] Loyalty points and wallet system
- [ ] Promo codes and discount engine
- [ ] Analytics dashboards for companies
- [ ] WhatsApp notifications (360dialog)

### Out of Scope

- Subscriptions and B2B/fleet accounts — Phase 3, deferred until post-launch
- AI features (smart pricing, sentiment analysis, chatbot) — Phase 3, requires data volume
- Multi-region expansion (KSA, Egypt) — Phase 3, launch UAE first
- Mattress/curtain cleaning categories — future expansion after core validates
- Public API for enterprise integrations — post-scale feature

## Context

- **Builder**: Solo developer using Claude (vibe coding approach). No team members.
- **Market**: UAE first launch. Companies already lined up to onboard.
- **Business model**: Marketplace — 15-20% platform commission per order via Stripe Connect.
- **Prior experience**: Builder has experience with similar stack from Zooli.ai (Node.js, Neon, BullMQ, Cloudflare R2, Claude).
- **Blueprint**: Comprehensive 22-page Platform Blueprint + 15-page Vibe Coding Guide define the full specification including database schema (15 tables), order lifecycle (10 steps), security blueprint, scalability architecture, and bilingual system.
- **Third-party accounts**: None set up yet — all accounts (Stripe, Twilio, Neon, Vercel, etc.) need to be created.
- **Timeline**: No rush — quality over speed. Blueprint estimates ~10 weeks to private beta solo.
- **Supply side**: Companies ready to join — build confidence is high.

## Constraints

- **Tech stack**: Blueprint specifies Fastify, Neon, Prisma, Stripe, etc. but open to better alternatives if research suggests them.
- **Languages**: Arabic (RTL) + English required from day 1 — not retrofittable.
- **Monorepo**: Turborepo monorepo with 6 apps + shared packages as specified in blueprint.
- **Platforms**: Web (Next.js) + Mobile (React Native/Expo) for customers. Web-only for companies. Mobile-only for washers.
- **Region**: Neon Bahrain region for low latency to Gulf users.
- **Payments**: Stripe + Stripe Connect — AED currency, Apple/Google Pay support.
- **Security**: PCI scope reduction via Stripe Elements, encrypted phone numbers, signed R2 URLs, rate limiting on all sensitive endpoints.
- **Solo builder**: Architecture must be manageable by one person with AI assistance.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Marketplace model (customer picks company) | Gulf customers trust brand names; faster to launch than gig-dispatch | — Pending |
| Washer travels to client (not drop-off) | Maximum convenience — car/home/office service anywhere | — Pending |
| Bilingual from day 1 (not retrofit) | UAE/KSA/Egypt markets require Arabic; retrofitting RTL is extremely painful | — Pending |
| Separate _en/_ar DB columns (not JSON) | Queryable, indexable, enforces both translations exist | — Pending |
| UAE first, then KSA + Egypt | Concentrate supply/demand in one market first | — Pending |
| Blueprint stack open to alternatives | Research may surface better tools for solo builder context | — Pending |
| 5 app surfaces from start | All roles need tooling for end-to-end flow to work | — Pending |

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
*Last updated: 2026-03-30 after initialization*

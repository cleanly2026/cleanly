# Cleanly Platform - Project Instructions

## Stitch Design Workflow

When the user asks to create, design, or build any UI/screen/page/component using Stitch, **always follow this 3-step workflow in order**:

### Step 1: Enhance the Prompt (`/enhance-prompt`)
Before sending anything to Stitch, first run the `/enhance-prompt` skill on the user's request. This transforms vague UI ideas into polished, Stitch-optimized prompts with:
- Specific UI/UX keywords and atmosphere descriptors
- Design system context from the project
- Structured output for better generation results

### Step 2: Build with Stitch Loop (`/stitch-loop`)
Take the enhanced prompt from Step 1 and use the `/stitch-loop` skill to iteratively generate and refine the design in Stitch. This runs an autonomous loop that:
- Generates screens from the enhanced prompt
- Reviews and iterates on the output
- Refines until the design meets a high quality bar

### Step 3: Implement in the App (`/react-components`)
Once the Stitch design is finalized, use the `/react-components` skill to:
- Pull the generated design from Stitch
- Convert it into modular React components
- Integrate the components into this Next.js app under `src/`

**Important:** Never skip steps. Always enhance first, then loop for quality, then implement. This ensures the best possible design output every time.

## Stitch Project Implementation Workflow (shadcn)

Whenever the user asks to get any Stitch project and implement it in the app:

1. **Use the `/shadcn-ui` skill** to convert Stitch designs into shadcn/ui components.
2. **Use the glassmorphism registry** via the shadcn MCP and the `/shadcn-ui` skill to apply glassmorphism styling to components.
3. **Implement Motion Primitives** via the shadcn MCP and the `/shadcn-ui` skill to add animations and motion to components.

All three steps are required for every Stitch-to-implementation task. Do not skip the glassmorphism registry or Motion Primitives — they are mandatory parts of the workflow.

## Stitch Prompt Enhancement

Whenever sending a prompt to Stitch (for screen generation, editing, or any Stitch MCP call), **always use the `/enhance-prompt` skill first** to transform the prompt before passing it to Stitch. Never send a raw/unenhanced prompt directly to Stitch.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Cleanly**

On-demand mobile cleaning services marketplace for the Gulf region (UAE, Saudi Arabia, Egypt). Three service types with two delivery models: **Car wash** and **sofa cleaning** — the washer comes to the client and cleans on-site. **Carpet cleaning** — the washer collects the carpet from the client, cleans it at the company's facility, and returns it on a pre-agreed date (pickup → clean → return model). Customers choose from verified companies, pay through the app, and track service progress. Built as a bilingual Arabic (RTL) + English platform across 5 app surfaces: customer web, customer mobile, company dashboard, washer mobile app, and admin panel.

**Core Value:** A customer can book a cleaning service, pay securely, and track their washer arriving in real-time — the full end-to-end booking-to-completion flow must work flawlessly.

### Constraints

- **Tech stack**: Blueprint specifies Fastify, Neon, Prisma, Stripe, etc. but open to better alternatives if research suggests them.
- **Languages**: Arabic (RTL) + English required from day 1 — not retrofittable.
- **Monorepo**: Turborepo monorepo with 6 apps + shared packages as specified in blueprint.
- **Platforms**: Web (Next.js) + Mobile (React Native/Expo) for customers. Web-only for companies. Mobile-only for washers.
- **Region**: Neon Bahrain region for low latency to Gulf users.
- **Payments**: Stripe + Stripe Connect — AED currency, Apple/Google Pay support.
- **Security**: PCI scope reduction via Stripe Elements, encrypted phone numbers, signed R2 URLs, rate limiting on all sensitive endpoints.
- **Solo builder**: Architecture must be manageable by one person with AI assistance.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Verdict on Blueprint Stack
## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Fastify | 5.8.4 | API server (HTTP + WebSocket host) | 2-3x throughput vs Express, TypeScript-first, built-in schema validation via JSON Schema/Zod, v5 dropped Node <20 and cleaned up breaking changes. Validated by benchmarks and production adoption. |
| Node.js | 20 LTS (min) | Runtime | Required by Fastify v5. LTS until April 2026. Ecosystem compatibility for BullMQ, Prisma, Socket.io. |
| TypeScript | 5.x | Language | End-to-end type safety across monorepo — shared types between API, web, mobile are the core solo-dev productivity multiplier. |
### Monorepo
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Turborepo | latest | Monorepo orchestration | Purpose-built for Next.js + Expo + Node.js monorepos. Remote caching means CI never rebuilds unchanged packages. Native pnpm support. Expo SDK 52+ auto-detects Turborepo — no Metro config needed. |
| pnpm | 9.x | Package manager | Turborepo's recommended package manager. Workspace hoisting handles shared packages correctly. Significantly faster than npm for monorepos. |
### Database
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Neon PostgreSQL | serverless | Primary data store | Serverless Postgres with autoscaling. Bahrain region available for Gulf latency. Database branching for safe schema migrations. PgBouncer connection pooling built-in (up to 10,000 connections). Acquired by Databricks (2025) — strong financial backing. |
| PostGIS | (via Neon extension) | Geospatial queries | Natively supported Neon extension. Use `geography` type (not `geometry`) for GPS coordinates — `geography` uses WGS84 spheroid for accurate real-world distance calculations, critical for washer proximity search. Add GIST index on location columns. |
| Prisma | 6.19.0 | ORM | Schema-first, mature ecosystem, Neon-native adapter (`@prisma/adapter-neon`), excellent migration tooling. Blueprint builder already has Zooli.ai experience with this stack. Prisma 7 (engine removed) is imminent — narrowing the performance gap with Drizzle. **See Drizzle alternative below.** |
### Cache & Queue
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Upstash Redis | Fixed Plan ($10/mo) | Redis host for BullMQ + rate limiting + session cache | Managed Redis with zero ops. **CRITICAL: Must use Fixed Plan, not Pay-As-You-Go** — BullMQ polls Redis continuously even when idle; PAYG billing would incur unexpectedly high costs. Fixed Plan at $10/mo is predictable. |
| BullMQ | 5.71.1 | Background job queues | Industry standard for Node.js job queues. Handles: order notifications, SMS/email dispatch, photo processing, payout triggers, promo code expiry. Persistent, retryable, prioritizable. Workers need long-lived process (deploy as separate Fastify worker dyno). |
### Real-Time
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Socket.io | 4.8.3 | Real-time GPS tracking, order status push | Battle-tested, TypeScript support, automatic WebSocket fallback. For single-server deployment (solo dev at launch), no Redis adapter needed — add `@socket.io/redis-adapter` only when horizontal scaling is required. Self-hosted = $0 vs Ably's $59+/mo. |
### Front-End (Web)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2 | Customer web app + Admin panel | App Router stable in v16, Turbopack default. Server Components reduce JS bundle for customer-facing pages. SEO matters for customer acquisition. Two Next.js apps in monorepo share `packages/ui`. |
| Vite + React | 6.x | Company dashboard | No SEO needed — authenticated SPA. Vite HMR is 150ms vs Next.js 4s for dashboard hot-reload. Superior DX for data-heavy dashboard work. Stays SPA so no SSR complexity for an ops tool. |
| shadcn/ui | latest | UI component library | Copy-paste components, Radix UI primitives, Tailwind-based. RTL-compatible (Radix handles direction). Monorepo-friendly — one `packages/ui` package exports components to all web apps. The de-facto standard for new React apps in 2025-2026. |
| Tailwind CSS | 4.x | Styling | Co-released with shadcn/ui integration. `dir="rtl"` CSS attribute handles Arabic layout. Logical properties (`ms-`, `me-`, `ps-`, `pe-`) replace left/right throughout. |
### Front-End (Mobile)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo | 55.x (SDK 55) | Customer mobile + Washer mobile | SDK 55 includes React Native 0.83. New Architecture enabled by default. Expo auto-detects Turborepo monorepos. EAS Build + EAS Update (OTA) are essential for solo dev — no App Store approval wait for fixes. Push notifications require development build (not Expo Go) from SDK 52+. |
| expo-router | 4.x | Navigation | File-based routing mirrors Next.js App Router — same mental model across web and mobile. Deep linking for order tracking shares routes. |
| i18next + react-i18next | latest | Bilingual AR/EN | Standard i18n for React/React Native. Namespace support for large translation files. Use `I18nManager.forceRTL()` + AsyncStorage for language persistence. Use `marginStart`/`marginEnd` (not left/right) throughout. |
### Payments
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Stripe + Stripe Connect | latest SDK | Customer payments + company payouts | Stripe is fully operational in UAE. AED currency, Apple Pay, Google Pay, and Samsung Pay all supported. Stripe Connect (Destination Charges model) handles 15-20% platform commission automatically. T+5 payout schedule for UAE accounts. Use Stripe Elements for PCI scope reduction. |
### Storage
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Cloudflare R2 | — | Before/after photos, company assets | Zero egress fees vs S3's $0.09/GB. Permanent free tier: 10GB storage, 1M Class A + 10M Class B ops/month. S3-compatible API. At typical image-heavy workloads, R2 is 50-90x cheaper than S3 on egress. Sign URLs with short TTLs (15 min) for washer photo uploads. |
### Notifications
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo Push Notifications | (via EAS) | Mobile push (customer + washer) | Built into Expo infrastructure. Works across iOS and Android without Firebase configuration complexity. Requires development builds (not Expo Go) from SDK 52+. |
| Twilio Verify | latest | Phone OTP (customer + washer onboarding) | Industry standard for OTP. Verify API handles retry logic, fraud detection, and adaptive routing. UAE SMS delivery is reliable. Pay-per-use keeps cost low during launch. |
| Resend | latest | Transactional email (company onboarding, receipts) | Modern developer-first API. React Email templates (JSX). Free tier: 3,000 emails/month permanent. 8-minute setup vs SendGrid's 45 minutes. Better DX than SendGrid for solo dev. |
| 360dialog | — | WhatsApp Business notifications | Purpose-built WhatsApp API provider. Flat monthly fee ($50/number) with no per-message markup vs Twilio's $0.005/message platform fee on top of Meta charges. WhatsApp is the dominant notification channel in UAE/KSA/Egypt — this is not optional. |
### Auth
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Custom JWT (Fastify) | — | Phone OTP auth (customers, washers) | `@fastify/jwt` + Twilio Verify OTP. Simple stateless tokens. No external auth service needed for mobile-first OTP flow. Refresh tokens stored in Upstash Redis. |
| NextAuth.js / Auth.js | 5.x | Admin Google SSO | Next.js-native auth for the admin panel. Handles Google OAuth without custom token logic. Isolate to admin panel only. |
### Infrastructure & DevOps
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel | — | Host: customer web, admin panel (Next.js) | Zero-config Next.js deployment. Edge Network CDN. Preview deployments per PR. Free tier sufficient for launch. |
| Fly.io or Railway | — | Host: Fastify API + BullMQ workers | Long-running processes (Socket.io + BullMQ workers) cannot run on serverless (Vercel/Lambda). Fly.io has Bahrain/Middle East regions. Railway is simpler to operate solo. Both support persistent Node.js processes. |
| Netlify or Vercel | — | Host: company dashboard (Vite SPA) | Static SPA — any CDN works. Vercel handles it alongside Next.js apps. |
| GitHub Actions | — | CI/CD | Turborepo remote cache integration. Run tests only on changed packages. Deploy on merge to main. |
| Cloudflare | — | DNS + DDoS protection | Free tier covers DNS. Proxies API traffic for rate limiting at network edge. Pairs naturally with R2. |
## Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@prisma/adapter-neon` | 6.x | Neon serverless driver for Prisma | Always — required for Prisma + Neon connection pooling |
| `@fastify/jwt` | latest | JWT auth middleware | Always — stateless auth tokens |
| `@fastify/cors` | latest | CORS handling | Always — API consumed by web + mobile |
| `@fastify/rate-limit` | latest | Rate limiting | OTP endpoints, payment endpoints |
| `@fastify/multipart` | latest | File upload (photo evidence) | Washer before/after photo upload to R2 |
| `zod` | 3.x | Schema validation | Shared validation between API and clients via monorepo package |
| `@socket.io/redis-adapter` | latest | Socket.io multi-server sync | Only when scaling to multiple API instances — NOT needed at launch |
| `react-hook-form` + `zod` | latest | Form state management | All web forms — company dashboard, admin panel |
| `@tanstack/react-query` | 5.x | Server state management | All web and mobile apps — replaces Redux for API data |
| `date-fns` | 3.x | Date manipulation | Booking times, ETA calculations |
| `sharp` | latest | Image optimization before R2 upload | Resize/compress before/after photos server-side |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Prisma 6 | **Drizzle ORM** | Drizzle is a legitimate alternative — 90% smaller bundle, no generate step, SQL-proximate API. Choose Drizzle if cold starts become an issue (Neon + Drizzle can do <500ms vs Prisma's 1-3s). Builder's Zooli.ai experience with Prisma reduces switching friction, so Prisma wins by familiarity unless cold starts prove problematic. |
| API Framework | Fastify | Hono | Hono excels on edge/Cloudflare Workers. Fastify is better for traditional Node.js servers with long-lived WebSocket connections (Socket.io requirement). |
| API Framework | Fastify | NestJS | NestJS imposes heavy architectural opinions (DI, decorators) — mismatched with solo dev velocity. Fastify is faster to build. |
| Real-time | Socket.io | Ably | Ably is $59+/mo managed service. Socket.io is free, self-hosted, battle-tested. At launch scale (hundreds of concurrent), Socket.io on a single server is zero operational complexity. Switch to Ably at 10K+ concurrent connections. |
| Database | Neon PostgreSQL | Supabase | Supabase adds auth/storage bundling that conflicts with Stripe + R2 choices. Neon is pure Postgres with better branching. |
| Email | Resend | SendGrid | SendGrid free tier expired. Resend has permanent free tier, better DX, React Email integration. At enterprise volume (>100K emails/mo) SendGrid has marginal deliverability edge. |
| Storage | Cloudflare R2 | AWS S3 | S3 charges $0.09/GB egress. R2 charges $0. No technical difference for this use case. |
| Mobile | Expo | Bare React Native | Expo SDK 55 includes New Architecture by default. EAS Build/Update removes most native toolchain pain. Bare RN requires Xcode/Android Studio locally — not ideal for solo AI-assisted dev. |
| Company dashboard | Vite React | Next.js | Company dashboard is authenticated SPA — no SEO need. Vite is 10-30x faster HMR. Mixing SSR into a pure ops tool adds complexity without benefit. |
| Queue | BullMQ + Upstash | QStash (Upstash) | QStash is HTTP-based and serverless-compatible but less feature-rich (no job priorities, limited retry control). BullMQ is the standard for complex job pipelines. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Upstash Redis Pay-As-You-Go for BullMQ | BullMQ polls Redis continuously — PAYG billing becomes unpredictable and expensive. Documented issue in Upstash own docs. | Upstash Redis Fixed Plan ($10/mo) |
| Serverless deployment for Fastify API | Socket.io requires persistent WebSocket connections — serverless functions time out after 10-30s, incompatible. BullMQ workers also need long-lived processes. | Fly.io or Railway (persistent Node.js) |
| Prisma without `@prisma/adapter-neon` | Default Prisma uses direct TCP connections — exhausts Neon's connection limits rapidly in serverless context. | Always use neon adapter + PgBouncer pooled URL |
| `geometry` PostGIS type for GPS | Geometry uses flat-plane math — inaccurate over real-world GPS distances. Washer proximity queries will return wrong results. | `geography` type with GIST index |
| `marginLeft`/`marginRight` in React Native | Breaks RTL layout silently — left remains left in Arabic. | `marginStart`/`marginEnd` (logical properties) throughout |
| Express.js | 2-3x worse performance than Fastify, no native TypeScript types, middleware model is less safe. New projects should not start with Express. | Fastify 5 |
| Firebase for OTP | Firebase OTP has quotas and inconsistent behavior between Expo Go and production builds. Documented confusion in Expo community. | Twilio Verify |
| Redux / MobX for state | Overengineered for API data that TanStack Query handles better. React 19 + `use()` makes server state simpler. | TanStack Query v5 |
| `moment.js` | 67kb, unmaintained. | `date-fns` (tree-shakeable, 2kb per function) |
| JSON columns for AR/EN translations | Not queryable, not indexable, no enforcement that both languages exist. Blueprint's decision to use `name_en`/`name_ar` column pairs is correct. | Separate `_en`/`_ar` columns as specified in blueprint |
## Stack Patterns by Variant
- Use Fly.io Bahrain region (`bah`) for lowest latency to UAE users
- Deploy API + BullMQ worker as two separate Fly.io machines (same image, different start command)
- Socket.io runs on the API machine — no Redis adapter needed until you add a second API machine
- Simpler UI for solo dev, good DX
- Use Railway's Singapore region as closest available to Gulf (adds ~50ms latency vs Fly.io Bahrain)
- Same split: one service for API, one for BullMQ worker
- Migrate to Drizzle ORM — same Neon connection string, similar migration tooling (`drizzle-kit`)
- Drizzle's bundle is ~7kb vs Prisma's ~30MB binary — cold starts drop from 1-3s to <500ms
- Schema migration is a one-time effort; Drizzle + Neon is a documented, supported combination
- Add `@socket.io/redis-adapter` pointing to the Upstash Fixed Plan Redis already in use
- Enable sticky sessions in the load balancer (or disable HTTP long-polling to avoid the requirement)
- This is a one-afternoon addition, not an architectural change
- At >5,000 WhatsApp messages/day, compare 360dialog flat fee vs Twilio per-message
- 360dialog's zero per-message markup becomes decisive at high volume
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Fastify 5.x | Node.js 20+ | Node 18 dropped in Fastify v5 |
| Expo SDK 55 | React Native 0.83, React 19 | New Architecture on by default |
| Next.js 16.x | React 19, Node.js 18+ | Turbopack default, React Compiler stable |
| Prisma 6.x | Node.js 18+ | v7 coming — breaking changes documented but migration guide exists |
| BullMQ 5.x | ioredis 5+, Node.js 18+ | Upstash Redis must use TLS config |
| Socket.io 4.x | Node.js 10+ | Use same major version on client and server |
| `@prisma/adapter-neon` | Prisma 6.x + @neondatabase/serverless | Must match Prisma major version |
## Installation (Monorepo Root Bootstrap)
# Create monorepo
# API package dependencies
# Customer web (Next.js)
# Company dashboard (Vite)
# Shared UI package
# Add shadcn/ui components via CLI: pnpm dlx shadcn@latest init
# Mobile (Expo)
# Use: npx create-expo-app --template (inside apps/mobile-customer, apps/mobile-washer)
# Dev dependencies (root)
## Sources
- Fastify official docs (fastify.dev) — version 5.8.4 confirmed, Node 20+ requirement
- Neon docs (neon.com/docs/extensions/postgis) — PostGIS extension support confirmed
- Neon docs (neon.com/docs/connect/connection-pooling) — PgBouncer 10K connections confirmed
- PostGIS docs (postgis.net/documentation/faq) — geography vs geometry recommendation
- Upstash docs (upstash.com/docs/redis/integrations/bullmq) — BullMQ compatibility + Fixed Plan recommendation
- Socket.io docs (socket.io/docs/v4) — single server needs no Redis adapter confirmed
- Expo changelog (expo.dev/changelog/sdk-53) — SDK 55 latest, push notifications require dev builds
- Stripe support (support.stripe.com) — UAE Connect + Apple/Google Pay confirmed
- Cloudflare R2 vs S3 (cloudflare.com) — zero egress fee confirmed
- WebSearch: Fastify vs Hono vs Express benchmarks — Fastify 2-3x Express, Hono better for edge
- WebSearch: Prisma vs Drizzle 2025 — cold start difference, Drizzle 90% smaller bundle
- WebSearch: Turborepo + Expo monorepo 2025 — Expo SDK auto-detects Turborepo
- WebSearch: Next.js 16.2 (March 2026) — Turbopack default, React Compiler stable
- WebSearch: BullMQ 5.71.1 (latest) — OpenTelemetry, flow producers, active maintenance
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

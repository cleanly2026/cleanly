# Phase 8: Accounts & Environment - Research

**Researched:** 2026-04-12
**Domain:** Third-party account provisioning, secrets management, env scaffolding (1Password CLI, GitHub Environments, Zod env validation)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** UAE trade license not yet issued. Stripe Connect UAE and Apple Developer Organization paths are blocked — both deferred out of Phase 8.
- **D-02:** Account owner email = personal Gmail for all 11 instant providers in Phase 8. Business email migration post-entity.
- **D-03:** Phase 8 scopes to 11 instant providers. 360dialog templates SUBMITTED in Phase 8 (approval runs async). Stripe Connect UAE and Apple Developer are deferred.
- **D-04:** Per-provider docs under `docs/accounts/` — one file per provider. Self-contained checklist + field instructions + "where the secret goes" section. Long-lived reference docs.
- **D-05:** Live in-session provisioning model. Claude guides every signup; secrets captured and committed in same session.
- **D-06:** Billing alerts + payment method on every paid provider.
- **D-07:** 1Password vault first — every secret goes to `Cleanly - <Provider>` item before anything else.
- **D-08:** Hybrid secret partitioning: Fly.io secrets (API/worker runtime), Vercel env vars (web runtime), GitHub Environments (CI-only secrets: DIRECT_URL, SENTRY_AUTH_TOKEN, TURBO_TOKEN, deploy tokens). Each secret lives in exactly the place that consumes it.
- **D-09:** 1Password primary + offline sealed backup (age- or GPG-encrypted export to USB or second private repo).
- **D-10:** Local dev bootstrap via `op inject` — `.env.op.tpl` files committed alongside `.env.example`. One command per app. Fresh-clone setup in SETUP.md.
- **D-11:** Add `WHATSAPP_ENABLED` boolean env var. Default `false`. When `true`, `DIALOG360_API_KEY` must be set (prodSchema.superRefine). When `false`, WhatsApp paths silently no-op with log warning.
- **D-12:** Add `BYPASS_SENTRY` escape hatch for non-production. In production, ignored — `SENTRY_DSN` always required. In staging/dev, `BYPASS_SENTRY=true` suppresses SENTRY_DSN requirement. Boot log MUST emit `WARN: Sentry bypassed in <env>` when active.
- **D-13:** Targeted env audit — 6 app `.env.example` files + `apps/api/src/lib/env.ts` Zod schema. Skip packages unless obvious. Patch gaps as found.

### Claude's Discretion

- Exact file structure under `docs/accounts/` (ordering, front-matter, screenshot-ref anchors).
- Exact 1Password item naming convention beyond `Cleanly - <Provider>` (field layout, tags, sections).
- How `op inject` is wired into monorepo developer workflow: `pnpm setup:env` script, Makefile target, or plain commands in SETUP.md. Claude picks most idiomatic option for Turborepo + pnpm.
- Exact shape of targeted env audit report (markdown table, diff format, etc.).
- Whether `WHATSAPP_ENABLED` defaults `false` everywhere or `true` in staging/production once templates are approved. Default `false` per D-11.

### Deferred Ideas (OUT OF SCOPE)

**Phase 8.5: Entity-gated provisioning (post-UAE-trade-license):**
- Stripe account creation (ACCT-01) — Stripe UAE live + test mode, AED currency
- Stripe Connect UAE platform (ACCT-02) — manual support-ticket onboarding, UAE company docs required
- Apple Developer enrollment (ACCT-13) — Organization (D-U-N-S) once business email exists; APNs p8 key generation
- Business email creation + provider migration across all Phase 8 accounts

**Not in scope for Phase 8 or 8.5:**
- Phase 9 work (Fly.io app creation, Vercel project linking, staging deploy)
- Sentry 6-project source maps wiring (Phase 10)
- Stripe webhook endpoint registration (Phase 10)
- GitHub branch protection rules, OIDC federation
- Twilio sender ID / UAE messaging regulation (v1.2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACCT-01 | Stripe account — DEFERRED to Phase 8.5 (entity-gated) | Runbook doc created but marked deferred; no provisioning action in Phase 8 |
| ACCT-02 | Stripe Connect UAE — DEFERRED to Phase 8.5 (entity-gated) | Runbook doc created but marked deferred |
| ACCT-03 | Neon production database branch (Frankfurt region, PgBouncer pooling) | Neon console → create project → Frankfurt → get pooled + direct URLs |
| ACCT-04 | Upstash Redis Fixed Plan ($10/mo) for BullMQ + rate limiting + cache | Upstash console → Fixed Plan selection critical (PAYG billing trap documented) |
| ACCT-05 | Twilio Verify account with UAE SMS delivery | Twilio console → create Verify Service → get Account SID + Auth Token + Verify SID (starts VA) |
| ACCT-06 | 360dialog WhatsApp account + template SUBMISSION (approval async) | hub.360dialog.com → account + template submit; approval takes up to 48h per Meta |
| ACCT-07 | Resend account with sender domain verified | resend.com → add domain → DNS TXT records → verify |
| ACCT-08 | Sentry org + 6 projects (one per app surface) | sentry.io → org creation + 6 projects → capture 6 DSNs + 1 auth token |
| ACCT-09 | Cloudflare account + R2 bucket + CORS policy (explicit content-type) | Cloudflare dashboard → R2 → bucket → API token → CORS JSON |
| ACCT-10 | Fly.io account creation (app creation is Phase 9) | fly.io signup → personal account; Mumbai region lock confirmed |
| ACCT-11 | Vercel account creation (project linking is Phase 9) | vercel.com signup; import monorepo deferred to Phase 9 |
| ACCT-12 | Expo EAS account + project IDs for both mobile apps | EAS already has projectIds in app.json files; account signup + `eas login` confirms ownership |
| ACCT-13 | Apple Developer — DEFERRED to Phase 8.5 (entity-gated) | Runbook doc created but marked deferred |
| ACCT-14 | Google Play Console ($25 one-time) — personal enrollment OK | play.google.com/console → developer account → $25 fee |
| ENV-01 | .env.example files for every app documenting all required variables | Audit existing files → patch gaps → add WHATSAPP_ENABLED + BYPASS_SENTRY |
| ENV-02 | Zod startup validation — missing var causes clean crash with descriptive error | env.ts already implemented; Phase 8 EXTENDS with WHATSAPP_ENABLED + BYPASS_SENTRY |
| ENV-03 | GitHub Environments (staging + production) with scoped secrets | `gh api` + `gh secret set --env` for CI-only secrets |
| ENV-04 | Neon two-URL config: pooled runtime, direct migrations | Already implemented in env.ts at lines 22-27; preserve both refinements |
| ENV-05 | Secrets in GitHub Environments + Fly.io secrets — never in repo | Fly.io `flyctl secrets set`, Vercel env vars via dashboard, GitHub `gh secret set --env` |
</phase_requirements>

---

## Summary

Phase 8 is a **provisioning and scaffolding phase**, not an implementation phase. The deliverables are: 11 third-party service accounts created and documented, secrets captured in 1Password and promoted to their runtime homes (Fly.io secrets, Vercel env vars, GitHub Environments), `.env.op.tpl` template files committed alongside every existing `.env.example`, and `apps/api/src/lib/env.ts` extended with two new env vars.

No running apps, no deployments, and no Fly.io/Vercel project creation belong here. The success gate is: can a fresh laptop developer run `op inject` and have all apps boot locally without credential errors.

**Critical finding:** Neon has no Bahrain region. The closest available AWS region to the UAE/Gulf is **ap-southeast-1 (Singapore)**. The CONTEXT.md and CLAUDE.md both reference "Bahrain" but this region does not exist on Neon as of April 2026. **Frankfurt (eu-central-1) is the next-best option** if the team is EU/Middle East distributed. Singapore is the technical correct answer for Gulf latency. The planner must surface this to the user before selecting a region.

**Primary recommendation:** Work through providers in this order: (1) Neon (required by nearly everything), (2) Upstash Redis (BullMQ depends on it), (3) Twilio, (4) Resend, (5) Sentry, (6) Cloudflare R2, (7) Fly.io account, (8) Vercel account, (9) Expo EAS confirm, (10) Google Play Console, (11) 360dialog templates. Then do env scaffolding (env audit, .env.op.tpl files, GitHub Environments) as the final wave.

---

## Standard Stack

### Core Tools

| Tool | Version / Status | Purpose | Why Standard |
|------|-----------------|---------|--------------|
| 1Password CLI (`op`) | NOT installed on dev machine | Local secret injection, `.env.op.tpl` → `.env` | Official 1Password CLI; `op inject` is the de-facto pattern for team secret bootstrapping |
| GitHub CLI (`gh`) | 2.88.0 — INSTALLED | GitHub Environments + secrets via CLI | Enables scriptable `gh secret set --env staging` without browser |
| `flyctl` | Not confirmed | Fly.io secret management | `flyctl secrets set KEY=VALUE` — primary API secret injection mechanism |
| Vercel CLI (`vercel`) | Not confirmed | Vercel env var management (alternative to dashboard) | `vercel env add` for web runtime vars |
| Zod | Already in project (3.x) | Env schema validation in `env.ts` | Already established pattern; do not replace |

### Provider Accounts

| Provider | Req ID | Cost | Free Tier | Critical Notes |
|----------|--------|------|-----------|----------------|
| Neon PostgreSQL | ACCT-03 | Free tier / paid | Free: 0.5 GiB storage, 5 compute hours/mo | No Bahrain region — use Singapore or Frankfurt |
| Upstash Redis | ACCT-04 | $10/mo Fixed Plan | NO free plan for Fixed Plan | **MUST choose Fixed Plan, NOT Pay-As-You-Go** |
| Twilio Verify | ACCT-05 | Pay-per-use ($0.05/OTP) | No minimum | Account SID starts `AC`, Verify SID starts `VA` |
| 360dialog | ACCT-06 | ~$50/mo/number | — | Template approval: up to 48h (Meta review) |
| Resend | ACCT-07 | Free: 3,000 emails/mo | Yes, permanent | Requires DNS TXT/MX/DKIM records for domain verification |
| Sentry | ACCT-08 | Free: 5K errors/mo | Yes, permanent | Create 6 projects: api, customer-web, admin-web, company-web, customer-mobile, washer-mobile |
| Cloudflare R2 | ACCT-09 | Free: 10GB/mo | Yes, permanent | Zero egress fees; CORS must use `["content-type"]` not `["*"]` |
| Fly.io | ACCT-10 | Pay-per-use (account creation free) | — | Account only; Mumbai (bom) region is Phase 9 |
| Vercel | ACCT-11 | Free Hobby tier | Yes | Account only; project linking is Phase 9 |
| Expo EAS | ACCT-12 | Free tier available | Yes | Project IDs already in app.json — account confirmation only |
| Google Play Console | ACCT-14 | $25 one-time | — | Personal enrollment acceptable per D-03 |

---

## Architecture Patterns

### Secret Distribution Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     1Password Vault "Cleanly"                    │
│                    (Primary source of truth)                     │
│   Item per provider: "Cleanly - Neon", "Cleanly - Twilio", etc  │
└──────────────────┬──────────────────┬───────────────────────────┘
                   │                  │
      ┌────────────▼───┐   ┌──────────▼──────────┐   ┌──────────────────────┐
      │  Fly.io Secrets │   │  Vercel Env Vars     │   │  GitHub Environments │
      │  (API runtime)  │   │  (Web runtime)       │   │  (CI-only)           │
      │                 │   │                      │   │                      │
      │ DATABASE_URL    │   │ NEXT_PUBLIC_API_URL  │   │ DIRECT_URL           │
      │ DIRECT_URL*     │   │ NEXT_PUBLIC_STRIPE_  │   │ SENTRY_AUTH_TOKEN    │
      │ UPSTASH_*       │   │   PUBLISHABLE_KEY    │   │ TURBO_TOKEN          │
      │ JWT_SECRET      │   │ NEXT_PUBLIC_SENTRY_  │   │ TURBO_TEAM           │
      │ JWT_REFRESH_*   │   │   DSN                │   │ FLY_API_TOKEN        │
      │ TWILIO_*        │   │ NEXTAUTH_SECRET      │   │ VERCEL_TOKEN         │
      │ STRIPE_*        │   │ NEXTAUTH_URL         │   │                      │
      │ RESEND_API_KEY  │   │ GOOGLE_CLIENT_*      │   │ * staging + prod     │
      │ DIALOG360_*     │   │ ADMIN_EXCHANGE_*     │   │   environments       │
      │ R2_*            │   │ VITE_API_URL         │   │   separately         │
      │ SENTRY_DSN      │   │ VITE_SENTRY_DSN      │   └──────────────────────┘
      │ SENTRY_ORG      │   │ EXPO_PUBLIC_*        │
      │ ADMIN_EXCHANGE_ │   └──────────────────────┘
      │ WHATSAPP_ENABLED│
      │ BYPASS_SENTRY   │
      └─────────────────┘

* DIRECT_URL lives in BOTH Fly.io (for any server-side migration trigger) and
  GitHub Environments (for CI prisma migrate deploy)
```

### Local Dev Bootstrap Pattern (.env.op.tpl)

```
# Template file committed to git (.env.op.tpl)
DATABASE_URL={{ op://Cleanly/Neon Production/database_url_pooled }}
DIRECT_URL={{ op://Cleanly/Neon Production/direct_url }}
UPSTASH_REDIS_URL={{ op://Cleanly/Upstash Redis/connection_string }}
JWT_SECRET={{ op://Cleanly/JWT Secrets/jwt_secret }}
```

Two files exist per app after Phase 8:
- `.env.example` — fake-value documentation (always readable, no 1Password needed)
- `.env.op.tpl` — functional template (references 1Password; `op inject` produces real `.env`)

The output path respects Next.js vs Fastify convention:
- `apps/api/.env.op.tpl` → `op inject -i apps/api/.env.op.tpl -o apps/api/.env`
- `apps/customer-web/.env.op.tpl` → `op inject -i apps/customer-web/.env.op.tpl -o apps/customer-web/.env.local`
- `apps/admin-web/.env.op.tpl` → output to `.env.local`
- `apps/company-web/.env.op.tpl` → output to `.env.local` (Vite also reads `.env.local`)
- `apps/customer-mobile/.env.op.tpl` → output to `.env`
- `apps/washer-mobile/.env.op.tpl` → output to `.env`
- `packages/db/.env.op.tpl` → output to `.env`

**`setup:env` script (idiomatic for pnpm monorepo):** A root-level `package.json` script:
```json
"setup:env": "op inject -i apps/api/.env.op.tpl -o apps/api/.env && op inject -i apps/customer-web/.env.op.tpl -o apps/customer-web/.env.local && ..."
```
This is cleaner than a Makefile for a pnpm-first project and keeps everything in one toolchain.

### Env Validation Extension Pattern (env.ts)

The existing `prodSchema.superRefine` pattern in `apps/api/src/lib/env.ts` at line 87 must be extended, NOT replaced.

**Current pattern (lines 87-105):**
```typescript
const prodSchema = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'staging') return
  const prodRequired = [
    ['STRIPE_WEBHOOK_SECRET', env.STRIPE_WEBHOOK_SECRET],
    ['RESEND_API_KEY', env.RESEND_API_KEY],
    ['SENTRY_DSN', env.SENTRY_DSN],
  ] as const
  for (const [name, value] of prodRequired) {
    if (!value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${name} is required in ${env.NODE_ENV}`, path: [name] })
    }
  }
})
```

**Phase 8 additions to envSchema (base schema):**
```typescript
WHATSAPP_ENABLED: z.string().default('false').transform(v => v === 'true'),
BYPASS_SENTRY: z.string().default('false').transform(v => v === 'true'),
```

**Phase 8 additions to prodSchema.superRefine logic:**
```typescript
// WHATSAPP_ENABLED: when true, DIALOG360_API_KEY must be set (all envs)
if (env.WHATSAPP_ENABLED && !env.DIALOG360_API_KEY) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'DIALOG360_API_KEY is required when WHATSAPP_ENABLED=true',
    path: ['DIALOG360_API_KEY'],
  })
}

// BYPASS_SENTRY: only honored in non-production; ignored in production
if (env.NODE_ENV === 'production' && env.BYPASS_SENTRY) {
  // BYPASS_SENTRY is silently ignored in production — SENTRY_DSN still required
  // (do not add issue; just don't use bypass value in production gate)
}
// In staging/production gate for SENTRY_DSN: skip if BYPASS_SENTRY is true AND env is NOT production
if (env.NODE_ENV === 'staging' && env.BYPASS_SENTRY) {
  // skip SENTRY_DSN requirement for staging when bypass is active
  // boot log warning must be emitted in loadEnv()
} else if (!env.SENTRY_DSN) {
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: `SENTRY_DSN is required in ${env.NODE_ENV}`, path: ['SENTRY_DSN'] })
}
```

**loadEnv() warning emission (BYPASS_SENTRY):**
```typescript
function loadEnv(): Env {
  const result = prodSchema.safeParse(process.env)
  if (!result.success) { /* ... existing error handling ... */ }
  
  // Emit BYPASS_SENTRY warning if active in non-production
  if (result.data.BYPASS_SENTRY && result.data.NODE_ENV !== 'production') {
    console.warn(`WARN: Sentry bypassed in ${result.data.NODE_ENV} — error tracking disabled`)
  }
  
  return result.data
}
```

### GitHub Environments Setup (CLI)

GitHub CLI 2.88.0 is installed and can create environments and set secrets without browser:

```bash
# Create environments (requires authenticated gh cli)
gh api repos/{owner}/{repo}/environments/staging -X PUT --input - <<< '{}'
gh api repos/{owner}/{repo}/environments/production -X PUT --input - <<< '{}'

# Set environment secrets
gh secret set NEON_DIRECT_URL --env staging --body "postgresql://..."
gh secret set NEON_DIRECT_URL --env production --body "postgresql://..."
gh secret set SENTRY_AUTH_TOKEN --env staging --body "sntrys_..."
gh secret set TURBO_TOKEN --env staging --body "..."
gh secret set TURBO_TEAM --env staging --body "..."

# Bulk from env file
gh secret set --env-file .secrets.staging --env staging
```

Note: `gh` must be authenticated (`gh auth login`) before these commands work. Authentication is not currently active on this machine.

### docs/accounts/ File Structure

```
docs/
└── accounts/
    ├── NEON-SETUP.md
    ├── UPSTASH-SETUP.md
    ├── TWILIO-SETUP.md
    ├── 360DIALOG-SETUP.md
    ├── RESEND-SETUP.md
    ├── SENTRY-SETUP.md
    ├── CLOUDFLARE-R2-SETUP.md
    ├── FLY-SETUP.md
    ├── VERCEL-SETUP.md
    ├── EXPO-EAS-SETUP.md
    ├── GOOGLE-PLAY-SETUP.md
    └── STRIPE-SETUP.md  ← Phase 8.5 deferred; marked as such
    └── APPLE-DEVELOPER-SETUP.md  ← Phase 8.5 deferred; marked as such
```

Each file follows this structure:
1. **Header** — provider name, tier, cost model, dashboard URL
2. **Prerequisites** — what must exist before this provider can be set up
3. **Signup checklist** — numbered steps, field-by-field instructions
4. **What to capture** — exact field names, where each value is found in the dashboard
5. **1Password storage** — item name, field layout (e.g., `Cleanly - Neon` with fields: `database_url_pooled`, `direct_url`, `password`)
6. **Where secrets go** — Fly.io secrets, Vercel env vars, or GitHub Environments (copy from secret distribution model)
7. **Billing alert** — what threshold to set and how
8. **Post-Phase-8 tasks** — any follow-up (e.g., "when entity arrives, migrate to business email")

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret template injection | Custom script reading from env file | `op inject -i .env.op.tpl -o .env` | 1Password CLI handles OAuth, vault access, field resolution; custom scripts create secret leakage risk |
| Environment variable validation | Manual `if (!process.env.X)` guards throughout codebase | Zod `env.ts` singleton already in place | Guards outside `env.ts` bypass the startup-fail behavior; violates established pattern |
| GitHub env/secret creation | Manual browser clicks | `gh secret set --env` + `gh api repos/.../environments` | Reproducible, auditable, scriptable |
| Fly.io secret management | `.env` files copied to server | `flyctl secrets set` | Fly.io secrets are encrypted at rest, never in git, rotatable without redeploy |
| Secret rotation tracking | Spreadsheet / Notion | 1Password vault item history | 1Password maintains full item history and can alert on staleness |

**Key insight:** Every manual click in a browser that sets a secret creates a gap between "what's documented" and "what's actually set." Prefer CLI commands documented in runbooks so secrets can be reproduced exactly if 1Password or a service account is compromised.

---

## Env Audit Findings (Pre-Phase-8 State)

### API env.ts vs process.env usage — VIOLATIONS FOUND

The following files use `process.env.*` directly instead of `import { env } from './lib/env.js'`. This violates the established singleton pattern and must be patched in ENV-01/ENV-02 work:

| File | Violation | Risk |
|------|-----------|------|
| `apps/api/src/lib/prisma.ts:8` | `process.env.DATABASE_URL!` | No validation; if var is missing, Prisma fails with cryptic error instead of clean crash |
| `apps/api/src/lib/r2.ts:12-34` | `process.env.R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | All bypass env.ts validation |
| `apps/api/src/lib/redis.ts:5` | `process.env.UPSTASH_REDIS_URL!` | Bypasses `rediss://` TLS check in env.ts |
| `apps/api/src/lib/sentry.ts:4,10,11` | `process.env.SENTRY_DSN`, `NODE_ENV` | Bypasses BYPASS_SENTRY logic added in Phase 8 — must be updated to use `env` |
| `apps/api/src/lib/socket.ts:8,27` | `process.env.CUSTOMER_WEB_URL`, `process.env.COMPANY_WEB_URL`, `process.env.UPSTASH_REDIS_URL` | Bypasses env.ts |
| `apps/api/src/plugins/auth.ts:22` | `process.env.JWT_SECRET!` | Bypasses min(32) check |
| `apps/api/src/plugins/cors.ts:7-9` | `process.env.CUSTOMER_WEB_URL`, `COMPANY_WEB_URL`, `ADMIN_WEB_URL` | Bypass |
| `apps/api/src/routes/auth/admin.ts:34` | `process.env.ADMIN_EXCHANGE_SECRET` | Bypasses min(16) check |
| `apps/api/src/routes/company/stripe-connect.ts:34-35` | `process.env.COMPANY_WEB_URL` | Bypass |
| `apps/api/src/routes/payments/webhook.ts:24` | `process.env.STRIPE_WEBHOOK_SECRET!` | Bypasses validation |
| `apps/api/src/services/email.service.ts:5,18,38` | `process.env.RESEND_API_KEY` | Bypasses optional-but-required-in-prod check |
| `apps/api/src/services/otp.service.ts:4-7` | `process.env.TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Bypasses format checks (AC/VA prefix) |
| `apps/api/src/services/sms.service.ts:4-15` | `process.env.TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Bypass |
| `apps/api/src/services/push.service.ts:4` | `process.env.EXPO_ACCESS_TOKEN` | Bypass |
| `apps/api/src/services/stripe.service.ts:7,10` | `process.env.STRIPE_SECRET_KEY` | Bypasses sk_test_/sk_live_ check |
| `apps/api/src/services/whatsapp.service.ts:7` | `process.env.DIALOG360_API_KEY` | Must be updated to use `env.WHATSAPP_ENABLED` gate and `env.DIALOG360_API_KEY` |

**Decision point for planner:** The CONTEXT.md says D-13 is a "targeted audit" — patch gaps as found. The scope of violations is substantial (15+ files). The plan should allocate a dedicated task to migrate API code to use `env.*` instead of `process.env.*`.

### Web Apps — env.example vs actual usage: NO GAPS FOUND

All web app env vars found in source are documented in their respective `.env.example`:

| App | Vars in source | Covered in .env.example |
|-----|---------------|-------------------------|
| customer-web | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (no direct usage found) | Yes |
| admin-web | `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EXCHANGE_SECRET` | Yes |
| company-web | `VITE_API_URL`, `VITE_SENTRY_DSN` | Yes |
| customer-mobile | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_PROJECT_ID`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SENTRY_DSN` | Yes |
| washer-mobile | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_PROJECT_ID`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_SENTRY_DSN` | Yes |

**Missing from customer-web .env.example:** `NEXT_PUBLIC_SENTRY_DSN` IS documented. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is documented but no usage was found in customer-web source (Stripe usage appears to be server-side only). Consider whether to keep or remove.

### turbo.json env declarations — GAPS FOUND

The following vars are in `.env.example` files but NOT declared in `turbo.json` build env, meaning Turborepo cache may not invalidate when they change:

| Missing var | App | Impact |
|-------------|-----|--------|
| `EXPO_PUBLIC_API_URL` | customer-mobile, washer-mobile | Cache poisoning risk |
| `EXPO_PUBLIC_PROJECT_ID` | customer-mobile, washer-mobile | Cache poisoning risk |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | customer-mobile | Cache poisoning risk |
| `EXPO_PUBLIC_SENTRY_DSN` | customer-mobile, washer-mobile | Cache poisoning risk |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | washer-mobile | Cache poisoning risk |

Note: `NEXT_PUBLIC_SENTRY_DSN` is also missing from turbo.json's build env array. The existing turbo.json covers customer-web and admin-web `NEXT_PUBLIC_*` and company-web `VITE_*` vars, but Expo public vars are not covered.

---

## Common Pitfalls

### Pitfall 1: Upstash PAYG Plan for BullMQ
**What goes wrong:** User selects Pay-As-You-Go Redis instead of Fixed Plan. BullMQ polls Redis continuously even with zero jobs queued — billing accumulates at ~$30-100+/mo unexpectedly.
**Why it happens:** PAYG is the default and prominent option; Fixed Plan requires scrolling or toggling.
**How to avoid:** Runbook must explicitly say "Select Fixed Plan ($10/mo) — do NOT select Pay-As-You-Go" with a screenshot-anchor noting the toggle location.
**Warning signs:** Upstash billing dashboard showing unexpectedly high command counts immediately after connection.

### Pitfall 2: Neon "Bahrain region" does not exist
**What goes wrong:** CLAUDE.md and PROJECT.md reference "Neon Bahrain region" but Neon has no Bahrain region. Searching or selecting "Bahrain" produces an error or selects wrong region.
**Why it happens:** The blueprint was written before verifying Neon's actual region list. Neon currently offers: us-east-1, us-east-2, us-west-2, eu-central-1 (Frankfurt), eu-west-2 (London), ap-southeast-1 (Singapore), ap-southeast-2 (Sydney), sa-east-1.
**How to avoid:** Runbook must specify the actual Neon region to select. Recommendation for Gulf users: **ap-southeast-1 (Singapore)** for lowest real-world latency, or **eu-central-1 (Frankfurt)** if the team is EU-based. Must confirm with user before provisioning.
**Warning signs:** Neon console shows no "Bahrain" option during project creation.

### Pitfall 3: Prisma direct URL through PgBouncer
**What goes wrong:** Using the pooled URL (with `-pooler` in hostname) for `prisma migrate deploy`. Migrations fail silently or with cryptic errors because PgBouncer does not support prepared statements used by Prisma migrate.
**Why it happens:** Both URLs look similar; easy to copy wrong one.
**How to avoid:** env.ts already enforces the URL distinction with `.refine()`. DIRECT_URL must NOT contain `-pooler`. Runbook must visually highlight which dashboard URL is which.
**Warning signs:** `prisma migrate deploy` error containing "prepared statement" or "P1001".

### Pitfall 4: process.env.* violations bypass startup validation
**What goes wrong:** After Phase 8 adds `WHATSAPP_ENABLED` and `BYPASS_SENTRY` gates to env.ts, the existing `whatsapp.service.ts` still reads `process.env.DIALOG360_API_KEY` directly — bypassing the new `env.WHATSAPP_ENABLED` check entirely.
**Why it happens:** 15+ files in the API currently bypass the `env` singleton; the audit found them all.
**How to avoid:** The plan must include a dedicated task to migrate all `process.env.*` reads in API source to use `import { env } from './lib/env.js'`. This is not optional — it makes the new WHATSAPP_ENABLED and BYPASS_SENTRY vars functional.
**Warning signs:** WhatsApp sends even when `WHATSAPP_ENABLED=false`, or Sentry initializes even when `BYPASS_SENTRY=true`.

### Pitfall 5: 360dialog template approval blocking Phase 8 completion
**What goes wrong:** Plan waits for 360dialog template approval before marking Phase 8 done. Meta review takes up to 48h (per 360dialog docs); can be longer for first-time accounts.
**Why it happens:** Phase 8 lists ACCT-06 as a requirement.
**How to avoid:** ACCT-06 success = template SUBMITTED, not template APPROVED. Approval runs async in Meta review. Per D-03, Phase 8 closes after submission. Capture the template submission confirmation screenshot in `docs/accounts/360DIALOG-SETUP.md`.
**Warning signs:** Blocking Phase 8 → 9 transition on 360dialog approval email.

### Pitfall 6: GitHub CLI not authenticated
**What goes wrong:** `gh secret set` and `gh api` commands fail with "not authenticated" errors.
**Why it happens:** `gh` is installed (2.88.0) but `gh auth status` shows unauthenticated on this machine.
**How to avoid:** First step of GitHub Environments task must be `gh auth login` → browser OAuth flow. The plan must include this as a prerequisite step.
**Warning signs:** `gh: To get started with GitHub CLI, please run: gh auth login`.

### Pitfall 7: Expo EAS owner mismatch
**What goes wrong:** `eas login` authenticates as a different account than `owner: "cleanly2026"` in `app.json` files. EAS commands fail with ownership errors.
**Why it happens:** The app.json files already have `owner: "cleanly2026"` — this is a specific EAS account slug.
**How to avoid:** Must log in to EAS as the `cleanly2026` account. Confirm account exists and credentials are in 1Password before executing EAS steps.
**Warning signs:** `eas build` error "This project is not owned by the current account".

### Pitfall 8: Cloudflare R2 CORS wildcard headers
**What goes wrong:** R2 bucket CORS policy is set with `"AllowedHeaders": ["*"]` instead of `["content-type"]`. Washer photo uploads from the mobile app include a `content-type` header; wildcard works but violates VCL-06 requirement explicitly.
**Why it happens:** Default CORS examples use wildcard; explicit header list requires knowing the header name in advance.
**How to avoid:** Runbook for `CLOUDFLARE-R2-SETUP.md` must include the exact CORS JSON:
```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "PUT", "DELETE"],
  "AllowedHeaders": ["content-type"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3000
}
```
**Warning signs:** VCL-06 marked incomplete in requirements even after CORS is set.

---

## Code Examples

### WHATSAPP_ENABLED + BYPASS_SENTRY in envSchema

```typescript
// Source: apps/api/src/lib/env.ts — additions to envSchema z.object(...)
// Add after DIALOG360_API_KEY entry:

// --- Feature flags ---
WHATSAPP_ENABLED: z
  .string()
  .default('false')
  .transform((v) => v === 'true'),
BYPASS_SENTRY: z
  .string()
  .default('false')
  .transform((v) => v === 'true'),
```

### Updated Env Type Export

```typescript
// After envSchema definition — update Env type to reflect transforms
export type Env = z.infer<typeof envSchema>
// Now env.WHATSAPP_ENABLED is boolean, env.BYPASS_SENTRY is boolean
```

### prodSchema.superRefine Extension

```typescript
// Source: apps/api/src/lib/env.ts — extend existing superRefine at line 87
const prodSchema = envSchema.superRefine((data, ctx) => {
  // Existing: prod/staging required vars
  if (data.NODE_ENV === 'production' || data.NODE_ENV === 'staging') {
    const prodRequired: Array<[string, unknown]> = [
      ['STRIPE_WEBHOOK_SECRET', data.STRIPE_WEBHOOK_SECRET],
      ['RESEND_API_KEY', data.RESEND_API_KEY],
    ]

    // BYPASS_SENTRY: honored only in staging, ignored in production
    const sentriBypassActive = data.BYPASS_SENTRY && data.NODE_ENV !== 'production'
    if (!sentriBypassActive) {
      prodRequired.push(['SENTRY_DSN', data.SENTRY_DSN])
    }

    for (const [name, value] of prodRequired) {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${name} is required in ${data.NODE_ENV}`,
          path: [name],
        })
      }
    }
  }

  // WHATSAPP_ENABLED gate — applies in ALL environments
  if (data.WHATSAPP_ENABLED && !data.DIALOG360_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'DIALOG360_API_KEY is required when WHATSAPP_ENABLED=true',
      path: ['DIALOG360_API_KEY'],
    })
  }
})
```

### loadEnv() BYPASS_SENTRY warning

```typescript
// Source: apps/api/src/lib/env.ts — in loadEnv() after successful parse
function loadEnv(): Env {
  const result = prodSchema.safeParse(process.env)
  if (!result.success) {
    // ... existing error handling
  }

  // Emit warning when Sentry bypass is active (non-production only)
  if (result.data.BYPASS_SENTRY && result.data.NODE_ENV !== 'production') {
    console.warn(`\nWARN: Sentry bypassed in ${result.data.NODE_ENV} — error tracking disabled\n`)
  }

  return result.data
}
```

### .env.example additions (apps/api/.env.example)

```bash
# --- Feature Flags ---
# WHATSAPP_ENABLED: set to "true" once 360dialog templates are approved by Meta
# When true, DIALOG360_API_KEY becomes required.
WHATSAPP_ENABLED=false

# BYPASS_SENTRY: non-production only escape hatch.
# When true in staging/dev, SENTRY_DSN is not required (useful when Sentry is misconfigured).
# Ignored in production — SENTRY_DSN always required in production.
BYPASS_SENTRY=false
```

### .env.op.tpl example (apps/api/.env.op.tpl)

```bash
# Generated by: op inject -i apps/api/.env.op.tpl -o apps/api/.env
# Requires: op CLI installed + authenticated + access to "Cleanly" vault

NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

DATABASE_URL={{ op://Cleanly/Neon Production/database_url_pooled }}
DIRECT_URL={{ op://Cleanly/Neon Production/direct_url }}

UPSTASH_REDIS_URL={{ op://Cleanly/Upstash Redis/connection_string }}
UPSTASH_REDIS_REST_URL={{ op://Cleanly/Upstash Redis/rest_url }}
UPSTASH_REDIS_REST_TOKEN={{ op://Cleanly/Upstash Redis/rest_token }}

JWT_SECRET={{ op://Cleanly/JWT Secrets/jwt_secret }}
JWT_REFRESH_SECRET={{ op://Cleanly/JWT Secrets/jwt_refresh_secret }}

TWILIO_ACCOUNT_SID={{ op://Cleanly/Twilio/account_sid }}
TWILIO_AUTH_TOKEN={{ op://Cleanly/Twilio/auth_token }}
TWILIO_VERIFY_SERVICE_SID={{ op://Cleanly/Twilio/verify_service_sid }}

STRIPE_SECRET_KEY={{ op://Cleanly/Stripe/secret_key_test }}

RESEND_API_KEY={{ op://Cleanly/Resend/api_key }}

DIALOG360_API_KEY={{ op://Cleanly/360dialog/api_key }}

R2_ACCOUNT_ID={{ op://Cleanly/Cloudflare R2/account_id }}
R2_ACCESS_KEY_ID={{ op://Cleanly/Cloudflare R2/access_key_id }}
R2_SECRET_ACCESS_KEY={{ op://Cleanly/Cloudflare R2/secret_access_key }}
R2_BUCKET_NAME=cleanly-photos
R2_PUBLIC_URL={{ op://Cleanly/Cloudflare R2/public_url }}

SENTRY_DSN={{ op://Cleanly/Sentry/api_dsn }}
SENTRY_ORG=cleanly
SENTRY_AUTH_TOKEN={{ op://Cleanly/Sentry/auth_token }}

ADMIN_EXCHANGE_SECRET={{ op://Cleanly/JWT Secrets/admin_exchange_secret }}

WHATSAPP_ENABLED=false
BYPASS_SENTRY=false
```

### pnpm setup:env script

```json
// Root package.json scripts addition
"setup:env": "op inject -i apps/api/.env.op.tpl -o apps/api/.env && op inject -i apps/customer-web/.env.op.tpl -o apps/customer-web/.env.local && op inject -i apps/admin-web/.env.op.tpl -o apps/admin-web/.env.local && op inject -i apps/company-web/.env.op.tpl -o apps/company-web/.env.local && op inject -i apps/customer-mobile/.env.op.tpl -o apps/customer-mobile/.env && op inject -i apps/washer-mobile/.env.op.tpl -o apps/washer-mobile/.env && op inject -i packages/db/.env.op.tpl -o packages/db/.env"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.env.secret` + manual copy on each machine | 1Password CLI `op inject` from `.env.op.tpl` | 2023-present | One-command bootstrap; no secret leakage risk |
| GitHub repo-level secrets for all CI | GitHub Environments (scoped per staging/production) | 2021+ | Production secrets require explicit environment protection rules |
| Direct `process.env.*` reads throughout codebase | Zod-validated `env` singleton at startup | Established in this project | Single validation boundary; clean crash on missing vars |
| Wildcard CORS headers on storage | Explicit `AllowedHeaders: ["content-type"]` | VCL-06 requirement | Required for correct browser presigned upload behavior |
| 360dialog template approval blocking launch | Submit early; feature-flag the send path | D-11 / D-03 | Ship staging while templates are in review |

---

## Open Questions

1. **Neon region: Singapore vs Frankfurt?**
   - What we know: "Bahrain region" does not exist on Neon. The two candidates are ap-southeast-1 (Singapore, ~80ms from UAE) and eu-central-1 (Frankfurt, ~100-120ms from UAE).
   - What's unclear: User's actual preference given no Bahrain option.
   - Recommendation: Planner should surface this as a required user decision before the Neon provisioning task executes. Default recommendation is Singapore for Gulf users.

2. **Fly.io `bom` (Mumbai) region — does it exist?**
   - What we know: STATE.md and CONTEXT.md say "Mumbai (bom)" is locked for Fly.io. This is Fly.io (not Neon) — Fly.io does have a `bom` (Mumbai) region. Confirmed in prior Phase 9 research.
   - What's unclear: Nothing. This is fine. Fly.io Mumbai is real and Phase 8 only creates the account.
   - Recommendation: No action needed — Fly.io account creation is region-agnostic; region selection happens at app create time in Phase 9.

3. **Sentry plan: free vs paid?**
   - What we know: Sentry free tier is 5,000 errors/month per org. Phase 8 creates 6 projects sharing this quota.
   - What's unclear: At launch scale, will 5K errors/month be sufficient across all 6 surfaces?
   - Recommendation: Start on free tier; billing runbook should include "upgrade to Team plan if error volume exceeds 4K/month" alert.

4. **`process.env.*` migration scope in Phase 8 vs later?**
   - What we know: 15+ files in `apps/api/src/` bypass the `env` singleton. This is a functional gap that makes WHATSAPP_ENABLED and BYPASS_SENTRY gates ineffective.
   - What's unclear: Whether the planner scopes this migration into Phase 8 (ENV-02 extension) or creates a follow-up task.
   - Recommendation: Include `process.env.*` migration as a task within Phase 8 ENV-02 work. Without it, `sentry.ts` will ignore the BYPASS_SENTRY gate. The scope is bounded — all files are in `apps/api/src/lib/` and `apps/api/src/services/`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| GitHub CLI (`gh`) | ENV-03 (GitHub Environments) | Yes | 2.88.0 | Manual browser creation |
| `gh` authentication | ENV-03 | No — not authenticated | — | Must run `gh auth login` first |
| 1Password CLI (`op`) | D-10 (op inject workflow) | No — NOT installed | — | Manual .env file creation (defeats purpose; install op) |
| `flyctl` | ENV-05 (Fly.io secrets) | Not confirmed | — | Fly.io web dashboard secrets UI |
| Vercel CLI | ENV-05 (Vercel env vars) | Not confirmed | — | Vercel web dashboard env vars UI |
| Node.js | env.ts modification | Assumed available | — | — |

**Missing dependencies with no fallback:**
- 1Password CLI (`op`) — required for the `.env.op.tpl` inject workflow (D-10). Must install via `winget install AgileBits.1Password.CLI` or from https://developer.1password.com/docs/cli/get-started/ before setup:env script works. The plan Wave 0 must include `op` installation.

**Missing dependencies with fallback:**
- `gh` unauthenticated — fallback is manual browser creation, but CLI is strongly preferred for reproducibility. Plan Wave 0 must include `gh auth login`.
- `flyctl` not confirmed — fallback is Fly.io web dashboard. Phase 8 only creates the account; `flyctl secrets set` is needed in Phase 9 when deploying. Phase 8 can proceed without it.

---

## Sources

### Primary (HIGH confidence)
- `apps/api/src/lib/env.ts` — Direct read; existing Zod schema confirmed at lines 1-129
- `apps/api/.env.example` — Direct read; canonical env template format confirmed
- All 6 app `.env.example` files — Direct read; coverage analysis completed
- `turbo.json` — Direct read; env declarations confirmed; gaps identified for Expo vars
- `app.json` (root + mobile apps) — Direct read; EAS project IDs confirmed
- `eas.json` — Direct read; build profiles confirmed

### Secondary (MEDIUM confidence)
- [1Password CLI op inject reference](https://developer.1password.com/docs/cli/reference/commands/inject/) — Template syntax `{{ op://Vault/Item/field }}` confirmed via WebSearch
- [GitHub CLI gh secret set --env flag](https://cli.github.com/manual/gh_secret_set) — `--env` flag confirmed via WebSearch
- [Neon regions documentation](https://neon.com/docs/introduction/regions) — No Bahrain region confirmed; Singapore and Frankfurt available
- [360dialog template approval process](https://docs.360dialog.com/docs/waba-messaging/template-messaging) — Up to 48h approval via Meta confirmed

### Tertiary (LOW confidence)
- Upstash Fixed Plan vs PAYG BullMQ warning — from project CLAUDE.md (already research-validated in prior phase); treat as HIGH in this project context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all providers verified by reading actual project files and official docs
- Architecture: HIGH — env.ts pattern verified by direct code read; secret distribution model from CONTEXT.md decisions
- Pitfalls: HIGH — process.env violations discovered by actual grep; Neon Bahrain absence verified via Neon docs; other pitfalls from CLAUDE.md and established project decisions
- Env audit: HIGH — direct code analysis of all 6 app .env.example files and API source

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable providers; Neon region list could change)

**nyquist_validation:** false (per config.json) — Validation Architecture section omitted.

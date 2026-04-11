# Phase 8: Accounts & Environment - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 delivers **provisioned third-party accounts and validated secrets scaffolding** for the Cleanly platform. Concretely:

- 11 "instant" third-party service accounts created, owner-documented, billing-alerted, and secrets captured
- 360dialog WhatsApp template submission kicked off (Meta review runs in parallel)
- GitHub Environments (staging + production) created with CI-only secrets
- Fly.io secrets set for API/worker runtime; Vercel env vars set for web app runtime
- `.env.example` and `env.ts` Zod schema audited and extended for new env vars introduced in this phase (`WHATSAPP_ENABLED`, `BYPASS_SENTRY`)
- `.env.op.tpl` template files added alongside `.env.example` for 1Password CLI-based local bootstrap
- `op inject` workflow documented for fresh-laptop dev setup

**Deferred out of Phase 8 (explicitly):**
- Stripe Connect UAE manual onboarding (entity-gated) → future "Phase 8.5: Entity-gated provisioning"
- Apple Developer enrollment (business-email-gated) → same future phase
- Any actual runtime deploy work (that's Phase 9)

**This phase does NOT deliver:** running apps, Fly.io app creation, Vercel project linking, CI pipeline files, or Sentry project creation beyond the account signup. Those belong in later phases in v1.1.
</domain>

<decisions>
## Implementation Decisions

### Entity & Ownership

- **D-01:** UAE legal entity is **in progress but trade license not yet issued**. Stripe Connect UAE and Apple Developer Organization paths are blocked until the license lands — both explicitly deferred out of Phase 8.
- **D-02:** Account owner email = **personal Gmail for all 11 instant providers in Phase 8**. Will migrate to a business email once the trade license is issued. Any provider whose account email cannot change post-hoc (Apple Developer specifically) is deferred entirely.
- **D-03:** Phase 8 explicitly scopes to the **11 instant providers** (see D-17). The three slow/blocked ones are split:
  - **360dialog WhatsApp:** submit templates inside Phase 8 (templates are content-only, not tied to entity or email, and Meta review takes 1–2 weeks — starting day 1 is pure upside).
  - **Stripe Connect UAE:** deferred to post-entity phase.
  - **Apple Developer + APNs p8:** deferred to post-entity phase (Apple ID is effectively permanent; enrolling under personal Gmail now means costly rework later).

### Runbook & Execution Model

- **D-04:** Runbook format = **per-provider docs, one file per provider** under `docs/accounts/` (e.g., `docs/accounts/STRIPE-SETUP.md`, `docs/accounts/NEON-SETUP.md`, etc.). Each file is a self-contained checklist + field-by-field instructions + "where the secret goes afterward" section. Files survive as long-lived reference after Phase 8 closes.
- **D-05:** Execution model = **live in-session provisioning**. Claude guides the user through every signup in the Phase 8 execution session; user clicks, Claude captures secrets, commits `.env` and Zod schema changes in the same session. Phase 8 exits with accounts actually provisioned and secrets stored — not just a runbook written for later.
- **D-06:** Billing alerts + payment methods on **every paid provider** (Neon, Upstash, Stripe, Twilio, 360dialog, Resend, Sentry if paid tier, Cloudflare R2, Fly.io, Vercel, Expo EAS). Runbook includes a "set billing alert at $X" step for each. Fixed-cost annual providers (Apple, Google Play) still get payment method confirmation but no recurring alert.

### Secret Capture & Storage

- **D-07:** Secret capture flow = **1Password vault first, then everything else**. As each provider returns an API key / webhook secret / password / 2FA backup codes, the user pastes it into a 1Password item labeled `Cleanly - <Provider>` before anything else touches it. Runbook calls this out step by step.
- **D-08:** Secret partitioning across runtime platforms = **hybrid, platform-native**. No sync automation between platforms:
  - **Fly.io secrets** — all runtime secrets consumed by the API + BullMQ worker (DB, Redis, JWT, Stripe, Twilio, Resend, R2, Sentry server DSN, admin exchange secret, etc.)
  - **Vercel env vars** — runtime secrets for the 3 web apps (`NEXT_PUBLIC_*`, `VITE_*`, NextAuth secret, Google OAuth client, browser Sentry DSN)
  - **GitHub Environments** — CI-consumed secrets only: Neon `DIRECT_URL` for `prisma migrate deploy`, Sentry auth token for source map upload, Turbo remote cache token, any Fly.io deploy token or Vercel deploy hook
  - Each secret lives in exactly the place that consumes it. Clean boundaries; 3× rotation surface accepted as the trade-off.

- **D-09:** Recovery / disaster layout = **1Password primary + offline sealed backup**. Primary vault is the working source. Secondary is a periodically refreshed encrypted export (age- or GPG-encrypted) of the vault, stored offline (USB drive, or a second private repo). Belt-and-suspenders protection if 1Password account is ever locked out.

- **D-10:** Local development bootstrap = **1Password CLI `op inject`**. Each app gets a `.env.op.tpl` file committed alongside `.env.example`. The template has `{{ op://Cleanly/<Item>/<field> }}` references; `op inject -i apps/api/.env.op.tpl -o apps/api/.env` produces the real `.env`. One command bootstraps every app on a fresh laptop.
  - **Two files per app:** `.env.example` stays as fake-value documentation (readable without 1Password CLI); `.env.op.tpl` is the functional template.
  - Fresh-clone setup doc (SETUP.md or similar) documents how to install `op` and authenticate.

### Env Validation (env.ts Zod Schema Extensions)

- **D-11:** **Add `WHATSAPP_ENABLED` boolean env var.** Behavior:
  - Default `false`.
  - When `WHATSAPP_ENABLED === 'true'`, `DIALOG360_API_KEY` must be set (enforced in `prodSchema.superRefine`).
  - When `false`, `DIALOG360_API_KEY` is not required and WhatsApp notification code paths silently no-op with a log warning.
  - This preserves the ability to ship staging/production while 360dialog templates are still in Meta review, without silent `undefined`s at send time.
  - Applies in all environments (not only staging/production).

- **D-12:** **Add `BYPASS_SENTRY` escape hatch for non-production.** Behavior:
  - Default `false`.
  - In production (`NODE_ENV === 'production'`), `BYPASS_SENTRY` is **ignored** — `SENTRY_DSN` is always required.
  - In staging or development, `BYPASS_SENTRY === 'true'` suppresses the `SENTRY_DSN` required-in-prodSchema check so the API can boot if Sentry is misconfigured or down.
  - Boot log must emit a `WARN: Sentry bypassed in <env>` line when the hatch is active.
  - Does NOT relax the default: Sentry remains required in both staging and production unless the hatch is set.

- **D-13:** **Targeted audit** of env surface area, NOT full-monorepo grep. Scope:
  - The 6 app `.env.example` files (api, customer-web, admin-web, company-web, customer-mobile, washer-mobile) + `packages/db/.env.example`.
  - `apps/api/src/lib/env.ts` Zod schema against actual `process.env.*` references inside `apps/api/src/**`.
  - Each web app's `.env.example` against actual `process.env.NEXT_PUBLIC_*` / `import.meta.env.VITE_*` references in `apps/{customer-web,admin-web,company-web}/src/**`.
  - Skip `packages/` unless something obviously surfaces; do not do a whole-monorepo grep.
  - Patch gaps as they're found. Add the two new vars (`WHATSAPP_ENABLED`, `BYPASS_SENTRY`) to both `.env.example` and `env.ts`.

### Claude's Discretion

- The exact file structure under `docs/accounts/` (ordering, front-matter, whether to include screenshot-ref anchors). Ship a clean, consistent format; user will push back if they want screenshots.
- Exact 1Password item naming convention beyond `Cleanly - <Provider>` (fields layout, tags, section structure).
- How `op inject` is wired into the monorepo developer workflow: a top-level `pnpm setup:env` script, a `Makefile` target, or plain `op inject` commands documented in SETUP.md. Claude picks the most idiomatic option for a Turborepo + pnpm project.
- Exact shape of the targeted env audit report (markdown table, diff format, etc.) — produced as part of the phase but format is Claude's call.
- Whether `WHATSAPP_ENABLED` defaults to `false` everywhere or `true` in staging/production once templates are approved. Default `false` for now per D-11.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements

- `.planning/ROADMAP.md` §"Phase 8: Accounts & Environment" — phase goal, 19 requirements, success criteria
- `.planning/REQUIREMENTS.md` §"Account Setup" (ACCT-01 through ACCT-14) — one provider per row
- `.planning/REQUIREMENTS.md` §"Environment & Secrets" (ENV-01 through ENV-05)
- `.planning/PROJECT.md` §"Current Milestone: v1.1 Ship to Production" — target features, stack, current state
- `.planning/STATE.md` §"Accumulated Context → Decisions" — all v1.1 decisions already locked
- `.planning/STATE.md` §"Accumulated Context → Pending Todos" — 360dialog, Stripe Connect UAE, Apple Developer todos already tracked

### Existing Codebase Assets (already in place)

- `apps/api/src/lib/env.ts` — existing Zod schema for API env validation. Phase 8 EXTENDS this with `WHATSAPP_ENABLED` and `BYPASS_SENTRY`; does not replace.
- `apps/api/.env.example` — most complete existing env template; reference for other apps.
- `apps/customer-web/.env.example`, `apps/admin-web/.env.example`, `apps/company-web/.env.example` — existing web env templates; audit against actual usage.
- `apps/customer-mobile/.env.example`, `apps/washer-mobile/.env.example` — mobile env templates.
- `packages/db/.env.example` — Prisma/Neon database env template.
- `turbo.json` — env declarations already set (VCL-04 complete).

### Prior Phase Artifacts (v1.1)

- `.planning/phases/09-infrastructure-deployment/09-RESEARCH.md` — infrastructure research consumed by 09-01; may contain secondary context relevant to accounts (Fly.io machine config, Vercel project setup).
- `.planning/phases/09-infrastructure-deployment/09-01-SUMMARY.md` — what 09-01 completed (Dockerfile, fly.toml, /healthz, rate-limit namespace, turbo.json env declarations). Confirms which requirements are ALREADY done.

### External docs referenced during discussion

- Stripe UAE Connect manual onboarding — must open support ticket (no canonical URL yet; to be captured in `docs/accounts/STRIPE-SETUP.md` when Phase 8.5 runs)
- 360dialog template approval — `https://hub.360dialog.com` (general docs; Phase 8 runbook will capture specific template-submission path)
- Neon PgBouncer two-URL convention — already encoded in `apps/api/src/lib/env.ts:22-27` (pooled vs direct URL refinement)
- Upstash Redis Fixed Plan requirement — already encoded in `apps/api/src/lib/env.ts:30-32` (`rediss://` enforcement); Phase 8 runbook must flag "choose Fixed Plan, not PAYG"

### Provider list (the 11 instant + deferred 3)

**In Phase 8 (11 instant + 1 submit-only):**
1. Neon PostgreSQL (ACCT-03) — production branch, Bahrain/Frankfurt, pooled + direct URLs
2. Upstash Redis (ACCT-04) — **Fixed Plan $10/mo**, not PAYG
3. Twilio Verify (ACCT-05) — UAE SMS, Verify service SID
4. Resend (ACCT-07) — sender domain verification
5. Sentry (ACCT-08) — org + 6 projects (api, customer-web, admin-web, company-web, customer-mobile, washer-mobile)
6. Cloudflare R2 (ACCT-09) — account + bucket + CORS policy (explicit `content-type`, not `*`)
7. Fly.io (ACCT-10) — account only (app creation is Phase 9)
8. Vercel (ACCT-11) — account only (project linking is Phase 9)
9. Expo EAS (ACCT-12) — account + project IDs for both mobile apps
10. Google Play Console (ACCT-14) — $25 personal enrollment OK
11. GitHub Environments (ENV-03) — staging + production environments with scoped secrets
12. **360dialog** (ACCT-06) — account + template SUBMISSION only (approval happens async in Meta review)

**Deferred out of Phase 8:**
- ACCT-01, ACCT-02 — Stripe + Stripe Connect UAE (blocked on entity)
- ACCT-13 — Apple Developer + APNs p8 (blocked on business email)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Zod env validation pattern** — `apps/api/src/lib/env.ts` already implements the exact pattern Phase 8 needs: `z.object(...)` schema, `safeParse` with readable error output, `superRefine` for environment-conditional required vars, exported `env` singleton loaded once at startup. Phase 8 EXTENDS this file — does not rebuild it.
- **Two-URL Neon refinement** — `DATABASE_URL.refine(u => u.includes('-pooler'))` and `DIRECT_URL.refine(u => !u.includes('-pooler'))` already in place. Phase 8 plan must preserve these; D-01 (ENV-04) is already code-complete.
- **Prod-only strictness pattern** — `prodSchema.superRefine` at `env.ts:87` iterates `prodRequired` array. Phase 8 extends this array for WhatsApp conditional and adds BYPASS_SENTRY escape logic.
- **`.env.example` style guide** — `apps/api/.env.example` is the canonical template format: section headers with `--- Section ---`, inline comments explaining each var, links to provider dashboards, generation commands for secrets. Other apps should match this style.

### Established Patterns

- **Env singleton import** — `import { env } from './lib/env.js'` is the enforced pattern; new code must not read `process.env.*` directly. Audit step (D-13) must check for `process.env.` usage outside `env.ts` and flag violations.
- **Optional-in-dev-required-in-prod** — The `prodSchema.superRefine` pattern is the established way to make vars conditionally required per NODE_ENV. New vars (`WHATSAPP_ENABLED`, `BYPASS_SENTRY`) must use the same mechanism, not a separate validation layer.
- **.env.local for Next.js apps, .env for Fastify** — customer-web, admin-web, company-web use Next.js `.env.local` convention per their existing `.env.example` headers. API uses plain `.env`. `op inject` output paths must respect this.

### Integration Points

- **`apps/api/src/server.ts`** — Where `env` is first imported (drives startup crash on invalid env). Phase 8 changes to `env.ts` automatically surface here at boot.
- **`apps/api/src/lib/notifications/`** (or equivalent) — WhatsApp send code paths must check `env.WHATSAPP_ENABLED` before calling 360dialog. Location TBD by researcher.
- **`apps/api/src/lib/sentry.ts`** (or equivalent) — Sentry init code paths must check `env.BYPASS_SENTRY` and skip init if set in non-production. Location TBD by researcher.
- **`docs/accounts/`** — New directory. Phase 8 creates it. 11 files, one per provider.
- **`.env.op.tpl` files** — New files, committed alongside every existing `.env.example`. Gitignored `.env` / `.env.local` remain the `op inject` output destinations.
- **Top-level `package.json` scripts / Makefile** — Add a `setup:env` target (exact shape is Claude's Discretion per D-10 + discretion note) that runs `op inject` for every app.

</code_context>

<specifics>
## Specific Ideas

- **1Password vault name: `Cleanly`** with item-per-provider naming (`Cleanly - Stripe`, `Cleanly - Neon`, `Cleanly - Fly.io`, etc.). Mentioned explicitly in D-07.
- **`op://Cleanly/<Item>/<field>` reference syntax** for `.env.op.tpl` files. Standard 1Password CLI format.
- **`docs/accounts/` directory** — 11 files, one per provider, per D-04. Files are long-lived reference docs, not phase-scoped scratch.
- **`WHATSAPP_ENABLED` + `BYPASS_SENTRY`** — Exact env var names are fixed by this CONTEXT.md; downstream planner should not rename them.
- **Fly.io Mumbai (`bom`)** — already locked by prior phase. Phase 8 runbook for Fly.io signup does NOT need to re-discuss region.
- **Upstash Fixed Plan ($10/mo)** — explicit callout in the runbook; failure mode if user clicks PAYG is catastrophic billing (documented in STATE.md decisions).
- **Cloudflare R2 CORS `content-type` (not `*`)** — already in VCL-06 requirement, surfaces in R2 setup doc.
- **Neon region: Bahrain/nearest Middle East** — per PROJECT.md constraint; runbook must specify exact region at signup time.
- **Stripe UAE Connect: manual onboarding, not self-serve Express** — documented blocker; when Phase 8.5 runs, runbook must route through Stripe Support ticket, not dashboard.

</specifics>

<deferred>
## Deferred Ideas

### Spun off to "Phase 8.5: Entity-gated provisioning" (post-UAE-trade-license)

- **Stripe account creation (ACCT-01)** — Stripe UAE live + test mode, AED currency
- **Stripe Connect UAE platform (ACCT-02)** — manual support-ticket onboarding path, UAE company docs required
- **Apple Developer enrollment (ACCT-13)** — Organization (with D-U-N-S) once business email exists; APNs p8 key generation
- **Business email creation + provider migration** — Once the business email is live, audit every Phase 8 provider account and migrate the owner email where supported.

### Not in scope for Phase 8 or 8.5

- **Phase 9 work** (actual Fly.io app creation, Vercel project linking, staging deploy) — stays in Phase 9.
- **Sentry 6-project config with source maps wiring** — Phase 8 just creates the Sentry org and DSNs. Phase 10 (CI/CD & Monitoring) handles source map upload, release tagging, and alert routing.
- **Stripe webhook endpoint registration** — Phase 10, after the API URL is real.
- **GitHub branch protection rules, required reviewers, OIDC federation** (Vercel/Fly deploy tokens via OIDC instead of static secrets) — deliberately NOT discussed. Can come up in Phase 10 CI/CD if user wants.
- **Twilio sender ID / UAE messaging regulation** — briefly touched on but deferred; the Verify service doesn't require a sender ID, and SMS sending (if ever needed) can be a v1.2 concern.

### Reviewed Todos (not folded)

None — no pending todos matched Phase 8 via `gsd-tools todo match-phase 8`. The existing STATE.md "Pending Todos" (360dialog, Stripe Connect UAE, Apple Developer) are already implicitly covered by phase scope or deferred explicitly via D-03.

</deferred>

---

*Phase: 08-accounts-environment*
*Context gathered: 2026-04-12*

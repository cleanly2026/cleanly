# Phase 8: Accounts & Environment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 08-accounts-environment
**Areas discussed:** Entity & critical-path, Runbook & execution model, Secret storage & recovery, Env strictness & .env audit

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Entity & critical-path | Account ownership, UAE trade license, which accounts block the roadmap | ✓ |
| Runbook & execution model | How Claude and user collaborate on 14 signups Claude can't click through | ✓ |
| Secret storage & recovery | GitHub Environments / Fly.io / Vercel partitioning, 2FA backup, local dev | ✓ |
| Env strictness & .env audit | prodSchema tightness for partial rollout, audit scope | ✓ |

**User's choice:** All 4 areas

---

## Area 1: Entity & critical-path

### Q1: UAE legal entity status

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, UAE entity ready | Trade license in hand; Stripe/Apple/Google Org paths open | |
| In progress, not yet issued | Entity being formed, no trade license yet | ✓ |
| No entity, personal only | Individual enrollment path for all providers | |
| Entity outside UAE | Non-UAE entity forces Stripe pivot away from UAE Connect | |

**User's choice:** In progress, not yet issued
**Notes:** Drives D-01, D-03 (defer Stripe Connect UAE and Apple Developer out of Phase 8)

### Q2: Account owner email identity

| Option | Description | Selected |
|--------|-------------|----------|
| Personal Gmail | Simplest; sign up everything under personal Gmail | |
| Dedicated team alias | cleanly.team@ or ops@cleanly.ae for future handoff | |
| Mix: business for money, personal for dev | Split money-side vs dev-side | |

**User's choice:** (Other / free-text) "for now using personal gmail, once the business trade is ready will have a business email"
**Notes:** Drives D-02 (personal Gmail now, migrate post-trade-license). Led to follow-up Q about Apple Developer enrollment and the Apple ID re-enrollment trap.

### Q3: Critical-path vs parallel-track accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe Connect UAE (manual) | Manual support ticket, 2-4 wk approval | |
| 360dialog WhatsApp templates | 1-2 wk Meta review | |
| Apple Developer + APNs p8 | 1-5 day (Individual) or 2-4 wk (Org) enrollment | |
| All other 11 providers | Instant signups, parallel-track | ✓ |

**User's choice:** All other 11 providers (only)
**Notes:** Claude interpreted this as "don't block Phase 8 on the three slow ones" and asked a disambiguation follow-up (Q4).

### Q4 (follow-up): Handling of the 3 slow accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Defer all 3 out of Phase 8 | 11 instant + env scaffolding only; slow ones go to Phase 8.5 | |
| Start in Phase 8, don't block exit | Submit tickets/apps now under personal Gmail, exit on 11 done | |
| Mixed: submit 360dialog, defer Stripe + Apple | Submit WhatsApp templates (not entity/email gated), defer Stripe + Apple entirely | ✓ |

**User's choice:** Mixed: submit 360dialog, defer Stripe + Apple
**Notes:** Drives D-03. 360dialog submission is pure upside since templates are content, not tied to entity.

### Q5 (follow-up): Apple Developer email strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Wait for business email | Push Apple enrollment to post-entity phase entirely | ✓ |
| Fresh Apple ID under neutral address | Permanent neutral owner, independent of personal Gmail | |
| Use personal Apple ID, accept rework later | Enroll now, migrate later with App Store Connect handoff | |

**User's choice:** Wait for business email
**Notes:** Avoids the Apple ID permanence trap. Reinforces D-03 (Apple deferred).

### Q6 (follow-up): Billing alerts & payment methods

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, alerts on every paid provider | Set billing alert at $X for each paid provider in the runbook | ✓ |
| Only on unpredictable ones | Alert only on PAYG-risk providers (Upstash, Twilio, Stripe fees, 360dialog) | |
| Defer billing alerts to Phase 10 | Just confirm payment methods, do alerts in monitoring phase | |

**User's choice:** Yes, alerts on every paid provider
**Notes:** Drives D-06.

---

## Area 2: Runbook & execution model

### Q7: Runbook structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single RUNBOOK.md with per-provider checklists | One file, 11 sections | |
| Per-provider docs (11 files) | One markdown file per provider under docs/accounts/ | ✓ |
| RUNBOOK.md + inline screenshot refs | Single file with screenshot anchors for visual audit trail | |

**User's choice:** Per-provider docs (11 files)
**Notes:** Drives D-04. Files will live as long-lived reference after Phase 8 closes.

### Q8: Execution model (live vs async)

| Option | Description | Selected |
|--------|-------------|----------|
| Execute signups inside Phase 8 | Live session, Claude guides, user clicks, same-session secret capture | ✓ |
| Produce runbook only, execute async | Phase 8 writes the runbook, user executes later | |
| Hybrid: live for instant, async for slow | Split by signup duration | |

**User's choice:** Execute signups inside Phase 8
**Notes:** Drives D-05. Phase 8 exits with accounts actually provisioned, not just a runbook.

### Q9: Secret capture destination

| Option | Description | Selected |
|--------|-------------|----------|
| Local .env files only | Direct to .env, no intermediate store | |
| 1Password / password manager first | Paste to 1Password vault before anything else | ✓ |
| Temporary encrypted file in .planning/secrets.age | age-encrypted in-repo during phase, deleted after | |

**User's choice:** 1Password / password manager first
**Notes:** Drives D-07. Establishes 1Password as the durable source of truth.

---

## Area 3: Secret storage & recovery

### Q10: Secret partitioning across platforms

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub = source of truth, others sync from it | Central GitHub Environments, CI pushes to Fly/Vercel | |
| Per-platform direct entry | Set secrets directly in each platform UI | |
| Hybrid: platform-native for runtime, GitHub for CI | Fly for API runtime, Vercel for web runtime, GitHub only for CI-consumed | ✓ |

**User's choice:** Hybrid: platform-native for runtime, GitHub for CI
**Notes:** Drives D-08. Clean boundaries, 3× rotation surface accepted.

### Q11: Recovery / disaster layout

| Option | Description | Selected |
|--------|-------------|----------|
| 1Password (one vault) | Single vault, single source | |
| 1Password + offline sealed backup | Vault + age/GPG-encrypted offline export | ✓ |
| 1Password + paper printout in safe | Vault + physical paper backup | |

**User's choice:** 1Password + offline sealed backup
**Notes:** Drives D-09.

### Q12: Local dev bootstrap

| Option | Description | Selected |
|--------|-------------|----------|
| Pull from 1Password manually | Copy/paste per app from vault | |
| 1Password CLI (op inject) | `op inject -i .env.op.tpl -o .env` with op:// refs | ✓ |
| Shared dev credentials in the vault | Single shared dev item for any future collaborator | |

**User's choice:** 1Password CLI (op inject)
**Notes:** Drives D-10. Ripple effect: introduces `.env.op.tpl` files alongside `.env.example` (decided in Q16).

---

## Area 4: Env strictness & .env audit

### Q13: DIALOG360_API_KEY strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Keep optional in staging + production (current) | Silent no-op if missing | |
| Required in production, optional in staging | Staging can run WA-off | |
| Required + feature flag | Add WHATSAPP_ENABLED flag, DIALOG360_API_KEY required when enabled | ✓ |

**User's choice:** Required + feature flag
**Notes:** Drives D-11. New `WHATSAPP_ENABLED` env var added to Zod schema.

### Q14: Sentry strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Required in staging + production (current) | No relaxation | |
| Required in production only | Staging can boot without Sentry | |
| Required in both, with BYPASS_SENTRY escape hatch | Keep enforcement, allow bypass in non-production | ✓ |

**User's choice:** Required in both, with BYPASS_SENTRY escape hatch
**Notes:** Drives D-12. New `BYPASS_SENTRY` env var; production ignores the hatch.

### Q15: Audit scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full audit: grep all process.env across monorepo | Thorough, 30-60 min, catches silent gaps | |
| Targeted audit: 6 apps + api env.ts | 10-15 min, ~80% coverage | ✓ |
| No audit, patch on-the-fly | Skip upfront, catch at deploy | |

**User's choice:** Targeted audit
**Notes:** Drives D-13.

### Q16: .env.op.tpl layout

| Option | Description | Selected |
|--------|-------------|----------|
| New .env.op.tpl alongside .env.example | Two files per app, example = docs, tpl = functional | ✓ |
| Replace .env.example with .env.op.tpl | One file, comments for docs | |
| Root-level .env.op.tpl covering all apps | Centralized, script dispatches per app | |

**User's choice:** New .env.op.tpl files alongside .env.example
**Notes:** Drives D-10 details. `.env.example` stays readable without 1Password CLI.

---

## Final gate

### Q17: Ready vs explore more

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Write CONTEXT.md and hand off to planner | ✓ |
| Explore more gray areas | GitHub branch protection, OIDC, Twilio sender ID, Stripe test data, etc. | |

**User's choice:** Ready for context

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` → "Claude's Discretion" subsection. Summary:

- Exact file structure under `docs/accounts/` (ordering, front-matter, screenshot anchors)
- 1Password item naming conventions beyond `Cleanly - <Provider>`
- `op inject` wiring into monorepo workflow (pnpm script vs Makefile vs plain commands)
- Format of the targeted env audit report
- Whether `WHATSAPP_ENABLED` gets flipped to `true` in staging/production once templates approve (default `false` for now)

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Summary:

- Stripe Connect UAE (ACCT-01, ACCT-02) → Phase 8.5 post-entity
- Apple Developer + APNs (ACCT-13) → Phase 8.5 post-entity
- Business email creation + provider migration → Phase 8.5 post-entity
- Sentry 6-project source map wiring → Phase 10
- Stripe webhook endpoint registration → Phase 10
- GitHub branch protection, required reviewers, OIDC federation → Phase 10 (if user wants)
- Twilio sender ID / UAE messaging regulation → v1.2+

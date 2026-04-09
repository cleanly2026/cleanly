# Phase 1: Foundation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Monorepo scaffold, full database schema (including both order state machines), all four authentication paths (customer OTP, company email+MFA, washer OTP+PIN, admin SSO), and RTL/i18n infrastructure. No user-facing features yet — this phase creates the foundation every subsequent phase builds on.

Requirements: INFRA-01 through INFRA-10, AUTH-01 through AUTH-07, I18N-01 through I18N-06 (23 requirements total).

</domain>

<decisions>
## Implementation Decisions

### DB Schema — Order Model
- **D-01:** Single `orders` table for common fields (customer_id, company_id, washer_id, status, payment fields, timestamps) + a `carpet_order_details` extension table for carpet-specific fields (return_date, pickup_time, pickup_photo_url, return_photo_url, etc.). Order type distinguished by a `type` column (`on_site` / `carpet`).
- **D-02:** Single status enum combining all states from both lifecycles (~13 unique states). Application layer enforces valid state transitions per order type. The enum includes: `pending`, `accepted`, `washer_assigned`, `washer_en_route`, `in_progress`, `completed`, `cancelled`, `pickup_scheduled`, `picked_up`, `in_cleaning`, `ready_for_return`, `return_scheduled`, `out_for_return`, `returned`.
- **D-03:** Bilingual content uses separate `_en` and `_ar` columns (e.g., `name_en`, `name_ar`, `description_en`, `description_ar`). Not JSON, not a translations table. Both columns required — enforced at schema level.
- **D-04:** GPS columns use PostGIS `geography` type (not `geometry`, not plain floats). Enables `ST_DWithin` for radius-based company filtering and accurate distance calculations on Earth's surface.

### Hosting & Deploy
- **D-05:** Decision deferred — Claude's discretion based on research. STATE.md notes Fly.io has Bahrain region for lower Gulf latency; Railway has better solo-dev DX.

### Auth Strategy
- **D-06:** Decision deferred — Claude's discretion. Blueprint specifies Twilio Verify for OTP, bcrypt for company passwords, Google SSO for admin. Open to alternatives if research finds better options for solo dev context.

### Monorepo Structure
- **D-07:** Decision deferred — follow blueprint layout (6 apps + shared packages in Turborepo). Claude's discretion on package boundaries and naming.

### Claude's Discretion
- Hosting provider choice (Railway vs Fly.io) — research should compare
- Auth implementation details (Twilio vs alternatives, JWT structure, token storage)
- Monorepo package boundaries and naming conventions
- Prisma schema file organization (single file vs split)
- CI/CD pipeline configuration details
- Sentry project setup details
- Loading skeleton design for future UI phases

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Blueprint & Architecture
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full v1 requirements with REQ-IDs for this phase (INFRA-*, AUTH-*, I18N-*)
- `.planning/ROADMAP.md` — Phase goals and success criteria

### Stack Research
- `.planning/research/STACK.md` — Verified tech stack with versions, rationale, alternatives
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, build order
- `.planning/research/PITFALLS.md` — 10 critical pitfalls with prevention strategies
- `.planning/research/CONTEXT7_VERIFIED.md` — Copy-paste-ready code patterns verified via Context7 (Fastify, Prisma+Neon, Next.js i18n, Expo, Socket.io, Stripe Connect)

### Domain Research
- `.planning/research/FEATURES.md` — Feature landscape, both order lifecycles (7-state on-site + 10-state carpet), carpet pickup-return states defined
- `.planning/research/SUMMARY.md` — Research synthesis with phase implications

### PDF Blueprints (source of truth for schema + security)
- `Cleanly_Platform_Blueprint.pdf` — Pages 5-8: Full 15-table database schema; Page 11: Security blueprint; Page 3: Monorepo structure
- `Cleanly_Vibe_Coding_Guide.pdf` — Pages 5-6: CLAUDE.md templates for root and per-app; Pages 12-13: Build order with exact prompts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code.

### Established Patterns
- None — this phase establishes all conventions.

### Integration Points
- This phase creates the integration points all other phases connect to:
  - Prisma schema (packages/prisma/)
  - Shared TypeScript types (packages/shared-types/)
  - i18n translation strings (packages/i18n/)
  - Fastify API server with JWT auth middleware (apps/api/)
  - Shared UI components with RTL support (packages/ui-components/)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow the blueprint's recommended structure and conventions unless research suggests improvements for solo-dev context.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-31*

# Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-09
**Phases:** 7 | **Plans:** 47 | **Tasks:** 77

### What Was Built

- Turborepo monorepo with 6 apps + 6 shared packages, full CI pipeline
- Four-role auth: customer OTP, washer OTP+PIN, company email+TOTP MFA, admin Google SSO
- Full booking-to-payout: discovery, on-site (7-state) + carpet (10-state) lifecycles, Stripe Connect payouts
- Real-time GPS tracking with animated map markers, before/after photo evidence via R2
- Multi-channel bilingual notifications: push, SMS, WhatsApp, email across 14 lifecycle events
- Admin panel: company review, disputes, refunds, cities, audit log
- Bilingual Arabic RTL + English across all 5 surfaces

### What Worked

- **GSD workflow** — discuss → plan → execute pipeline kept phases focused and well-scoped
- **Wave-based parallelization** — independent plans executed in parallel, cutting wall-clock time significantly
- **Milestone audit** — caught 5 broken cross-phase integrations and 22 stale checkboxes before shipping
- **Gap closure phases (5-7)** — structured approach to closing audit findings worked cleanly
- **Monorepo shared packages** — types, UI, config packages eliminated duplication across 6 apps
- **Solo dev velocity** — 47 plans in 10 days with AI assistance

### What Was Inefficient

- **SUMMARY.md one-liner extraction** — many summaries had malformed one-liners (empty or "One-liner:" prefix only), causing noisy MILESTONES.md auto-generation
- **Phase 7 progress table** — ROADMAP.md showed 1/2 when both plans were complete (stale update)
- **Audit happened late** — running audit earlier (e.g., after Phase 4) would have caught integration issues sooner
- **Some decisions scattered** — STATE.md accumulated 60+ decisions that should have been pruned after each phase

### Patterns Established

- `autoConnect=false` for Socket.io clients — explicit connect after auth
- Graceful env guard pattern (warn + return, never crash) for optional third-party services
- `preHandler authenticate` + 403 pattern for role-based API routes
- Logical CSS properties throughout (`ms-`, `me-`, `marginStart`, `marginEnd`)
- Domain-organized Zod schemas (not by HTTP method)
- `buildTestApp` with passthrough validator for integration tests

### Key Lessons

1. **Run milestone audit at Phase 4 boundary, not after all phases** — integration bugs compound
2. **SUMMARY.md template compliance matters** — enforce one-liner field format in executor
3. **Gap closure phases are normal, not failures** — 3 out of 7 phases were gap closure; plan for ~30% overhead
4. **STATE.md decisions section needs periodic pruning** — archive to PROJECT.md at phase transitions
5. **Socket.io room naming convention (entity:{id})** established early prevented room confusion across 4 surfaces

### Cost Observations

- Model mix: ~70% Opus (planning, execution), ~25% Sonnet (parallel agents), ~5% Haiku (quick lookups)
- Sessions: ~15 across 10 days
- Notable: Wave-based parallel execution of 2-3 agents per phase kept costs reasonable while maximizing throughput

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 7 |
| Plans | 47 |
| Tasks | 77 |
| Timeline | 10 days |
| Commits | 201 |
| LOC | ~22,400 |
| Gap closure phases | 3 (43%) |
| Requirements covered | 83/84 (99%) |

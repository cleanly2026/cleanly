# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 01-foundation
**Areas discussed:** DB schema design

---

## Gray Area Selection

| Area | Description | Selected |
|------|-------------|----------|
| Hosting & deploy | Railway vs Fly.io, Vercel for frontends | |
| Auth strategy | OTP provider, JWT structure, token storage, MFA | |
| DB schema design | Order model, status enums, bilingual fields, GPS columns | ✓ |
| Monorepo structure | Turborepo layout, shared packages scope, naming | |

**User selected:** DB schema design only. Other areas deferred to Claude's discretion.

---

## DB Schema Design

### Order Model

| Option | Description | Selected |
|--------|-------------|----------|
| Single orders table | One table with 'type' column, shared + nullable type-specific fields | |
| Two separate tables | on_site_orders + carpet_orders, clean separation but duplicated logic | |
| Single table + extension | One orders table + carpet_order_details for carpet-specific fields | ✓ |

**User's choice:** Single table + extension
**Notes:** Common fields (customer, company, washer, status, payment, timestamps) in orders table. Carpet-specific fields (return_date, pickup_time, etc.) in carpet_order_details extension table.

### Status Field

| Option | Description | Selected |
|--------|-------------|----------|
| Single enum with all states | ~13 unique states combined, app layer enforces per-type validity | ✓ |
| Two separate enums | on_site_status + carpet_status columns, DB-level type safety | |
| You decide | Claude picks best approach | |

**User's choice:** Single enum with all states
**Notes:** Application layer enforces which state transitions are valid per order type.

### Bilingual Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Keep _en/_ar columns | name_en, name_ar — queryable, indexable, enforces both exist | ✓ |
| JSON column per field | name: {en, ar} — fewer columns but less queryable | |
| Separate translations table | Generic entity translations — flexible but complex joins | |

**User's choice:** Keep _en/_ar columns (blueprint approach)
**Notes:** Both columns required at schema level.

### GPS Columns

| Option | Description | Selected |
|--------|-------------|----------|
| PostGIS geography | ST_DWithin for radius queries, accurate Earth-surface distance | ✓ |
| Plain float columns | Simpler, no PostGIS dependency, app-level distance calc | |
| You decide | Claude picks based on feature needs | |

**User's choice:** PostGIS geography
**Notes:** Research confirmed Neon supports PostGIS. Geography type (not geometry) uses WGS84 matching GPS hardware.

---

## Claude's Discretion

- Hosting provider choice (Railway vs Fly.io)
- Auth implementation details (Twilio vs alternatives, JWT structure)
- Monorepo package boundaries and naming
- Prisma schema organization
- CI/CD pipeline details

## Deferred Ideas

None — discussion stayed within phase scope.

# Backend API & Data Layer Criteria — Cleanly Platform

> Evaluator type: AI agent (gsd-evaluator) | Scoring: 1-10 per dimension
> Weighting: Data Modeling, Persistence Design, and API Design weighted **1.5x**; Error Handling and Data Integrity weighted **1x**.

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific evidence: Prisma schema decisions, API route handlers, error responses, database query patterns, Zod validation schemas. If you are unsure whether something meets a threshold, score it lower and explain why.

## Context

Cleanly uses Fastify 5 + Prisma 6 + Neon PostgreSQL (Bahrain region) + Upstash Redis + BullMQ. The API serves 5 client surfaces. Key data patterns: PostGIS geography for location queries, dual order lifecycle (7-state on-site, 10-state carpet via combined 14-state enum), bilingual _en/_ar columns, Stripe Connect for payments, phone OTP + email/password + Google SSO auth.

## Dimensions

### 1. Data Modeling (Weight: 1.5x)

Is the Prisma schema well-designed for the domain? Correct entity relationships, proper use of types (PostGIS geography, not floats for coordinates), bilingual columns as separate fields (not JSON), sensible enums, and schema decisions that support both order lifecycle models.

| Score | Description |
|-------|-------------|
| 9-10  | Clean, well-typed schema that maps naturally to the cleaning marketplace domain. OrderStatus enum covers both lifecycles correctly. PostGIS geography used for all location columns. Bilingual _en/_ar columns are NOT NULL @db.Text throughout. Relations support all query patterns needed (customer orders, company orders, washer assignments). |
| 7-8   | Solid schema with minor suboptimal choices. Relationships are correct. A few missing indexes or slightly awkward field placements. |
| 5-6   | Works but shows signs of not thinking through relationships. Some denormalization issues, missing foreign keys, or incorrect type choices (e.g., Float instead of geography). |
| 3-4   | Poor modeling. Missing relationships, wrong data types, enum doesn't cover all states. Would require significant migration to support basic features. |
| 1-2   | Schema is fundamentally broken. Missing tables, broken relations, would require rewrite. |

### 2. Persistence Design (Weight: 1.5x)

Is the database layer well-architected? Proper use of Neon adapter with PgBouncer pooling, migration strategy (Prisma migrations + idempotent PostGIS SQL), transaction handling for multi-step operations, connection management in the Fastify lifecycle.

| Score | Description |
|-------|-------------|
| 9-10  | Clean Prisma singleton with Neon adapter. Connection pooling configured correctly (DATABASE_URL for pooled, DIRECT_URL for migrations). PostGIS indexes maintained via idempotent SQL. Transactions used for multi-step operations (order creation + payment intent). Seed data covers realistic scenarios. |
| 7-8   | Well-structured with minor issues. Connection management works, occasional tight coupling or missing transaction boundaries. |
| 5-6   | Functional but messy. Multiple PrismaClient instances, no migration strategy for PostGIS indexes, raw SQL mixed with Prisma unnecessarily. |
| 3-4   | Disorganized. Connection leaks possible, no pooling, migrations fragile, data corruption possible on concurrent writes. |
| 1-2   | Persistence barely works. Connection exhaustion, no migrations, data lost on edge cases. |

### 3. API Design (Weight: 1.5x)

Are Fastify routes well-structured? Proper use of Zod type provider for request/response validation, consistent auth middleware application, rate limiting on sensitive endpoints, RESTful conventions, clean route organization.

| Score | Description |
|-------|-------------|
| 9-10  | Routes are well-organized by domain (auth, orders, companies). Every route has Zod schema validation. Auth middleware applied consistently — no unprotected sensitive routes. Rate limiting on OTP and payment endpoints. Consistent error response format. OpenAPI-compatible route definitions. |
| 7-8   | Good route structure with minor inconsistencies. Most routes validated, auth applied correctly. A few routes missing validation or using inconsistent error formats. |
| 5-6   | Routes work but lack discipline. Mixed validation approaches, some routes unprotected that shouldn't be, inconsistent response shapes. |
| 3-4   | Poor API design. No input validation on critical routes, auth middleware missing on sensitive endpoints, no rate limiting. |
| 1-2   | API is a security risk. Unvalidated input, no auth, no error handling. Would fail basic security review. |

### 4. Error Handling (Weight: 1x)

Does the API handle failures gracefully? Database errors, validation failures, external service failures (Stripe, Twilio, Redis), and edge cases all handled with appropriate HTTP status codes and user-facing messages.

| Score | Description |
|-------|-------------|
| 9-10  | Comprehensive. Fastify error handler catches all unhandled errors. Zod validation errors return 400 with field-level details. Database constraint violations mapped to user-friendly messages. External service failures (Stripe, Twilio) caught with retry logic or graceful degradation. BullMQ job failures logged and retried. |
| 7-8   | Good coverage. Most failure cases handled. Occasional missing error mapping for edge cases. |
| 5-6   | Basic error handling. Happy path works, but database constraint violations or Stripe webhook failures would return 500 with no useful message. |
| 3-4   | Minimal. Unhandled promise rejections, Prisma errors leak to client, no webhook signature verification. |
| 1-2   | No error handling. Failures crash the server or expose internal details. |

### 5. Data Integrity (Weight: 1x)

Is data consistent and trustworthy? Order state machine transitions enforced (not just UI-side), payment amounts consistent between order and Stripe, concurrent booking prevention, proper cascade deletes, no orphaned records.

| Score | Description |
|-------|-------------|
| 9-10  | Data is always consistent. Order state transitions validated server-side (invalid transitions rejected). Payment amounts calculated server-side (never trust client). Concurrent booking handled (optimistic locking or database constraint). Stripe webhook idempotency keys used. No orphaned order items or carpet details. |
| 7-8   | Solid integrity with minor gaps. State transitions mostly enforced, occasional edge case where invalid transition could slip through. |
| 5-6   | Basic consistency. Happy path is fine, but concurrent operations or interrupted payments could produce inconsistent state. |
| 3-4   | Integrity issues possible in normal use. Order stuck in invalid state, payment mismatch, orphaned records after failed operations. |
| 1-2   | Data routinely becomes inconsistent. Order lifecycle broken, payment amounts unreliable. |

## Scoring Formula

```
Weighted Score = ((Data Modeling * 1.5) + (Persistence Design * 1.5) + (API Design * 1.5) + Error Handling + Data Integrity) / 6.5
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail. Data Integrity scoring **4 or below** also triggers a fail — if users can't trust their orders and payments, nothing else matters.

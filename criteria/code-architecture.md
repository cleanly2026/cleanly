# Code Quality & Architecture Criteria — Cleanly Platform

> Evaluator type: AI agent (gsd-evaluator) | Scoring: 1-10 per dimension
> Weighting: All dimensions weighted equally (1x).

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific files, functions, or patterns as evidence. If you are unsure whether something meets a threshold, score it lower and explain why.

## Context

Cleanly is a Turborepo monorepo with 6 app workspaces (api, customer-web, company-web, admin-web, customer-mobile, washer-mobile) and shared packages (types, i18n, ui, db, config). TypeScript is used end-to-end. The architecture must be manageable by a solo developer with AI assistance.

## Dimensions

### 1. Structure & Organization (Weight: 1x)

Is the codebase logically organized? Clear separation between apps and packages, consistent file/folder structure within each workspace, shared code in the right packages, no circular dependencies.

| Score | Description |
|-------|-------------|
| 9-10  | Immediately navigable. Monorepo structure is clean — shared types in `packages/types`, shared UI in `packages/ui`, shared i18n in `packages/i18n`. Each app has consistent internal structure. New developer can find anything without a tour. No circular dependencies between packages. |
| 7-8   | Well-organized with minor inconsistencies. A few misplaced files, occasional code that should be in a shared package but isn't. |
| 5-6   | Adequate but requires some hunting. Mixed conventions between apps, some business logic in wrong layers, shared code duplicated instead of extracted. |
| 3-4   | Disorganized. Types duplicated across apps, no clear shared package boundaries, logic scattered across files. |
| 1-2   | Chaotic. Monorepo structure provides no benefit — everything is tangled, shared packages unused or broken. |

### 2. Maintainability (Weight: 1x)

Can the code be modified safely? Readable naming, reasonable function/component size, minimal coupling between apps, no hidden side effects, DRY without over-abstraction.

| Score | Description |
|-------|-------------|
| 9-10  | Highly maintainable. Clear naming, small focused functions, changes are localized. Modifying an API route doesn't require touching 5 files. Shared packages have clear APIs. |
| 7-8   | Good. Most code is readable and modifiable. A few long handlers or unclear names. |
| 5-6   | Functional but risky to change. Some tightly coupled modules, unclear side effects from shared package changes. |
| 3-4   | Fragile. Changes in packages/types break apps silently. Duplicated logic, misleading names. |
| 1-2   | Unmaintainable. God functions, global mutable state, impossible to change safely. |

### 3. Patterns & Consistency (Weight: 1x)

Are patterns applied consistently? Same problem solved the same way across all apps and packages. Consistent naming conventions, error handling approach, API call patterns, form handling, state management.

| Score | Description |
|-------|-------------|
| 9-10  | Perfectly consistent. One clear way to do each thing across all apps. Auth middleware pattern identical in every route. Zod schemas defined once in shared package and imported everywhere. Feels like one developer wrote it. |
| 7-8   | Mostly consistent. A few deviations that don't cause confusion. |
| 5-6   | Mixed. Two or three competing patterns for the same problem (e.g., some routes validate inline, others use shared schemas). Workable but noisy. |
| 3-4   | Inconsistent. Every app does things differently. No established conventions across the monorepo. |
| 1-2   | No patterns. Random approaches throughout. Copy-paste with local mutations. |

### 4. Type Safety & Correctness (Weight: 1x)

Proper use of TypeScript end-to-end. Shared types in `packages/types` actually used by all consumers. No `any` escape hatches. Zod schemas and TypeScript types stay in sync. Exhaustive switch handling on enums (OrderStatus, UserRole).

| Score | Description |
|-------|-------------|
| 9-10  | Full type coverage. Types in `packages/types` are the single source of truth. API routes type-check request/response bodies. OrderStatus switches are exhaustive. No `any` anywhere. Prisma-generated types flow through to API responses correctly. |
| 7-8   | Strong typing with occasional pragmatic shortcuts that don't hide bugs. |
| 5-6   | Types present but shallow. `packages/types` exists but apps define their own versions. Many `any` or overly broad types. |
| 3-4   | Minimal typing. Frequent `any`, type assertions everywhere, types are decorative not protective. |
| 1-2   | Effectively untyped. `any` throughout, or types are actively wrong/misleading. |

## Scoring Formula

```
Weighted Score = (Structure + Maintainability + Patterns + Type Safety) / 4
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail.

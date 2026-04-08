# Client-Side Data Layer Criteria

> Evaluator type: AI agent | Scoring: 1-10 per dimension
> Weighting: Data Modeling and Persistence Design are weighted **1.5x** relative to Error Handling and Data Integrity.

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific evidence (IndexedDB schema, storage utilities, data access patterns, error responses). If you are unsure whether something meets a threshold, score it lower and explain why.

## Context

This is a client-only application with no backend server. All data is persisted to IndexedDB (with localStorage fallback). These criteria evaluate the quality of the client-side data layer — how data is modeled, stored, accessed, protected, and recovered.

## Dimensions

### 1. Data Modeling (Weight: 1.5x)

Are TypeScript types and interfaces appropriate for the domain? Proper entity relationships, correct use of types, sensible defaults, and schema decisions that support the full feature set.

| Score | Description |
|-------|-------------|
| 9-10  | Clean, well-typed schema that maps naturally to the domain. Relationships between entities (boards, variants, palettes, typography) are correct and efficient. Types are reused consistently. Discriminated unions and exhaustive handling where appropriate. |
| 7-8   | Solid types with minor suboptimal choices that don't cause real issues. Relationships are correct. |
| 5-6   | Works but shows signs of not thinking through relationships. Some data duplication, overly broad types, or awkward structures. |
| 3-4   | Poor modeling. Missing relationships, wrong data types, types don't reflect the domain. `any` used in data layer. |
| 1-2   | Data model is fundamentally broken. Would require a rewrite to support basic features. |

### 2. Persistence Design (Weight: 1.5x)

Is the IndexedDB (or storage) layer well-designed? Clean abstraction over storage, proper use of transactions, efficient read/write patterns, and a clear separation between storage concerns and UI logic.

| Score | Description |
|-------|-------------|
| 9-10  | Clean storage abstraction. Proper IndexedDB usage with transactions, indexes for common queries, versioned schema migrations. Storage logic fully separated from components. Reads and writes are efficient and batched where appropriate. |
| 7-8   | Well-structured with minor issues. Storage works correctly, abstraction is clean, occasional tight coupling to components. |
| 5-6   | Functional but messy. Storage calls scattered through components, no migration strategy, inefficient read patterns (loading everything into memory). |
| 3-4   | Disorganized. Raw storage calls inline in components, no abstraction, data corruption possible on concurrent writes. |
| 1-2   | Storage barely works. Data lost on edge cases, no structured approach to persistence. |

### 3. Error Handling (Weight: 1x)

Does the data layer handle failures gracefully? IndexedDB can fail (quota exceeded, private browsing, corrupted data). Are these cases caught, reported to the user, and recovered from?

| Score | Description |
|-------|-------------|
| 9-10  | Comprehensive. Storage quota errors caught, corrupted data detected and recovered, fallback to localStorage where appropriate, user-facing error messages for data issues. Import validation rejects malformed JSON. |
| 7-8   | Good coverage. Most storage failure cases handled. Occasional missing validation on import/export. |
| 5-6   | Basic error handling. Happy path works, but quota errors or corrupted data would crash or silently fail. |
| 3-4   | Minimal. Unhandled promise rejections from IndexedDB, no validation on imported data, silent data loss possible. |
| 1-2   | No error handling. Storage failures crash the app or corrupt state silently. |

### 4. Data Integrity (Weight: 1x)

Is data consistent and trustworthy? Proper handling of concurrent operations, undo/redo consistency, export/import round-trip fidelity, and no orphaned or stale references.

| Score | Description |
|-------|-------------|
| 9-10  | Data is always consistent. Undo/redo never produces invalid state. Export/import round-trips perfectly. Deleting a board cleans up all variants. No orphaned references. Timestamps are accurate. |
| 7-8   | Solid integrity with minor gaps. Occasional stale references possible but don't cause visible issues. |
| 5-6   | Basic consistency. Happy path is fine, but edge cases (rapid creates/deletes, interrupted saves, large imports) could produce inconsistent state. |
| 3-4   | Integrity issues visible in normal use. Orphaned variants, stale thumbnails, undo producing broken state. |
| 1-2   | Data routinely becomes inconsistent. Features break because underlying data is unreliable. |

## Scoring Formula

```
Weighted Score = ((Data Modeling * 1.5) + (Persistence Design * 1.5) + Error Handling + Data Integrity) / 5
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail. Data Integrity scoring **4 or below** also triggers a fail — if users can't trust their data, nothing else matters.

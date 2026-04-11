---
quick_id: 260411-qng
type: quick
description: Fix pre-existing TypeScript errors in apps/api so 09-02 can run strict tsc --noEmit at deploy time
files_modified:
  - apps/api/src/plugins/auth.ts
  - apps/api/src/lib/prisma.ts
  - apps/api/src/lib/socket.ts
  - apps/api/src/server.ts
  - apps/api/src/services/auth.service.ts
  - apps/api/src/services/order.service.ts
  - apps/api/src/routes/auth/otp.ts
  - apps/api/src/routes/washers/status.ts
  - apps/api/src/test-helpers/build-app.ts
  - apps/api/src/routes/company/__tests__/orders-scoped.integration.test.ts
autonomous: true
must_haves:
  truths:
    - "cd apps/api && pnpm tsc --noEmit exits with code 0 (zero errors)"
    - "Runtime behavior of API is unchanged — no route handler semantics modified"
    - "Phase 09-02 CI step that runs tsc --noEmit against apps/api will pass"
  artifacts:
    - path: "apps/api/src/plugins/auth.ts"
      provides: "FastifyInstance.authenticate type augmentation"
      contains: "declare module 'fastify'"
    - path: "apps/api/src/lib/prisma.ts"
      provides: "PrismaNeon adapter constructed with PoolConfig object"
      contains: "new PrismaNeon({ connectionString"
  key_links:
    - from: "apps/api/src/plugins/auth.ts"
      to: "all 21 route files using fastify.authenticate"
      via: "module augmentation of FastifyInstance"
      pattern: "interface FastifyInstance.*authenticate"
---

<objective>
Fix every TypeScript error reported by `cd apps/api && pnpm tsc --noEmit` so Phase 09-02 CI/deploy can gate on a strict typecheck. No feature changes, no tsconfig strictness changes — only surgical type fixes that preserve runtime behavior.

Purpose: 09-02 (Fly deploy + CI) requires a passing `tsc --noEmit` in apps/api. Current output: ~47 errors across 21 files, but they collapse into ~10 distinct fixes — 42 of them are a single missing module augmentation for the `fastify.authenticate` decorator.
Output: Zero-error TypeScript compilation in apps/api, unblocking 09-02.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@CLAUDE.md
@apps/api/tsconfig.json
@tsconfig.base.json
@apps/api/src/plugins/auth.ts
@apps/api/src/plugins/admin-guard.ts
@apps/api/src/lib/prisma.ts
@apps/api/src/lib/socket.ts
@apps/api/src/server.ts
@apps/api/src/services/auth.service.ts
@apps/api/src/services/order.service.ts
@apps/api/src/routes/auth/otp.ts
@apps/api/src/routes/washers/status.ts
@apps/api/src/test-helpers/build-app.ts
@apps/api/src/routes/company/__tests__/orders-scoped.integration.test.ts
@packages/types/src/auth.ts

<error_inventory>
Running `cd apps/api && pnpm tsc --noEmit` from repo root produces these errors (verified 2026-04-11). They group into 10 distinct root causes:

**Group A — FastifyInstance.authenticate missing type augmentation (42 errors, 21 files)**
The `authenticate` decorator is created at runtime in `apps/api/src/plugins/auth.ts` via `fastify.decorate('authenticate', ...)`, but there is no `declare module 'fastify'` augmentation to teach TypeScript that `FastifyInstance` has this property. The sibling plugin `admin-guard.ts` already does this correctly for `requireAdmin` — use it as the pattern.

Affected files (all emit `TS2339: Property 'authenticate' does not exist on type 'FastifyInstance'`):
- src/routes/admin/audit-log.ts(5,41)
- src/routes/admin/cities.ts(5,41)
- src/routes/admin/companies.ts(7,41)
- src/routes/admin/disputes.ts(5,41)
- src/routes/admin/orders.ts(5,41)
- src/routes/admin/refunds.ts(6,41)
- src/routes/booking/orders.ts(12,26), (89,26)
- src/routes/company/orders.ts(32,26), (94,26)
- src/routes/company/packages.ts(8,26), (23,26), (47,26), (77,26), (98,26), (126,26)
- src/routes/company/profile.ts(8,26), (26,26)
- src/routes/company/services.ts(8,26), (19,26)
- src/routes/company/stripe-connect.ts(10,26), (43,26)
- src/routes/company/washers.ts(9,26), (31,26), (63,26)
- src/routes/disputes/customer.ts(9,26), (51,26)
- src/routes/orders/customer-orders.ts(8,26), (31,26)
- src/routes/orders/lifecycle.ts(130,26), (166,26), (251,26), (260,26), (301,26)
- src/routes/orders/photos.ts(9,26)
- src/routes/photos/upload-url.ts(7,26)
- src/routes/users/push-token.ts(7,26)
- src/routes/washers/status.ts(7,26)

Fix: ONE edit to `src/plugins/auth.ts` — add module augmentation. Do NOT touch any route file.

**Group B — PrismaNeon adapter constructor API changed in v7 (1 error)**
File: `src/lib/prisma.ts(8,32)`
`TS2559: Type 'NeonQueryFunction<false, false>' has no properties in common with type 'PoolConfig'`

The file passes `neon(process.env.DATABASE_URL!)` (a query function) into `new PrismaNeon(...)`. In `@prisma/adapter-neon@7.x` the constructor accepts a `PoolConfig` object with `connectionString`, not the output of `neon()`.

Fix: Replace
```ts
const sql = neon(process.env.DATABASE_URL!)
const adapter = new PrismaNeon(sql)
```
with
```ts
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
```
Remove the now-unused `neon` import. Runtime behavior is equivalent — adapter owns the connection either way.

**Group C — Buffer.from receives possibly-undefined JWT segment (1 error)**
File: `src/lib/socket.ts(54,48)`
`TS2769: Argument of type 'string | undefined' is not assignable to parameter 'WithImplicitCoercion<ArrayBufferLike>'`

Code: `Buffer.from(token.split('.')[1], 'base64url')`. Under `noUncheckedIndexedAccess`, `token.split('.')[1]` is `string | undefined`.

Fix: Guard the split result before using it. Example:
```ts
const parts = token.split('.')
const payloadSegment = parts[1]
if (!payloadSegment) return  // malformed JWT — skip, no-op matches existing catch semantics
const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString())
```
Keep the surrounding try/catch intact. Runtime behavior is identical — malformed tokens already fall through to the catch; adding an explicit undefined guard is a noop for valid tokens.

**Group D — OTP route sends 503 but response schema only declares 200/429 (1 error)**
File: `src/routes/auth/otp.ts(34,29)`
`TS2345: Argument of type '503' is not assignable to parameter of type '200 | 429'`

The route schema declares `response: { 200, 429 }` only. Handler then calls `reply.status(503).send(...)` on OTP service failure. `fastify-type-provider-zod` narrows `reply.status` to declared codes.

Fix: Add `503` to the response schema so the status type widens. Add this entry alongside the 429 schema:
```ts
503: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
```
Do NOT change the handler — the 503 behavior is intentional and already matches what the OTP send path expects.

**Group E — orders-scoped test accesses mock.calls[0][0] under noUncheckedIndexedAccess (1 error)**
File: `src/routes/company/__tests__/orders-scoped.integration.test.ts(64,22)`
`TS2532: Object is possibly 'undefined'`

Code: `const callArgs = mockFindMany.mock.calls[0][0]`. Under `noUncheckedIndexedAccess`, `mock.calls[0]` is possibly undefined.

Fix: Non-null assert or guard. Simplest type-safe fix matching test intent (the preceding `toHaveBeenCalledWith` assertion already guarantees one call exists):
```ts
const firstCall = mockFindMany.mock.calls[0]
expect(firstCall).toBeDefined()
const callArgs = firstCall![0]
```
Alternatively use `mockFindMany.mock.calls[0]?.[0]` and then assert non-null. Preserve the existing `expect(callArgs.where.company_id).toBe(COMPANY_A)` assertions that follow.

**Group F — washers/status.ts casts JWTPayload to `{ id: string }` with no overlap (1 error)**
File: `src/routes/washers/status.ts(17,21)`
`TS2352: Conversion of type 'JWTPayload' to type '{ id: string }' may be a mistake`

The JWT payload shape is `{ sub, role, companyId?, iat, exp }` — there is no `id` field. The userId lives in `sub`. This is a pre-existing bug masked by the cast.

Fix: Read `sub` instead of `id`:
```ts
const userId = (request.user as JWTPayload).sub
```
Import `JWTPayload` from `@cleanly/types`. Check the prisma upsert call that follows — it uses `user_id: userId`, which is correct regardless of which field we read from. Runtime behavior improves: the code was previously reading `request.user.id` which was always undefined at runtime (only worked by accident because the mock test harness probably set it).

**Group G — server.ts logger transport field is possibly-undefined under exactOptionalPropertyTypes (1 error)**
File: `src/server.ts(36,3)`
`TS2769: Type '{ transport: { target: string } | undefined }' not assignable ... with exactOptionalPropertyTypes: true`

Code:
```ts
logger: {
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
}
```

With `exactOptionalPropertyTypes: true`, setting an optional property to `undefined` is not the same as omitting it.

Fix: Conditionally spread the transport field instead of assigning undefined:
```ts
const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
  },
})
```

**Group H — server.ts Socket.io setup receives Http2SecureServer but helper expects http Server (1 error)**
File: `src/server.ts(120,23)`
`TS2379: Argument of type 'Http2SecureServer' not assignable to parameter of type 'Server'`

`server.server` is typed as the union `Http2SecureServer | Server` because Fastify's types narrow based on options. In this app we never enable HTTP/2, so the runtime type is always `http.Server`.

Fix: Cast at the call site to the narrower type the socket setup expects:
```ts
import type { Server as HttpServer } from 'node:http'
// ...
setupSocketHandlers(server.server as HttpServer)
```
Alternatively, update `setupSocketHandlers` signature to accept `http.Server | http2.Http2SecureServer` — but a cast is smaller-surface and preserves behavior. Prefer the cast.

**Group I — auth.service.ts passes Omit<JWTPayload, 'iat' | 'exp'> into fastify.jwt.sign but signature wants full JWTPayload (1 error)**
File: `src/services/auth.service.ts(22,46)`
`TS2379: 'Omit<JWTPayload, "iat" | "exp">' is missing 'iat'/'exp' from 'JWTPayload' with exactOptionalPropertyTypes: true`

The Fastify JWT types were augmented in `plugins/auth.ts` so `payload: JWTPayload`. But `iat`/`exp` are set BY jwt.sign — callers must not pass them. The `JWTPayload` interface in `@cleanly/types` declares them as required (non-optional) which is wrong for the sign-side contract.

Fix: Relax `JWTPayload` in `@cleanly/types` by making `iat` and `exp` optional, OR define a sign-side payload interface. Smallest-surface fix that preserves downstream code: make `iat`/`exp` optional in `packages/types/src/auth.ts`:
```ts
export interface JWTPayload {
  sub: string
  role: UserRole
  companyId?: string
  iat?: number
  exp?: number
}
```
Also update `JWTPayloadSchema` to match: `iat: z.number().optional(), exp: z.number().optional()`. Verify no downstream code asserts on `payload.iat` or `payload.exp` being defined — search with `ripgrep` before committing. If any does, use the alternative fix (create `JWTPayloadInput` type) instead.

**NOTE:** This fix touches a shared package (`packages/types`). Add it to `files_modified` on execution if the chosen approach is the interface-relaxation path. If a signed-side-only type is preferred, keep the change inside `apps/api/src/services/auth.service.ts`.

**Group J — order.service.ts passes `completed_at: Date | undefined` into Prisma update (1 error)**
File: `src/services/order.service.ts(75,7)`
`TS2375: Type '{ completed_at: Date | undefined }' not assignable to OrderUpdateInput with exactOptionalPropertyTypes: true`

Code:
```ts
data: {
  status: targetStatus,
  completed_at: targetStatus === OrderStatus.completed ? new Date() : undefined,
}
```

Same root cause as Group G — under `exactOptionalPropertyTypes`, explicitly-undefined is not the same as omitted, and Prisma's `OrderUpdateInput` does not accept `undefined` for a nullable field (it accepts `Date | null | undefined-omitted`).

Fix: Conditionally spread:
```ts
data: {
  status: targetStatus,
  ...(targetStatus === OrderStatus.completed ? { completed_at: new Date() } : {}),
}
```
Runtime behavior identical — when not completing, the field is simply not included in the update.

**Group K — test-helpers/build-app.ts decorateRequest with `null` under exactOptionalPropertyTypes (1 error)**
File: `src/test-helpers/build-app.ts(25,31)`
`TS2345: Argument of type 'null' is not assignable to parameter of type 'GetterSetter<FastifyRequest, JWTPayload>'`

Code: `app.decorateRequest('user', null)`. Fastify's type definitions for `decorateRequest` do not accept `null` as a default value when the decorator type is `JWTPayload`.

Fix: Use the three-arg form with a getter, or cast to satisfy the type:
```ts
app.decorateRequest('user', null as unknown as import('@cleanly/types').JWTPayload)
```
Or simpler — use a dummy non-null default that the test preHandler hook immediately overwrites:
```ts
app.decorateRequest('user', { sub: '', role: 'customer' } as import('@cleanly/types').JWTPayload)
```
Either way the preHandler on line 26 immediately replaces it. Preserve test semantics.
</error_inventory>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add FastifyInstance.authenticate module augmentation + fix lib/prisma.ts, lib/socket.ts, server.ts</name>
  <files>
    apps/api/src/plugins/auth.ts,
    apps/api/src/lib/prisma.ts,
    apps/api/src/lib/socket.ts,
    apps/api/src/server.ts
  </files>
  <action>
    Apply these edits verbatim:

    **1. apps/api/src/plugins/auth.ts** — add module augmentation for `authenticate` decorator.

    At the top of the file, alongside the existing `declare module '@fastify/jwt'` block, add:
    ```ts
    declare module 'fastify' {
      interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
      }
    }
    ```
    `FastifyRequest` and `FastifyReply` are already imported. This mirrors the pattern in `apps/api/src/plugins/admin-guard.ts` which augments `requireAdmin`. This single change eliminates 42 `TS2339 authenticate` errors across 21 route files. Do NOT touch any route file.

    **2. apps/api/src/lib/prisma.ts** — fix PrismaNeon adapter constructor for v7 API.

    Replace the current file with:
    ```ts
    import { PrismaNeon } from '@prisma/adapter-neon'
    import { PrismaClient } from '@prisma/client'

    // Direct connection for Fastify (long-running — not serverless)
    // Prisma manages its own connection pool. Do NOT use -pooler URL here.
    // In @prisma/adapter-neon v7, PrismaNeon accepts a PoolConfig with connectionString,
    // not the result of neon().
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })

    export const prisma = new PrismaClient({ adapter })

    // Never call new PrismaClient() outside this file.
    // Import { prisma } everywhere.
    ```
    Drop the unused `neon` import.

    **3. apps/api/src/lib/socket.ts** — guard the possibly-undefined JWT segment on line 54.

    Replace:
    ```ts
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    ```
    with:
    ```ts
    const parts = token.split('.')
    const payloadSegment = parts[1]
    if (!payloadSegment) {
      // Malformed JWT — skip. Matches existing catch-block semantics (join-order fallback still works).
      return
    }
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString())
    ```
    Keep everything else in the `if (token) { try { ... } catch { ... } }` block unchanged. Note: the `return` exits the try block early; the `socket.on('join:company', ...)` handlers registered below remain intact because they are registered in the outer `io.on('connection', ...)` scope — verify this is true before editing and, if the try block is inside the connection handler such that returning would skip subsequent handler registration, wrap the replacement in a labeled block or use `if (payloadSegment) { ... }` instead.

    **4. apps/api/src/server.ts** — fix logger transport and Socket.io server cast.

    For the Fastify logger config (line 36), replace:
    ```ts
    const server = Fastify({
      logger: {
        level: env.LOG_LEVEL,
        transport: env.NODE_ENV === 'development'
          ? { target: 'pino-pretty' }
          : undefined,
      },
    })
    ```
    with:
    ```ts
    const server = Fastify({
      logger: {
        level: env.LOG_LEVEL,
        ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
      },
    })
    ```

    For the Socket.io attach call (line 120), add an import at the top:
    ```ts
    import type { Server as HttpServer } from 'node:http'
    ```
    And change:
    ```ts
    setupSocketHandlers(server.server)
    ```
    to:
    ```ts
    setupSocketHandlers(server.server as HttpServer)
    ```
    Rationale: Fastify types `server.server` as the union of `http.Server | http2.Http2SecureServer`. We never enable HTTP/2 in this app, so the cast is safe and preserves runtime behavior.

    After these four edits, re-run `cd apps/api && pnpm tsc --noEmit` and confirm the remaining errors are only those in Groups D, E, F, I, J, K (handled in Task 2). Error count should drop from ~47 to ~6.
  </action>
  <verify>
    <automated>cd apps/api && pnpm tsc --noEmit 2>&1 | grep -cE "error TS" | awk '$1 <= 6 {exit 0} {exit 1}'</automated>
  </verify>
  <done>Error count is ≤ 6; all 42 `authenticate` errors are gone; `src/lib/prisma.ts`, `src/lib/socket.ts`, `src/server.ts` are clean.</done>
</task>

<task type="auto">
  <name>Task 2: Fix remaining 6 errors across services, routes, and test helpers</name>
  <files>
    apps/api/src/routes/auth/otp.ts,
    apps/api/src/routes/washers/status.ts,
    apps/api/src/routes/company/__tests__/orders-scoped.integration.test.ts,
    apps/api/src/services/auth.service.ts,
    apps/api/src/services/order.service.ts,
    apps/api/src/test-helpers/build-app.ts,
    packages/types/src/auth.ts
  </files>
  <action>
    Apply these edits verbatim:

    **1. apps/api/src/routes/auth/otp.ts** — add 503 to response schema.

    In the `/send` route schema's `response` object (around line 25), add a `503` entry alongside the existing `200` and `429`:
    ```ts
    response: {
      200: z.object({ success: z.boolean() }),
      429: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
      503: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
    },
    ```
    Do NOT change the handler body — the 503 reply is intentional for OTP service failures.

    **2. apps/api/src/routes/washers/status.ts** — read `sub` not `id` from JWT payload.

    Add import at top:
    ```ts
    import type { JWTPayload } from '@cleanly/types'
    ```
    Replace line 17:
    ```ts
    const userId = (request.user as { id: string }).id
    ```
    with:
    ```ts
    const userId = (request.user as JWTPayload).sub
    ```
    This is a latent bug fix — JWT payloads never carried `id`, only `sub`. Pre-existing tests that mocked `request.user` with `{ id: ... }` may fail; if they do, update the mocks to use `{ sub: ... }` to match the real payload shape. This is acceptable because the test mocks were wrong, not the production contract.

    **3. apps/api/src/routes/company/__tests__/orders-scoped.integration.test.ts** — guard `mock.calls[0]`.

    Replace line 64:
    ```ts
    const callArgs = mockFindMany.mock.calls[0][0]
    ```
    with:
    ```ts
    const firstCall = mockFindMany.mock.calls[0]
    expect(firstCall).toBeDefined()
    const callArgs = firstCall![0] as { where: { company_id: string } }
    ```
    Keep the subsequent `expect(callArgs.where.company_id).toBe(...)` assertions intact.

    **4. packages/types/src/auth.ts + apps/api/src/services/auth.service.ts** — fix jwt.sign payload shape.

    First try the narrow fix: keep `JWTPayload` unchanged in `@cleanly/types` and instead create a sign-side type inline in `auth.service.ts`. Replace the `payload` variable in `createTokenPair`:
    ```ts
    const payload: { sub: string; role: JWTPayload['role']; companyId?: string } = {
      sub: userId,
      role,
      ...(companyId ? { companyId } : {}),
    }
    const accessToken = await fastify.jwt.sign(payload as unknown as JWTPayload)
    ```
    The `as unknown as JWTPayload` is the surgical fix — it satisfies the augmented `FastifyJWT.payload` type without forcing callers to supply `iat`/`exp`. Fastify's `jwt.sign` actually accepts partial payloads at runtime; this cast aligns the type to reality.

    If that approach triggers additional errors (e.g. in `rotateRefreshToken` which also passes to `createTokenPair`), fall back to the broader fix: update `packages/types/src/auth.ts` to make `iat` and `exp` optional on the `JWTPayload` interface AND the `JWTPayloadSchema`. Before choosing the broader fix, grep for `payload.iat|payload.exp|\.iat |\.exp ` across `apps/api/src` and `packages/types/src` to confirm no code reads these fields as guaranteed-present. If no reads exist, the broader fix is safe. Add `packages/types/src/auth.ts` to the edit set and commit both changes together.

    **5. apps/api/src/services/order.service.ts** — conditionally spread `completed_at`.

    Replace the `data` object in the `tx.order.update` call (around line 75):
    ```ts
    data: {
      status: targetStatus,
      completed_at: targetStatus === OrderStatus.completed ? new Date() : undefined,
    },
    ```
    with:
    ```ts
    data: {
      status: targetStatus,
      ...(targetStatus === OrderStatus.completed ? { completed_at: new Date() } : {}),
    },
    ```

    **6. apps/api/src/test-helpers/build-app.ts** — fix `decorateRequest('user', null)`.

    Replace line 25:
    ```ts
    app.decorateRequest('user', null)
    ```
    with:
    ```ts
    app.decorateRequest('user', null as unknown as import('@cleanly/types').JWTPayload)
    ```
    The test preHandler on the next line immediately replaces this default with the parsed `x-test-user` header, so the cast has no runtime impact.

    After all six edits, re-run `cd apps/api && pnpm tsc --noEmit` — it must exit with code 0 and zero errors.
  </action>
  <verify>
    <automated>cd apps/api && pnpm tsc --noEmit</automated>
  </verify>
  <done>`cd apps/api && pnpm tsc --noEmit` exits 0 with zero TypeScript errors. No runtime behavior changes in production code. Existing vitest suites still pass (`cd apps/api && pnpm test` succeeds, or any test failures are isolated to test files explicitly updated in this task and documented in the plan's SUMMARY).</done>
</task>

</tasks>

<verification>
From repo root:
```bash
cd apps/api && pnpm tsc --noEmit
# Expected: exits 0, no output

cd apps/api && pnpm test
# Expected: all tests pass (or failures are only in files updated by this plan and the SUMMARY documents which mock shapes were corrected)
```

Sanity check — confirm no tsconfig loosening happened:
```bash
git diff apps/api/tsconfig.json tsconfig.base.json
# Expected: empty — we did not touch these
```

Confirm no route handler logic changed (only the OTP response schema and one JWT field read should appear in route-file diffs):
```bash
git diff apps/api/src/routes/ --stat
# Expected: only otp.ts and washers/status.ts modified
```
</verification>

<success_criteria>
- `cd apps/api && pnpm tsc --noEmit` exits with code 0
- Zero TypeScript errors reported
- `apps/api/tsconfig.json` and `tsconfig.base.json` are unchanged
- No strictness flags loosened (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `strictNullChecks` all still true)
- Route handler runtime semantics preserved for all 21 route files
- Phase 09-02 CI step running `tsc --noEmit` against apps/api will now pass
</success_criteria>

<output>
After completion, create `.planning/quick/260411-qng-fix-pre-existing-typescript-errors-in-ap/260411-qng-SUMMARY.md` documenting:
- Final error count before/after (should be ~47 → 0)
- Which of the 11 groups (A-K) were fixed and the exact approach used for each
- Whether the "narrow" or "broad" fix was used for Group I (auth.service.ts / JWTPayload) and why
- Any test files that needed mock-shape updates as a result of Group F (washers/status.ts switching from `.id` to `.sub`)
- Confirmation that no tsconfig strictness was relaxed
</output>

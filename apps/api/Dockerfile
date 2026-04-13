# syntax=docker/dockerfile:1.7

# ---- base ----
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ---- prune ----
# Uses `turbo prune` to produce a minimal workspace subset for the api filter.
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.9.1 prune @cleanly/api --docker

# ---- installer (only package.jsons + lockfile) ----
FROM base AS installer
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# ---- builder ----
FROM base AS builder
COPY --from=installer /app .
COPY --from=prune /app/out/full/ .
COPY --from=prune /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm exec prisma generate --schema=packages/db/schema.prisma
RUN pnpm turbo run build --filter=@cleanly/api

# ---- runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nodeapp
COPY --from=builder --chown=nodeapp:nodejs /app .
USER nodeapp
EXPOSE 8080
CMD ["node", "apps/api/dist/server.js"]

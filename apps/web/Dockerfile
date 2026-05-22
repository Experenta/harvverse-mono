# Production image for the Harvverse Next.js web app (includes in-process tRPC API).
# Build from repo root: docker build -t harvverse/web:local -f apps/web/Dockerfile .

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

# ---
FROM base AS pruner

COPY . .
RUN pnpm dlx turbo@2.8.12 prune web --docker

# ---
FROM base AS builder

# Install deps from pruned lockfile first (cached layer), then add source.
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_docker_build_placeholder
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# @t3-oss/env validates server vars when db/api modules load during `next build`.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV CORS_ORIGIN=http://localhost:3000
ENV CLERK_SECRET_KEY=sk_test_docker_build_placeholder

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run Next build directly — turbo strict env mode strips undeclared vars needed at build time.
RUN pnpm --filter web run build

# ---
FROM node:${NODE_VERSION}-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]

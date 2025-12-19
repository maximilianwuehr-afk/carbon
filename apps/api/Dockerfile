# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/core packages/core
COPY apps/api apps/api
COPY tsconfig.json ./

# Build
RUN pnpm --filter @carbon/core build
RUN pnpm --filter @carbon/api build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Copy built files
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/packages/core/package.json packages/core/
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/package.json apps/api/

# Copy workspace files for production dependencies
COPY pnpm-workspace.yaml package.json ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Create data directory
RUN mkdir -p /data/vault

ENV NODE_ENV=production
ENV PORT=3000
ENV VAULT_PATH=/data/vault
ENV DATABASE_PATH=/data/carbon.db

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]

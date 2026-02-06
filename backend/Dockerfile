# Production Dockerfile for NestJS E-Commerce Accounting System
FROM node:20-alpine AS builder

# Install dependencies for Prisma
RUN apk add --no-cache openssl

# Prisma `generate` requires DATABASE_URL to be present at build time.
# This is a non-secret placeholder and will be overridden by Cloud Run env vars at runtime.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Compile seed script to JS (after build, because nest build may clean dist/)
RUN npx tsc prisma/seed.ts --outDir dist/prisma --skipLibCheck --module commonjs --target es2019 --esModuleInterop

# Production stage
FROM node:20-alpine

# Install dependencies for Prisma
RUN apk add --no-cache openssl

# Same placeholder for the production stage (overridden at runtime).
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm install --omit=dev --no-audit --no-fund

# Generate Prisma Client
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start in production mode
# We construct the DATABASE_URL at runtime using the DB_PASSWORD env var (injected from Secret Manager)
# This avoids the issue where Cloud Run UI doesn't support variable substitution like ${DB_PASSWORD}
#
# Database bootstrapping can take time and may block the container from listening on $PORT.
# Gate heavyweight operations behind env flags so deployments can reliably start.
# - Set MIGRATE_ON_STARTUP=true (or 1) to apply Prisma migrations on startup (recommended at least once after deploy).
# - Set SEED_ON_STARTUP=true (or 1) for a one-off revision to populate baseline data.
CMD ["sh", "-c", "set -e; export DATABASE_URL=postgresql://erp_user:${DB_PASSWORD}@localhost/erp_db?host=/cloudsql/moztech-main-db:asia-east1:moztech-main-db; case \"${MIGRATE_ON_STARTUP:-}\" in true|TRUE|1) npx prisma migrate deploy ;; esac; case \"${SEED_ON_STARTUP:-}\" in true|TRUE|1) node dist/prisma/seed.js ;; esac; node dist/src/main.js"]

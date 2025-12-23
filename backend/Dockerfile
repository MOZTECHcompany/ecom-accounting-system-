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
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Compile seed script to JS
RUN npx tsc prisma/seed.ts --outDir dist/prisma --skipLibCheck --module commonjs --target es2019 --esModuleInterop

# Build the application
RUN npm run build

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
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start in production mode
# We construct the DATABASE_URL at runtime using the DB_PASSWORD env var (injected from Secret Manager)
# This avoids the issue where Cloud Run UI doesn't support variable substitution like ${DB_PASSWORD}
# Added 'node dist/prisma/seed.js' to ensure default data (accounts, roles, etc.) is populated on startup
# We use the compiled JS seed file because ts-node is not available in production dependencies
CMD ["sh", "-c", "export DATABASE_URL=postgresql://erp_user:${DB_PASSWORD}@localhost/erp_db?host=/cloudsql/moztech-main-db:asia-east1:moztech-main-db && npm run prisma:deploy && node dist/prisma/seed.js && node dist/src/main.js"]

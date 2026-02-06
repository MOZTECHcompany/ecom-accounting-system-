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

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/
COPY scripts ./scripts/

# Install only production dependencies
RUN npm install --omit=dev --no-audit --no-fund

# Generate Prisma Client
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start in production mode
# We use a dedicated startup script to safely handle DB password encoding and conditional migration/seed
CMD ["node", "scripts/start-prod.js"]

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
CMD ["sh", "-c", "npm run start:prod"]

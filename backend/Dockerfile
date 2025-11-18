# Production Dockerfile for NestJS E-Commerce Accounting System
FROM node:20-alpine

# Install dependencies for Prisma
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (production only)
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start in production mode with migration
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]

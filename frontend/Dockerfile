FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

ARG VITE_API_URL
ARG VITE_DEFAULT_ENTITY_ID=tw-entity-001
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_DEFAULT_ENTITY_ID=${VITE_DEFAULT_ENTITY_ID}

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs

EXPOSE 8080

CMD ["node", "server.mjs"]

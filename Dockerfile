# Sync API - production image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

# Build
FROM base AS builder
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
USER node
CMD ["node", "dist/server.js"]

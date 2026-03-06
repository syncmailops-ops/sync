# 1. Define the 'base' stage
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 2. Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
# We need devDeps here to ensure prisma is available for the next step
RUN npm install

# 3. Build Stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN echo "bust3"
# CRITICAL FIX: Generate Prisma types BEFORE running tsc (npm run build)
RUN npx prisma generate

RUN npm run build

# 4. Runner Stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Copy only what is needed for production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
# Copy the generated prisma client specifically
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER node
CMD ["node", "dist/server.js"]




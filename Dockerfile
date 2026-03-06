# ... (Base and Deps stages remain the same)

# Build Stage
FROM base AS builder
COPY package.json ./
RUN npm install
COPY . .

# ADD THIS LINE HERE (Before npm run build)
RUN npx prisma generate 

RUN npm run build

# Runner Stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 
# (Remove the 'npx prisma generate' from here)

USER node
CMD ["node", "dist/server.js"]

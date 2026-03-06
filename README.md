# Sync — India's Creator-Brand-Event Marketplace (Backend)

Production-ready Node.js backend for the Sync marketplace: creators, brands, and organisers; campaigns, applications, contracts, escrow, referrals, and AI-powered campaign recommendations.

## Tech stack

- **Runtime:** Node.js 20, TypeScript (strict)
- **Framework:** Fastify 4
- **ORM:** Prisma + PostgreSQL 16 + pgvector
- **Cache:** Redis (ioredis)
- **Auth:** JWT (RS256 access 15min, HS256 refresh 7d, refresh tokens in Redis)
- **Passwords:** bcrypt (12 rounds)
- **Storage:** AWS S3 (presigned URLs)
- **Payments:** Razorpay (orders, webhooks, Route payouts)
- **Email:** Resend
- **AI:** OpenAI text-embedding-3-small, pgvector cosine search
- **PDF:** pdf-lib (contracts)
- **Validation:** Zod on every route
- **Tests:** Vitest + Supertest

## Setup

### 1. Clone and install

```bash
cd sync
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Fill in all values in `.env`. Required:

- `DATABASE_URL` — PostgreSQL 16 connection string
- `REDIS_URL` — Redis connection string
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` — RS256 key pair (e.g. `openssl genrsa -out private.pem 2048` then `openssl rsa -in private.pem -pubout -out public.pem`)
- `JWT_REFRESH_SECRET` — min 32 characters
- `ENCRYPTION_KEY` — 32 bytes (64 hex chars) for AES-256-GCM (bank details)
- `ENCRYPTION_IV` — 12 bytes (24 hex chars)

Optional for full features: AWS_*, RAZORPAY_*, RESEND_*, OPENAI_API_KEY, FRONTEND_URL.

### 3. Database and pgvector

Using Docker (Postgres + Redis):

```bash
docker-compose up -d
```

Then:

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate
```

If your migration does not add pgvector columns (Prisma may skip `Unsupported("vector(1536)")`), run once:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS embedding vector(1536);
```

Or use a custom migration file that runs the above after the initial migration.

### 4. Run

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Server listens on `PORT` (default 4000).

## API overview

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- **Profile:** `GET/PUT /api/profile/me`, `POST /api/profile/me/avatar`, `POST /api/profile/me/kyc`, `GET /api/profile/:userId`
- **Campaigns:** `GET /api/campaigns`, `GET /api/campaigns/recommended`, `GET /api/campaigns/:id`, `POST /api/campaigns`, `PUT/DELETE /api/campaigns/:id`
- **Applications:** `POST /api/campaigns/:id/applications`, `GET /api/campaigns/:id/applications`, `GET /api/campaigns/:id/applications/mine`, `PUT /api/campaigns/:id/applications/:appId`, `GET /api/campaigns/applications/mine`
- **Contracts:** `POST /api/contracts`, `GET /api/contracts/:id`, `POST /api/contracts/:id/sign`, `GET /api/contracts/:id/pdf`
- **Deliverables:** `POST /api/contracts/:id/deliverables`, `GET /api/contracts/:id/deliverables`, `PUT /api/contracts/:id/deliverables/:dId`
- **Escrow:** `POST /api/escrow/create`, `POST /api/escrow/webhook`, `POST /api/escrow/:id/release`, `POST /api/escrow/:id/refund`
- **Referrals:** `GET /api/referrals/my-code`, `GET /api/referrals/stats`
- **Notifications:** `GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`
- **Analytics:** `GET /api/analytics/creator`, `GET /api/analytics/brand`, `GET /api/analytics/admin`
- **Admin:** `GET /api/admin/users`, `PUT /api/admin/users/:id/status`, `GET /api/admin/disputes`, `PUT /api/admin/disputes/:id`, `GET /api/admin/waitlist`
- **Waitlist:** `POST /api/waitlist` (public)

## Tests

```bash
# Ensure Postgres and Redis are running (e.g. docker-compose up -d)
npm run test
```

## Deploy

1. Set `NODE_ENV=production` and all production env vars.
2. Run migrations: `npm run db:migrate` (or your CI/CD step).
3. Build: `npm run build`.
4. Start: `node dist/server.js` or use a process manager (PM2, systemd).
5. Put the app behind a reverse proxy (nginx/Caddy) with TLS; set `FRONTEND_URL` and CORS as needed.
6. Configure Razorpay webhook URL to `https://your-api/api/escrow/webhook` and set `RAZORPAY_WEBHOOK_SECRET`.

## License

Proprietary.

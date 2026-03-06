# Sync – Deployment Guide

Use this guide to deploy the **frontend on Vercel** and the **backend** on a Node-friendly host (Railway, Render, Fly.io, etc.).

---

## 1. Frontend on Vercel

### 1.1 Copy Vercel config into your frontend repo

Copy `vercel.json` from this repo into your **frontend project root** (the folder that has your React/Vite/Next app).

- **If you use Vite/React (e.g. `npm run build` → `dist/`):**  
  Your existing setup is usually enough; Vercel will detect it. Optionally add:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- **If you use Next.js:**  
  You don’t need a custom `vercel.json` unless you want rewrites; Next works out of the box.

### 1.2 Environment variables (Vercel dashboard)

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` or `NEXT_PUBLIC_API_URL` | Backend API base URL (no trailing slash) | `https://your-api.railway.app` |

Use `VITE_API_URL` for Vite; use `NEXT_PUBLIC_API_URL` for Next.js so the client can read it.

### 1.3 Deploy

- Connect your frontend repo to Vercel (GitHub/GitLab/Bitbucket).
- Set the env var above to your **backend URL** (from step 2).
- Deploy. Your frontend will call `VITE_API_URL` / `NEXT_PUBLIC_API_URL` for all API requests.

---

## 2. Backend (API) – not on Vercel

The Sync API is a long-running Node server (Postgres + Redis). Deploy it on a platform that runs Docker or Node, for example:

- **Railway** (recommended, simple)
- **Render**
- **Fly.io**
- Any host that supports Docker

### 2.1 Database and Redis

Create:

1. **PostgreSQL 16**  
   - Railway / Render / Neon / Supabase / your own server.  
   - Enable **pgvector**: run `CREATE EXTENSION IF NOT EXISTS vector;` (and add vector columns if your migration doesn’t).

2. **Redis**  
   - Railway / Upstash / Redis Cloud.

Set:

- `DATABASE_URL` – Postgres connection string.
- `REDIS_URL` – Redis connection string.

### 2.2 Deploy backend with Docker (Railway / Render / Fly)

Use the included **Dockerfile** from the **backend repo** (this Sync API repo).

**Railway**

1. New project → **Deploy from GitHub** → select the **backend** repo.
2. Add **PostgreSQL** and **Redis** from Railway (or use external URLs).
3. **Settings → Build**: Builder = **Dockerfile**, leave root as repo root.
4. **Variables**: add all vars from `.env.example` (see below). Set `FRONTEND_URL` to your Vercel frontend URL (e.g. `https://your-app.vercel.app`).
5. Deploy. Railway will build the image and run `node dist/server.js`. Note the public URL (e.g. `https://sync-api.railway.app`).

**Render**

1. New **Web Service** → connect the **backend** repo.
2. **Environment**: Docker.
3. Add **PostgreSQL** and **Redis** (or use env vars for external URLs).
4. Add all env vars. Set `FRONTEND_URL` to your Vercel URL.
5. Deploy. Use the generated URL (e.g. `https://sync-api.onrender.com`) as your API URL.

**Fly.io**

```bash
cd /path/to/sync-backend
fly launch
# Add Postgres and Redis (fly postgres create, fly redis create) or set DATABASE_URL and REDIS_URL
fly secrets set DATABASE_URL=... REDIS_URL=... FRONTEND_URL=...  # and all others
fly deploy
```

### 2.3 Backend environment variables (production)

Set these where you run the backend (Railway/Render/Fly dashboard or CLI):

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | Default `4000` (host often sets this) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_PRIVATE_KEY` | Yes | RS256 private key (PEM) |
| `JWT_PUBLIC_KEY` | Yes | RS256 public key (PEM) |
| `JWT_REFRESH_SECRET` | Yes | Min 32 characters |
| `ENCRYPTION_KEY` | Yes | 32 bytes, hex (64 hex chars) |
| `ENCRYPTION_IV` | Yes | 12 bytes, hex (24 hex chars) |
| `FRONTEND_URL` | Yes | Your Vercel app URL (e.g. `https://your-app.vercel.app`) |
| `AWS_*`, `RAZORPAY_*`, `RESEND_*`, `OPENAI_API_KEY` | Optional | For S3, payments, email, AI |

**Important:** Set `FRONTEND_URL` exactly to your Vercel frontend URL so CORS and cookies work.

### 2.4 Health check

After deploy, confirm the API is up:

```bash
curl https://your-api-url/health
# → {"ok":true,"service":"sync-api"}
```

Use this URL as `VITE_API_URL` / `NEXT_PUBLIC_API_URL` in Vercel.

---

## 3. Connect frontend to backend

1. **Vercel (frontend):**  
   - `VITE_API_URL` or `NEXT_PUBLIC_API_URL` = `https://your-api.railway.app` (or your backend URL).  
   - No trailing slash.

2. **Backend:**  
   - `FRONTEND_URL` = `https://your-app.vercel.app` (your Vercel app URL).

3. In your frontend, call the API like:

   - `fetch(\`${import.meta.env.VITE_API_URL}/api/auth/register\`, ...)` (Vite), or  
   - `fetch(\`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register\`, ...)` (Next).

4. For login, use **credentials** so the refresh cookie is sent:

   - `fetch(url, { method: 'POST', credentials: 'include', body: JSON.stringify({ email, password }) })`.

---

## 4. Checklist

- [ ] Backend: Postgres + Redis created; `DATABASE_URL`, `REDIS_URL` set.
- [ ] Backend: All required env vars set; `FRONTEND_URL` = Vercel URL.
- [ ] Backend: Deployed (Docker); `/health` returns `{"ok":true,"service":"sync-api"}`.
- [ ] Frontend: In Vercel, set `VITE_API_URL` or `NEXT_PUBLIC_API_URL` = backend URL.
- [ ] Frontend: Deploy on Vercel; test login/register against the live API.

Your **deployment-ready files** in this repo are:

- **Backend:** `Dockerfile`, `.dockerignore` (use from the backend repo root).
- **Frontend:** Copy `vercel.json` into your frontend repo if you need SPA rewrites; set env in Vercel as above.

# Deploy Sync frontend (HTML) on Vercel

Your frontend is a single HTML file (`sync-marketplace (5).html`). Follow these steps to put it on Vercel.

---

## Step 1: Create a project folder

1. Create a new folder, e.g. **`sync-frontend`** (anywhere on your PC).
2. Copy your HTML file into this folder and **rename it to `index.html`**.
   - So you have: `sync-frontend/index.html`

---

## Step 2: Add `vercel.json`

In the **same folder** as `index.html`, create a file named **`vercel.json`** with this content:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This makes Vercel serve `index.html` for all routes (so direct links and refresh work).

Your folder should look like:

```
sync-frontend/
  index.html      ← your Sync landing page (renamed from sync-marketplace (5).html)
  vercel.json     ← the config above
```

---

## Step 3: Push to GitHub

1. Open **GitHub** and create a **new repository** (e.g. `sync-frontend`). Do **not** add a README.
2. On your PC, open a terminal in the **sync-frontend** folder and run:

```bash
cd sync-frontend
git init
git add index.html vercel.json
git commit -m "Sync landing page"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sync-frontend.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 4: Deploy on Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in (use **Continue with GitHub** if you use GitHub).
2. Click **“Add New…”** → **“Project”**.
3. **Import** your **sync-frontend** repository.
4. Vercel will detect it as a static site. Leave these as-is:
   - **Framework Preset:** Other
   - **Root Directory:** (leave empty)
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)
5. Click **Deploy**.
6. Wait for the build to finish. You’ll get a URL like **`https://sync-frontend-xxx.vercel.app`**.

Your Sync landing page is now live on that URL.

---

## Step 5 (optional): Connect your backend API

When your Sync **backend** is deployed (e.g. on Railway/Render), you’ll want the frontend to call it:

1. In **Vercel** → your project → **Settings** → **Environment Variables**.
2. Add a variable (for a future API integration):
   - **Name:** `VITE_API_URL` or `API_URL`
   - **Value:** your backend URL, e.g. `https://your-sync-api.railway.app`
   - **Environment:** Production (and Preview if you use it).

For your **current** single HTML file, the form does not call an API yet (it only shows “You’re on the list!”). When you add `fetch()` to call `POST /api/auth/register` or `/api/waitlist`, use this env var to build the API base URL, or hardcode the backend URL in the script for now.

---

## Step 6 (optional): Custom domain

1. In Vercel → your project → **Settings** → **Domains**.
2. Add your domain (e.g. `sync.market` or `www.sync.market`).
3. Follow Vercel’s instructions to add the DNS records at your registrar.

---

## Quick checklist

- [ ] Folder with `index.html` (your HTML file renamed) and `vercel.json`
- [ ] Repository created on GitHub and code pushed
- [ ] Vercel project created and repo imported
- [ ] Deploy finished and live URL works
- [ ] (Later) Backend URL set in env and wired in the form if needed

If any step fails, copy the error message from Vercel’s build log or the browser and you can fix it from there.

# SL Fit

Crypto futures calculator — fit your dollar risk into a stop loss and get exact leverage, quantity, and isolated margin.

## Local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output: `dist/`

## Deploy on Cloudflare Pages (Free)

1. Push this folder to a **GitHub** repository
2. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → Connect to Git
3. Select the repo
4. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Click **Save and Deploy**

No env vars needed. App is fully client-side.

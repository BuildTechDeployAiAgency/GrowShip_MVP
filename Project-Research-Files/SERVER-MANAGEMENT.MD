## Server Management: Run & Troubleshoot (macOS)

### Primary Commands

- **Start dev (Next.js on port 3000)**

```bash
npm run dev
```

- **Start dev on a different port (when you intentionally want a second instance)**

```bash
npx next dev -p 3001
```

- **Build and run in production mode (explicit port)**

```bash
npm run build
npx next start -p 3000
```

### Ports Overview

- **Frontend (Next.js)**: Port 3000 (pinned via `npm run dev`). If port 3000 is busy, the dev server will now fail rather than silently switching.
- **Backend (FastAPI / Uvicorn)**: Port 8880 by default (or `PORT` env var). Independent of the frontend port.

### Diagnose Port Conflicts (3000/3001)

- **See what is listening on a port**

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

- **Free port 3000 if stuck**

```bash
lsof -ti:3000 | xargs kill -9
```

- **If the process persists, kill Next/Node related processes**

```bash
pkill -f "next|node.*next" || true
```

### Common Error: EADDRINUSE (address already in use)

- **Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`
- **Fix**:
  1. Free the port: `lsof -ti:3000 | xargs kill -9`
  2. Re-run: `npm run dev`
  3. If you need a second instance: `npx next dev -p 3001`

### Verify Health

- **Open in browser**: `http://localhost:3000`
- **Quick curl check**:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```

Expect `200` (or `3xx/4xx` depending on route guards) when the server is up.

### Optional Helper Scripts (add to package.json)

```json
{
  "scripts": {
    "dev:3001": "next dev -p 3001",
    "dev:kill-3000": "lsof -ti:3000 | xargs kill -9 || true"
  }
}
```

### Environment & Cache Tips

- **App URL**: Ensure `NEXT_PUBLIC_APP_URL` is `http://localhost:3000` in `.env.local` during local development.
- **Clear Next.js build cache** (useful after dependency or config changes):

```bash
rm -rf .next
npm run dev
```

### Backend Notes (for reference)

- **Run locally**:

```bash
python Backend/run.py     # defaults to port 8880, or uses $PORT if set
```

- **CORS**: Backend allows `http://localhost:3000` by default.

### Quick Checklist

- **Start**: `npm run dev`
- **If busy**: free 3000, then retry
- **Second instance**: `npx next dev -p 3001`
- **Prod run**: `npx next start -p 3000`

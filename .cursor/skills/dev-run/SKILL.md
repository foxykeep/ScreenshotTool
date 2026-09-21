---
name: dev-run
description: How to run ScreenshotTool's Vite dev server locally on port 4521. Use when starting the app, verifying the local URL, or debugging a failed npm run dev.
---

# Run ScreenshotTool locally

## Prerequisites

- Node.js 20+ (nvm ok)
- Dependencies installed: `npm install` from the repo root

## Start

```bash
cd ~/DevPerso/ScreenshotTool
npm run dev
```

- Dev server binds to port **4521** (`strictPort: true` in `vite.config.ts`)
- Open http://127.0.0.1:4521/

## If the port is busy

Stop the other process on 4521, or temporarily change `server.port` in `vite.config.ts` (prefer keeping 4521).

## Other scripts

| Command           | Purpose                        |
| ----------------- | ------------------------------ |
| `npm run build`   | `tsc -b` + production bundle   |
| `npm run preview` | Serve production build on 4521 |
| `npm run lint`    | Oxlint                         |
| `npm run format`  | Prettier write                 |

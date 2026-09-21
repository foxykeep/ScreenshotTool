# ScreenshotTool

Local web app to load or capture a screenshot, annotate it (red rectangles, straight arrows, text), then export via download or clipboard.

## Stack

- Vite + React + TypeScript
- No backend, auth, or database for v1
- Lint: Oxlint (from the Vite template); format: Prettier

## Setup

```bash
cd ~/DevPerso/ScreenshotTool
npm install
npm run dev
```

Open [http://127.0.0.1:4521](http://127.0.0.1:4521).

## Scripts

| Script                 | What it does                             |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Vite dev server on port **4521**         |
| `npm run build`        | Typecheck + production build             |
| `npm run preview`      | Preview the production build (port 4521) |
| `npm run lint`         | Oxlint                                   |
| `npm run format`       | Prettier write                           |
| `npm run format:check` | Prettier check                           |

## Repo

- Path: `/Users/CZ15V5/DevPerso/ScreenshotTool`
- Local git only for now (no remote until you add one)
- Product intent: [PRODUCT.md](PRODUCT.md)
- Agent guidance: [AGENTS.md](AGENTS.md) → [.cursor/](.cursor/)

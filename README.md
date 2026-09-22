# ScreenshotTool

Local web app to load a screenshot, annotate it (red rectangles, straight arrows, text), then export via download or clipboard.

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

## Using the app

1. **Open…** or drop an image onto the window (**O**)
2. Choose **Rectangle** (**R**), **Arrow** (**A**), or **Text** (**T**) to annotate (red). **Select** (**S**) to move/resize; selected shapes show blue chrome. You can draw into the margin around the image
3. **Undo** / **Redo**, or Delete/Backspace to remove the selection
4. Export mode: **Download** or **Copy**, then run the export button (PNG expands for out-of-bounds marks; only the export fills those zones with white)

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
- Remote: [foxykeep/ScreenshotTool](https://github.com/foxykeep/ScreenshotTool)
- Product intent: [PRODUCT.md](PRODUCT.md)
- Agent guidance: [AGENTS.md](AGENTS.md) → [.cursor/](.cursor/)

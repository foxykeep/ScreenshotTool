# ScreenshotTool — Product

Local-only screenshot annotation app. Read this before inventing UI or tool behavior.

## Goal

Load a screenshot, annotate it, then export for sharing.

## V1 abilities

| Ability    | Behavior                                                                  |
| ---------- | ------------------------------------------------------------------------- |
| Load image | File open + drag-drop + paste (⌘/Ctrl+V)                                  |
| Rectangle  | Drag to create; red stroke; move + resize after                           |
| Arrow      | Straight line + arrowhead; red; move + resize (length/angle) after create |
| Text       | Place/edit fixed-size red text labels; move after create                  |
| Selection  | Selected shape outlined in **blue**; `Delete`/`Backspace` removes it      |
| Undo       | Undo last action (and ideally redo)                                       |
| Export     | **Download** PNG and **Copy** to clipboard (separate buttons)             |

## Out of scope for v1

Blur/redact, multiple colors, curved/elbow arrows, multi-page decks, accounts, native shell, resizable text, in-app screen capture.

## UX

- Tools: Select, Rectangle, Arrow, Text (plus Clear image)
- Shortcuts: **O** open, **S** select, **R** rectangle, **A** arrow, **T** text (ignored while editing text)
- Default draw color: **red**; selection chrome: **blue**
- Export: always-visible **Download** and **Copy** buttons; success messages (`Downloaded PNG.`, `Copied image to clipboard.`) share a floating label above the export buttons (no toolbar layout shift)
- File load lands on the canvas for annotation (Open, drop, or paste)
- Text: fixed size; click to place, Enter/blur/click-canvas to commit, Escape to cancel; double-click an existing label (Select tool) to edit; overlay editor stays readable when the image is shrink-to-fit
- Delete / Backspace removes the selected shape; ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z or Ctrl+Y redo
- **Viewport fit:** the app fills the browser window without page scroll; the image shrinks to fit the canvas area (contain, no crop) with a small margin so you can draw outside the image. The editor chrome behind that margin stays the normal surface color (not white). Smaller images stay at natural size, centered. **Zoom:** scroll wheel (or trackpad pinch) on the canvas, 0.65×–8× (1× = fit), anchored under the pointer. **Pan:** middle-click drag or hold **Space** and drag. **0** resets zoom/pan. Drawing/hit-testing use image coordinates (which may fall outside the bitmap); export expands to fit out-of-bounds annotations and fills those zones with white (export ignores zoom/pan)

## Stack direction

Vite + React + TypeScript on `localhost` (dev server port **4521**) and GitHub Pages. No backend for v1. Optional later: Tauri/Electron for dock icon or global hotkeys.

**Release 1.3** — canvas zoom (0.65×–8×) and pan (middle-click or Space+drag). Live: https://foxykeep.github.io/ScreenshotTool/

## Known platform limits (v1)

- **Clipboard copy**: `ClipboardItem` + `navigator.clipboard.write` for PNG — needs a secure context and a browser that supports image clipboard write (Safari/Firefox support varies).

## Build order (reference)

1. Repo + Vite scaffold + agent layout _(done)_
2. Canvas shell + load image _(done)_
3. Rectangle → Arrow → Text tools _(done)_
4. Undo / redo _(done)_
5. Export: Download + Copy buttons _(done)_

# ScreenshotTool — Product

Local-only screenshot annotation app. Read this before inventing UI or tool behavior.

## Goal

Load or capture a screenshot, annotate it, then export for sharing.

## V1 abilities

| Ability        | Behavior                                                                  |
| -------------- | ------------------------------------------------------------------------- |
| Load image     | File open + drag-drop                                                     |
| Capture screen | In-app pick window/display (`getDisplayMedia`)                            |
| Rectangle      | Drag to create; red stroke; move + resize after                           |
| Arrow          | Straight line + arrowhead; red; move + resize (length/angle) after create |
| Text           | Place/edit fixed-size red text labels; move after create                  |
| Selection      | Selected shape outlined in **blue**; `Delete`/`Backspace` removes it      |
| Undo           | Undo last action (and ideally redo)                                       |
| Export         | Switch: download PNG **or** copy image to clipboard                       |

## Out of scope for v1

Blur/redact, multiple colors, curved/elbow arrows, multi-page decks, accounts, native shell, resizable text.

## UX

- Tools: Select, Rectangle, Arrow, Text (plus Clear image / new capture)
- Default draw color: **red**; selection chrome: **blue**
- Export control: toggle or segmented control between Download and Copy
- Screen capture and file load both land on the **same canvas** for annotation
- Text: fixed size; click to place, Enter/blur/click-canvas to commit, Escape to cancel; double-click an existing label (Select tool) to edit; overlay editor stays readable when the image is shrink-to-fit
- Delete / Backspace removes the selected shape; ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z or Ctrl+Y redo
- **Viewport fit:** the app fills the browser window without page scroll; the image shrinks to fit the canvas area (contain, no crop). Smaller images stay at natural size, centered. Drawing/hit-testing use full image coordinates; export is always full-resolution PNG

## Stack direction

Vite + React + TypeScript on `localhost` (dev server port **4521**). No backend for v1. Optional later: Tauri/Electron for dock icon or global hotkeys.

## Known platform limits (v1)

- **Screen capture** (`getDisplayMedia`): requires a user gesture and a secure context (`http://127.0.0.1` / HTTPS). The browser picker chooses window/display; permission can be denied.
- **Clipboard copy**: `ClipboardItem` + `navigator.clipboard.write` for PNG — needs a secure context and a browser that supports image clipboard write (Safari/Firefox support varies).

## Build order (reference)

1. Repo + Vite scaffold + agent layout _(done)_
2. Canvas shell + load image _(done)_
3. Screen capture into the same canvas _(done)_
4. Rectangle → Arrow → Text tools _(done)_
5. Undo / redo _(done)_
6. Export switch (download ↔ clipboard) _(done)_

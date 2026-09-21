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

## Stack direction

Vite + React + TypeScript on `localhost`. No backend for v1. Optional later: Tauri/Electron for dock icon or global hotkeys.

## Build order (reference)

1. Repo + Vite scaffold + agent layout _(done at scaffold)_
2. Canvas shell + load image
3. Screen capture into the same canvas
4. Rectangle → Arrow → Text tools
5. Undo / redo
6. Export switch (download ↔ clipboard)

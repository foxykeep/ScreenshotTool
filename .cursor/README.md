# Cursor configuration

Project-specific AI guidance for ScreenshotTool.

**Cross-tool entry:** [AGENTS.md](../AGENTS.md)  
**Always-on workflow policy:** [rules/workflow-index.mdc](rules/workflow-index.mdc)

## Design (token-efficient)

| Layer                          | Location                   | Loads                           |
| ------------------------------ | -------------------------- | ------------------------------- |
| **Router rule**                | `rules/workflow-index.mdc` | Every session                   |
| **Product / code conventions** | `rules/*.mdc`              | On demand (description / globs) |
| **Procedures**                 | `skills/*/SKILL.md`        | On demand when task matches     |

Put multi-step procedures in **skills**, not rules. Rules state policy; skills state steps.

## Skills (`.cursor/skills/`)

| Skill                              | Use when                                 |
| ---------------------------------- | ---------------------------------------- |
| [dev-run](skills/dev-run/SKILL.md) | Start Vite locally; confirm port and URL |

## Rules (`.cursor/rules/`)

| Rule                                               | When                                     |
| -------------------------------------------------- | ---------------------------------------- |
| [workflow-index.mdc](rules/workflow-index.mdc)     | Always — autonomy defaults + skill table |
| [product-docs.mdc](rules/product-docs.mdc)         | Before UI / UX changes                   |
| [todo-comments.mdc](rules/todo-comments.mdc)       | Adding or editing `TODO` comments        |
| [tsdoc-public-api.mdc](rules/tsdoc-public-api.mdc) | Public canvas / export APIs              |
| [canvas-draw.mdc](rules/canvas-draw.mdc)           | Annotation model + draw loop             |

## Product docs

[PRODUCT.md](../PRODUCT.md)

## Index hygiene

[.cursorignore](../.cursorignore) excludes `node_modules/`, `dist/`, `coverage/`, `.git/` from the embedding index.

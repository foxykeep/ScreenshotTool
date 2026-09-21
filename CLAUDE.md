# CLAUDE.md — Claude Code entry point

Thin router to shared config in [`.cursor/`](.cursor/README.md). Do not duplicate rules here.

- **Agents (all tools):** [AGENTS.md](AGENTS.md)
- **Product:** [PRODUCT.md](PRODUCT.md)
- **Run locally:** [README.md](README.md)

## Skills

Live in [`.cursor/skills/`](.cursor/skills/). Invoke with `/<name>` or read `SKILL.md` when the task matches.

| Skill     | Use when                |
| --------- | ----------------------- |
| `dev-run` | Start Vite on port 4521 |

## Rules

Always-on router: [workflow-index.mdc](.cursor/rules/workflow-index.mdc).  
Other rules load on demand — see [.cursor/README.md](.cursor/README.md).

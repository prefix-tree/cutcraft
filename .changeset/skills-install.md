---
"@cutcraft/render": minor
"cutcraft": minor
---

`cutcraft skills install` writes the agent skill that ships with the installed CLI into `.claude/skills/cutcraft` (or `--dir`), so the skill always teaches the commands of the version you have. Run again after an upgrade, it replaces the folder it wrote; a folder with edits, or one it did not write, needs `--force`. The `@cutcraft/render` package now carries the skill in `dist/skill/cutcraft`, and exports `installSkill`.

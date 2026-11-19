---
"@uberscene/render": minor
"uberscene": minor
---

`uberscene skills install` writes the agent skill that ships with the installed CLI into `.claude/skills/uberscene` (or `--dir`), so the skill always teaches the commands of the version you have. Run again after an upgrade, it replaces the folder it wrote; a folder with edits, or one it did not write, needs `--force`. The `@uberscene/render` package now carries the skill in `dist/skill/uberscene`, and exports `installSkill`.

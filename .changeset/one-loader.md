---
"@cutcraft/render": minor
"cutcraft": minor
---

The export loads a cut file the way the editor does: it may import `react`, `zod` and `@cutcraft/kit`, plus what the
host offers (`loadVideo(file, { imports })`, `cutcraft --import`). A file that imports anything else now fails in the
export with the editor's message. `--tsconfig` and `LoadOptions.tsconfig` are gone.

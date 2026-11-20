---
"@uberscene/kit": minor
"@uberscene/render": minor
"uberscene": minor
---

`uberscene lint <file.tsx>... [--fix] [--json]` runs the kit's static checks from the command line: one line per finding with its file, line and column, exit code 1 when an error is left. The file is read, never run. `--fix` writes the fixes the findings carry.

A lint `Diagnostic` can now carry a `fix` (source edits), and `fixSource(text, options)` from `@uberscene/sdk` applies them round by round. A new rule, `deprecated-props`, reports props and values spelled the way an earlier version took them, from a `DEPRECATIONS` table (empty for now) and from `lint(text, { deprecations })`; where the new spelling is certain its fix renames the prop, respells the value or moves the prop into an object prop. The helpers it uses are exported for rules of your own: `renameProp`, `renameValue`, `movePropInto`, `movePropsInto`, `jsxTags`. The `free-code-clock` rule fixes `window.requestAnimationFrame` and the like to their bare names, and takes `willReadFrequently: true` out.

---
"@uberscene/kit": minor
---

The executor refuses an action that would leave the file with resolve errors it did not have, with the new error code `BREAKS_FILE` naming each one; nothing of it is kept. Errors the file already had do not count, a `batch/apply` is checked as a whole, and undo and redo are not checked.

Edits that broke the file before and now work:

- `font/use` and `composition/setProps` no longer leave a schema error on the composition for the values they hold until the fold (`$fonts`, `$defaults`).
- `multicam/create` and `multicam/restore` place a multicam by position on a free track, rather than writing a `start` it does not take.
- Removing a clip keeps a transition beside it only when the next element is a clip, not a gap.

`mask/create` refuses a locked track, a model-only element and a generated element, as the other handlers do.

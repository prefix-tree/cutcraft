---
"@uberscene/editor": minor
"@uberscene/player": minor
---

New package `@uberscene/editor`: editor parts that share one player and can sit anywhere in a page:
`<Editor.Root>`, `<Editor.Preview>`, `<Editor.Controls>`, `<Editor.Layers>` and `<Editor.Timeline>`, with
`useSelection()` and `useEdit()` for undoable edits through the sdk's `Executor`. The player splits `<Player>` into
`<PlayerProvider>` (the core) and `<PlayerView>` (the picture); `<Player>` is unchanged.

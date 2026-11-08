---
"@cutcraft/kit": minor
---

Ready-made components: `LowerThird`, `Callout`, `Badge`, `Counter`, `ProgressBar`, `Arrow`, `Highlight` and
`Background`, exported from `@cutcraft/kit`. Each is an ordinary function that returns the kit's own elements
(titles, shapes, SVG, a layer for the counter), so it is timed by words, styled by the theme and checked like any
element; its parts get ids from its own (`lt-name`). Editing a part in the editor writes that use out into the file as
plain elements, imports included. `COMPONENTS` lists them with their props schemas. They replace the most used
`<Graphic>` kinds, which stay deprecated.

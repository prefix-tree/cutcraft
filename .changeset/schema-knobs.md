---
"@uberscene/kit": minor
"@uberscene/render": minor
"uberscene": minor
---

A file's `schema` values are knobs an editor and an agent can read. `knob.color()`, `knob.font()` and `knob.image()` mark a string that wants a colour picker, a font menu or an image picker; `.describe("…")` is the label; `z.enum` is a choice and a number's `.min()`/`.max()` bound it. `knobsOf(schema, values)` returns each with its key, kind, description, value, options and bounds. `uberscene inspect` lists them before the timeline, and `--json` has them as `knobs`. The recipes mark their colours and logos.

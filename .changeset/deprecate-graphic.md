---
"@cutcraft/kit": minor
"@cutcraft/graphics": minor
---

`<Graphic>` and its kinds are deprecated and will be removed in a later release. The lint warns on each one with the
new `deprecated-graphic` rule, and `Graphic`, `GRAPHIC_KINDS` and `graphicControls` are marked `@deprecated`. Draw the
same things with `<Motion>`, `<Three>` or a `<Layer>`; the examples and the brand-spot recipe show how.

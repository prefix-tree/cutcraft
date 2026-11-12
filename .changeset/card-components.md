---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Three components for a talking head cut into a short, and a way for a graphic to end with another element:

- `TypeCard`: a card of big type that builds line by line. A line can sit on a pill, and a line can be struck out. Each line and strike takes `at="word:N"` (a word of the card's `anchor`) or an `offset` in seconds.
- `QuoteCard`: a passage on a paper card with its source above it, and a marker that sweeps across the phrases you name, each at its own word or offset.
- `Frame`: a rounded border around part of the picture, for the speaker under a card.
- `duration={{ until: "id" }}` on any element outside a sequence: it lasts from its own start until that element ends. One that starts after its target has ended reports `INVALID_TIME_RANGE`.
- Inside a `<Layer>`, the theme is now there as CSS variables (`var(--cc-accent)`, `var(--cc-heading)` and the rest). `Counter` read them already and was getting its fallbacks, so it now draws in the theme's heading font and text colour.

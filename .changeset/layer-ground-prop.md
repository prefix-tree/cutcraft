---
"@uberscene/kit": minor
"@uberscene/render": minor
---

`<Layer ground>` marks a layer as a ground that other things sit on (a wall behind a game, a scrim under a title), so the layout check, `uberscene where` and `look --zones` treat it like a background. `<Three>` and `<Motion>` take it too. `uberscene inspect` prints `ground` on its line. This replaces the `data-ground` attribute on an element inside the layer, which is no longer read: a file that used it moves the marker to the `<Layer>`.

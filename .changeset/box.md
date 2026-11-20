---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": patch
---

One coordinate system: every element that draws is placed by `box`, the rectangle it occupies, in pixels from the
frame's top left as in CSS. `x` and `y` place the point `origin` names (`topLeft` by default, or `center`, `top`,
`bottomRight` and the rest of the nine), `width` and `height` size it, and `fit` fills it as CSS `object-fit` does;
`transform` (scale, rotation, opacity, crop, rounded corners) applies after. With no box an element fills the frame as
before, so nothing written without a position moves. Clips, nested sequences, titles, shapes, SVG, stickers and
layers all take `box`, and keyframes move it with the paths `box.x` and `box.y`.

`transform.position`, which measured from the frame's centre, is removed. Captions lose `style.position` and their
flat `x`, `y` and `width`: they sit in their default box, the lower safe area, unless their `box` changes a field of
it, and `style` on captions is look only. Components take `box`, with `x` and `y`, for their centre from the frame's
top left in place of their flat `x` and `y`. An axis left out is centred on the composition's frame, whatever its
size, as before; `LowerThird` and `Callout` keep defaults set for a 1920 by 1080 frame. A
component called as a function takes its frame from `withFrame(size, fn)`. A new `box/update`
action places an element or the captions, the layout check's fixes name the `box` values to write, and
`uberscene inspect --at` prints each element's box.

To move a file, run `uberscene lint --fix video.tsx`. It turns `transform.position` into a box with
`origin: "center"` at the same point (each coordinate plus half the frame), keyframes of `transform.position.x` and
`.y` into `box.x` and `box.y`, the captions' `style.position`, `x`, `y` and `width` into the box that draws them where
they were, and components' `x` and `y` into `box`. It also gives a box to a `LowerThird` or `Callout` placed by its
default on a frame that is not 1920 by 1080, where that default was an offset from the centre. It needs the composition's width and
height written as numbers or as top-level constants. Two things it cannot move: a
`Callout`'s `to` written without the callout's `x` and `y` (now a point from the top left; add half the frame to it),
and placements built in code (a transform object in a constant, a spread). The theme's `note` title preset no
longer carries a position: a title that used it alone now sits centred, so give it a box.

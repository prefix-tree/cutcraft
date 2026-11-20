---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": patch
---

One name for one idea. A kind is always `type`: a shape's `shape`, a title's `animation.preset`, a lower third's
`variant`, the composition's `background.mode`, an svg's `color.mode` and the `halftone` effect's `mode` param are each
`type` now. A line's thickness is `thickness`: `stroke.width` on a shape, and in a title's and the captions' `style`, is
`stroke.thickness`, the `outline` effect's `width` param is `thickness`, and a diagram `Label`'s `lineWidth` is
`lineThickness`. The `shadow` effect's `radius` param is `blur`, the name a shadow's softness has everywhere else (the
blur effects keep `radius`, a Gaussian's standard deviation). The second something starts at is `start`: a `<Marker>`'s
`at`, the diagram parts' `at` (`DrawnLine`, `Label`, `CountUp`, `progress` and `useProgress`), and the `at` of the
hundred-cells and point-list blocks. The bar-race and quote-build blocks' `start`, seconds into their layer, is
`after`, as it is on every other block and diagram part.

Values are camelCase: the blend modes `colorDodge`, `colorBurn`, `hardLight`, `softLight` and `linearDodge`; the
easings `easeIn`, `easeOut` and `easeInOut` (and a crossfade's `curve`); the entrances and exits `slideLeft`,
`slideRight`, `slideUp`, `slideDown`, `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown`, `revealCenter`, `revealEdges`,
`flipHorizontal` and `flipVertical`; a title's animations `slideUp`, `slideDown`, `slideLeft`, `slideRight` and
`wordByWord`; the captions' `wordHighlight` and `wordByWord`; and the decoration `lineThrough`. Every frame draws as it
did. A file written the old way is refused with an error that names the new spelling (`` `shape` is now `type` ``,
`"ease-in-out" is now "easeInOut"`). Free code keeps working: `interpolate`, `ease`, `progress` and `useProgress` still
take an old easing name, and `progress` an old `at`, each with one warning that names the new spelling. `style.preset`
stays: it names a theme preset. The kit's `TEXT_ANIMATION_PRESETS` and `SVG_COLOR_MODES` are `TEXT_ANIMATION_TYPES`
and `SVG_COLOR_TYPES`. The editor's actions follow: `marker/add` and `marker/update` take `start`, and
`composition/setBackground` takes `type`.

To move a file, run `uberscene lint --fix video.tsx`. It renames each key and respells each value where the file
writes it on a tag, also inside object props (`animation={{ preset: "word-by-word" }}` becomes
`animation={{ type: "wordByWord" }}`), and the effect params only on an effect of that type: `params={{ radius: 3 }}`
on `<Effect type="shadow">` becomes `blur`, and so does a `<Keyframe param="radius">` inside it, while a blur effect's
`radius` is left alone. A lint rule can now depend on the element's literal `type` (a `Deprecation`'s `when`). The fix
cannot reach a value it cannot see on the tag: one in an array (a point-list block's `points`), a spread or a shared
constant (`<Shape {...RING} />`), a theme's own presets (a shape preset's `stroke.width`), or a call in free code
(`useProgress({ at: 2, easing: "ease-out" })`). Move those by hand; the resolver's errors and the free-code warnings
name what is left.

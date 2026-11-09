# Elements

Every element a file can use, with its props. Generated from the code by `scripts/gen-docs.ts`; do not edit.

## `<Composition>`

The video: frame rate, size, background and theme. It ends where its content ends.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string | `"composition"` |  |
| `fps` | number (−∞..240) |  | yes |
| `width` | integer (16..8192) |  | yes |
| `height` | integer (16..8192) |  | yes |
| `sampleRate` | integer (8000..192000) | `48000` |  |
| `channels` | integer (1..8) | `2` |  |
| `background` | { mode, color, gradient } |  |  |
| `theme` | { extends, palette, fonts, radius, motion, styles } |  |  |
| `motionBlur` | { shutterAngle, samples } |  |  |

Children: `track`, `marker`, `multicam`, `captions`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Track>`

A row of elements. A sequence track plays its children back to back; a free track (`layout="free"`) places each at its own start.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `layout` | "sequence" \| "free" | `"sequence"` |  |
| `name` | string |  |  |
| `role` | "general" \| "captions" \| "dialogue" \| "music" \| "effects" \| "ambience" | `"general"` |  |
| `locked` | boolean | `false` |  |
| `hidden` | boolean | `false` |  |
| `muted` | boolean | `false` |  |
| `solo` | boolean | `false` |  |
| `group` | string |  |  |

Children: `clip`, `audio`, `gap`, `transition`, `title`, `shape`, `svg`, `sticker`, `adjustment`, `nested`, `layer`, `multicam`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Clip>`

A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `src` | string |  | yes |
| `in` | number (0..∞) \| string |  |  |
| `out` | number (0..∞) \| string |  |  |
| `speed` | number (0.1..20) | `1` |  |
| `reverse` | boolean | `false` |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `volume` | number (0..4) |  |  |
| `fade` | { in, out } |  |  |
| `automation` | { volume, pan } |  |  |
| `duck` | { under, to, attack, release } |  |  |
| `frame` | { focus } |  |  |

Timed, visual, audible, trims its source, transformable. Children: `effect`, `keyframe`, `mask`, `speedKey`, `freeze`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Gap>`

Empty time between clips on a sequence track.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `duration` | number |  | yes |

Timed. No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Transition>`

A blend between the two clips it sits between on a sequence track.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "crossfade" \| "dipToBlack" \| "dipToWhite" \| "wipe" \| "slide" \| … 7 more \| string | `"crossfade"` |  |
| `duration` | number (0.001..30) | `0.5` |  |
| `params` | object | `{}` |  |
| `on` | string |  |  |
| `edge` | "in" \| "out" |  |  |

Every built-in type and its params: [Effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/).

Timed, visual. No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Marker>`

A named point on the timeline.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `at` | number (0..∞) |  | yes |
| `label` | string | `""` |  |
| `color` | string |  |  |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Layer>`

Free code in the frame: any React, CSS, canvas or WebGL, placed on the timeline like any overlay; `useT()` is its time.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Three>`

A three.js scene on the timeline: plain three.js in `setup`, or React Three Fiber children, on the video's clock.

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](https://cutcraft.prefixtree.xyz/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](https://cutcraft.prefixtree.xyz/guide/exporting)).

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `camera` | { position, lookAt, fov, near, far, zoom, orthographic } |  |  |
| `background` | string |  |  |
| `setup` | any |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Motion>`

Children animated by a Motion `sequence` on the video's clock.

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](https://cutcraft.prefixtree.xyz/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](https://cutcraft.prefixtree.xyz/guide/exporting)).

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `sequence` | [string, object] \| [string, object, object][] | `[]` |  |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Title>`

Text over the picture in the theme's type, with entrances by letter, word or line.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `style` | string |  |  |
| `font` | string | `"Inter"` |  |
| `size` | number (1..1000) | `48` |  |
| `weight` | integer (100..900) \| "normal" \| "bold" | `"bold"` |  |
| `italic` | boolean | `false` |  |
| `color` | string | `"#ffffff"` |  |
| `background` | string |  |  |
| `stroke` | { color, width } |  |  |
| `shadow` | { color, blur, x, y, spread, inset } |  |  |
| `align` | "left" \| "center" \| "right" \| "justify" | `"center"` |  |
| `valign` | "top" \| "middle" \| "bottom" | `"middle"` |  |
| `width` | number |  |  |
| `height` | number |  |  |
| `lineHeight` | number (0.1..10) | `1.2` |  |
| `letterSpacing` | number (-100..100) | `0` |  |
| `decoration` | "none" \| "underline" \| "line-through" \| "overline" |  |  |
| `animation` | { preset, in, out, stagger, unit, params } |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Captions>`

Subtitles from an asset's transcript that follow the clips through every trim.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `src` | string |  |  |
| `style` | string \| { font, size, weight, color, background, shadow, stroke, position, highlight, upcoming } |  |  |
| `animation` | "none" \| "word-highlight" \| "word-by-word" \| "karaoke" \| "typewriter" | `"none"` |  |
| `maxChars` | integer |  |  |
| `maxDuration` | number | `5` |  |
| `maxGap` | number (0..∞) | `0.8` |  |
| `breakAfter` | string[] |  |  |

Visual. Children: `caption`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Caption>`

One cue inside `<Captions>`, written by hand: its text, start and end.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) \| string |  | yes |
| `end` | number (0..∞) \| string |  | yes |
| `text` | string |  | yes |
| `words` | { text, start, end }[] |  |  |

Timed, visual. No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Shape>`

A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `style` | string |  |  |
| `shape` | "rectangle" \| "circle" \| "ellipse" \| "triangle" \| "arrow" \| … 4 more |  | yes |
| `width` | number |  |  |
| `height` | number |  |  |
| `points` | { x, y }[] |  |  |
| `fill` | string \| { type, color, gradient, opacity } |  |  |
| `stroke` | { color, width, opacity, dashArray, dashOffset, lineCap, lineJoin, gradient } |  |  |
| `shadow` | { color, blur, x, y, spread, inset } |  |  |
| `shadows` | { color, blur, x, y, spread, inset }[] |  |  |
| `cornerRadius` | number (0..∞) \| string |  |  |
| `cornerRadii` | { topLeft, topRight, bottomRight, bottomLeft } |  |  |
| `starPoints` | integer (3..∞) |  |  |
| `innerRadius` | number (0..1) |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Svg>`

One-off vector art from inline SVG markup or a file.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `style` | string |  |  |
| `src` | string |  |  |
| `content` | string |  |  |
| `viewBox` | { minX, minY, width, height } |  |  |
| `preserveAspectRatio` | string |  |  |
| `color` | { mode, tint, opacity } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Sticker>`

A ready-made icon or sticker by name.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `style` | string |  |  |
| `src` | string |  | yes |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Effect>`

A look on its parent: colour grading, blur, glow, outline, keying, corner pin, vignette, grain and more, or your own shader.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "brightness" \| "contrast" \| "saturation" \| "hue" \| "blur" \| … 28 more \| string |  | yes |
| `params` | object | `{}` |  |
| `enabled` | boolean | `true` |  |

Every built-in type and its params: [Effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/).

Children: `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Adjustment>`

Filters everything beneath it for its own stretch of time.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `opacity` | number (0..1) | `1` |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more | `"normal"` |  |
| `enabled` | boolean | `true` |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |

Timed, visual, trims its source. Children: `effect`, `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Mask>`

Shows only a shape of its clip, with a feathered edge or inverted.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "shape" \| "drawn" | `"shape"` |  |
| `shape` | { rect } \| { ellipse } \| { polygon } |  |  |
| `path` | { points, closed } |  |  |
| `feather` | number (0..100) | `0` |  |
| `inverted` | boolean | `false` |  |
| `expansion` | number (-100..100) | `0` |  |
| `opacity` | number (0..1) | `1` |  |
| `easing` | "linear" \| "ease-in" \| "ease-out" \| "ease-in-out" | `"linear"` |  |

Children: `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Keyframe>`

Animates one property of its parent between values, with easing.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `property` | string |  |  |
| `param` | string |  |  |
| `at` | number (0..∞) |  | yes |
| `value` | any |  | yes |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| … 46 more | `"linear"` |  |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<SpeedKey>`

Changes its clip's speed from a moment on, eased: speed ramps.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `at` | number (0..∞) |  | yes |
| `speed` | number (0.1..20) |  | yes |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| … 46 more | `"linear"` |  |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Freeze>`

Holds one frame of its clip for a while, then plays on.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `at` | number (0..∞) |  | yes |
| `start` | number (0..∞) |  | yes |
| `duration` | number |  | yes |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Nested>`

A sequence written once as a component and placed like a clip.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `of` | any \| string |  | yes |
| `in` | number (0..∞) \| string |  |  |
| `out` | number (0..∞) \| string |  |  |
| `volume` | number (0..4) | `1` |  |

Timed, visual, audible, trims its source, transformable. Children: `effect`, `keyframe`, `mask`, `speedKey`, `freeze`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Multicam>`

Several camera angles of one take; `<Cut>`s pick which one shows.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `name` | string |  |  |
| `sync` | number (0..∞) | `0` |  |
| `activeAngle` | string |  |  |

Children: `angle`, `cut`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Angle>`

One camera of a `<Multicam>`: its asset and sync offset.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `src` | string |  | yes |
| `offset` | number | `0` |  |
| `color` | string |  |  |
| `name` | string |  |  |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Cut>`

Switches a `<Multicam>` to an angle at a moment.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `at` | number (0..∞) |  | yes |
| `angle` | string |  | yes |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Audio>`

A stretch of a sound asset: volume, fades, ducking under another track, automation.

### Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `src` | string |  | yes |
| `in` | number (0..∞) \| string |  |  |
| `out` | number (0..∞) \| string |  |  |
| `speed` | number (0.1..20) | `1` |  |
| `reverse` | boolean | `false` |  |
| `volume` | number (0..4) |  |  |
| `fade` | { in, out } |  |  |
| `automation` | { volume, pan } |  |  |
| `duck` | { under, to, attack, release } |  |  |

Timed, audible, trims its source. Children: `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

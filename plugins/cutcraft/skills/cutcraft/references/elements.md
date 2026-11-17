# Elements

Every element a file can use, with its props. Generated from the code by `scripts/gen-docs.ts`; do not edit.

## `<Composition>`

The video: frame rate, size, background and theme. It ends where its content ends.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string | `"composition"` |  | The video's name. |
| `fps` | number (>0..240) |  | yes | Frames per second. |
| `width` | integer (16..8192) |  | yes | The frame's width in pixels. |
| `height` | integer (16..8192) |  | yes | The frame's height in pixels. |
| `sampleRate` | integer (8000..192000) | `48000` |  | The soundtrack's samples per second. |
| `channels` | integer (1..8) | `2` |  | The soundtrack's channels: 1 is mono, 2 stereo. |
| `background` | { mode, color, gradient } |  |  | What shows where nothing covers the frame: a colour, a gradient, or (`blur`) the picture itself, blurred to fill. |
| `theme` | { extends, palette, fonts, radius, motion, styles } |  |  | The video's look: palette, fonts, radius, motion style and element presets. Elements use it through `$tokens` and `style`. |
| `motionBlur` | { shutterAngle, samples } |  |  | A film camera's blur on everything that moves, in the export: each frame averages `samples` moments across the time its shutter is open, `shutterAngle` degrees of the frame (180 is half the frame, the film default). Drawn by the browser export, which a file with it uses on its own; the preview stays sharp. |

Children: `track`, `marker`, `multicam`, `captions`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Track>`

A row of elements. A sequence track plays its children back to back; a free track (`layout="free"`) places each at its own start.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The track's name in the file; ducking and actions refer to it by this. |
| `layout` | "sequence" \| "free" | `"sequence"` |  | `sequence` plays its children back to back; `free` places each at its own `start` or anchor. |
| `name` | string |  |  | A label for the editor's track header. |
| `role` | "general" \| "captions" \| "dialogue" \| "music" \| "effects" \| "ambience" | `"general"` |  | What the track holds; a `duck` with `under: "dialogue"` turns sound down under every track of that role. |
| `locked` | boolean | `false` |  | The editor will not change it. |
| `hidden` | boolean | `false` |  | Not drawn and not heard. |
| `muted` | boolean | `false` |  | Drawn but not heard. |
| `solo` | boolean | `false` |  | When any track is solo, only solo tracks are heard. |
| `group` | string |  |  | Tracks with the same group move together in the editor. |

Children: `clip`, `audio`, `gap`, `transition`, `title`, `shape`, `svg`, `sticker`, `adjustment`, `nested`, `layer`, `multicam`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Clip>`

A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `src` | string |  | yes | The media, as `asset:<id>` from the manifest. |
| `in` | number (0..∞) \| string |  |  | Where in the source it starts: seconds, or a word, shot or silence of its transcript (`word:12`). |
| `out` | number (0..∞) \| string |  |  | Where in the source it ends, as `in`; `word:40.end` ends after the word is said. |
| `speed` | number (0.1..20) | `1` |  | Playback rate: 2 plays twice as fast and half as long. |
| `reverse` | boolean | `false` |  | Plays the trimmed source backwards. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `volume` | number (0..4) |  |  | A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud. |
| `fade` | { in, out } |  |  | Seconds the sound fades in at the start and out at the end. |
| `automation` | { volume, pan } |  |  | Volume and pan over time, as `[seconds into the element, value]` points; pan runs from -1 (left) to 1 (right). |
| `duck` | { under, to, attack, release } |  |  | Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume it falls to, `attack` and `release` the seconds it takes to fall and recover. |
| `frame` | { focus } |  |  | Reframe to the composition's aspect: the resolver writes `transform.crop` from the source size and this focus, unless a crop is written. |

Timed, visual, audible, trims its source, transformable. Children: `effect`, `keyframe`, `mask`, `speedKey`, `freeze`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Gap>`

Empty time between clips on a sequence track.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The gap's name. |
| `duration` | number (> 0) |  | yes | Seconds of empty time before the next element on the track. |

Timed. No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Transition>`

A blend between the two clips it sits between on a sequence track.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The transition's name. |
| `type` | "crossfade" \| "dipToBlack" \| "dipToWhite" \| "wipe" \| "slide" \| … 7 more \| string | `"crossfade"` |  | A built-in transition, or one the file declares with `transition()`. |
| `duration` | number (0.001..30) | `0.5` |  | Seconds it takes; it overlaps the two clips by this much. |
| `params` | object | `{}` |  | The type's own settings; each type's page lists them. |
| `on` | string |  |  | Edge form: a transition at one edge of a single clip. Omit for a transition between two siblings. |
| `edge` | "in" \| "out" |  |  | With `on`: `in` at the clip's start, `out` at its end. |

Every built-in type and its params: [Effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/).

Timed, visual. No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Marker>`

A named point on the timeline.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The marker's name: `marker:<id>` refers to it as a time. |
| `at` | number (0..∞) |  | yes | Seconds from the start of the video. |
| `label` | string | `""` |  | Text shown on the editor's ruler. |
| `color` | string |  |  | Its colour on the ruler. |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Layer>`

Free code in the frame: any React, CSS, canvas or WebGL, placed on the timeline like any overlay; `useT()` is its time.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Moves, scales, turns and fades the whole layer, as on any element; the editor's handles write it. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How the layer mixes with what is under it, as CSS `mix-blend-mode` does. |
| `ground` | boolean |  |  | The layer is a ground that other things sit on: a wall behind a game, a scrim that darkens footage under a title. The layout check then treats it like a background: it is not held to the safe zone and is not said to cover the captions. |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Three>`

A three.js scene on the timeline: plain three.js in `setup`, or React Three Fiber children, on the video's clock.

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](https://cutcraft.prefixtree.xyz/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](https://cutcraft.prefixtree.xyz/guide/exporting)).

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Moves, scales, turns and fades the whole layer, as on any element; the editor's handles write it. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How the layer mixes with what is under it, as CSS `mix-blend-mode` does. |
| `ground` | boolean |  |  | The layer is a ground that other things sit on: a wall behind a game, a scrim that darkens footage under a title. The layout check then treats it like a background: it is not held to the safe zone and is not said to cover the captions. |
| `camera` | { position, lookAt, fov, near, far, zoom, orthographic } |  |  | The camera: `position` and `lookAt` as `[x, y, z]`, `fov` in degrees, clipping planes, zoom, or orthographic. |
| `background` | string |  |  | The scene's background colour; left out, transparent over what is beneath. |
| `setup` | any |  |  | Builds the scene once from `{ scene, camera, renderer, THREE, width, height }`, and may return `update(frame)` for every frame. |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Motion>`

Children animated by a Motion `sequence` on the video's clock.

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](https://cutcraft.prefixtree.xyz/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](https://cutcraft.prefixtree.xyz/guide/exporting)).

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Moves, scales, turns and fades the whole layer, as on any element; the editor's handles write it. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How the layer mixes with what is under it, as CSS `mix-blend-mode` does. |
| `ground` | boolean |  |  | The layer is a ground that other things sit on: a wall behind a game, a scrim that darkens footage under a title. The layout check then treats it like a background: it is not held to the safe zone and is not said to cover the captions. |
| `sequence` | [string, object] \| [string, object, object][] | `[]` |  | Motion steps: `[selector, keyframes, options]`, where `at` in the options is seconds into the layer. |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Title>`

Text over the picture in the theme's type, with entrances by letter, word or line.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `style` | string |  |  | A theme preset for titles; without one, the theme's `default` title preset applies. |
| `font` | string | `"Inter"` |  | The font family: a bundled one, one the file declares, or one from the font catalogue. A theme preset may set it instead. |
| `size` | number (1..1000) | `48` |  | The letters' size, in pixels. |
| `weight` | integer (100..900) \| "normal" \| "bold" | `"bold"` |  | How heavy the letters are: 100 to 900, or `normal` and `bold`. |
| `italic` | boolean | `false` |  | Slanted letters. |
| `color` | string | `"#ffffff"` |  | The letters' colour, or a theme token such as `$text`. |
| `background` | string |  |  | A colour filling the text box behind the letters. |
| `stroke` | { color, width } |  |  | An outline around the letters: its colour and width in pixels. |
| `shadow` | { color, blur, x, y, spread, inset } |  |  | A drop shadow under the letters: colour, blur and offset in pixels. |
| `align` | "left" \| "center" \| "right" \| "justify" | `"center"` |  | Which side of the text box the lines sit against. |
| `valign` | "top" \| "middle" \| "bottom" | `"middle"` |  | Where in the text box's height the text sits. |
| `width` | number (> 0) |  |  | The text box, in composition pixels; the whole frame when left out, so background, align and valign work inside it. |
| `height` | number (> 0) |  |  | The text box's height, in pixels, as `width`. |
| `lineHeight` | number (0.1..10) | `1.2` |  | The distance between lines, as a multiple of the letters' size. |
| `letterSpacing` | number (-100..100) | `0` |  | Extra space between letters, in pixels. |
| `decoration` | "none" \| "underline" \| "line-through" \| "overline" |  |  | A line under, over or through the letters. |
| `animation` | { preset, in, out, stagger, unit, params } |  |  | An entrance and exit by letter, word or line: a preset, its seconds in and out, and the delay between units. |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Captions>`

Subtitles from an asset's transcript that follow the clips through every trim.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The captions' name. |
| `src` | string |  |  | Generate children from the asset's transcript. Literal `<Caption>` children override this. |
| `style` | string \| { font, size, weight, color, background, shadow, stroke, position, highlight, highlightBox, upcoming } |  |  | Caption styling, or the name of a theme captions preset. |
| `animation` | "none" \| "word-highlight" \| "word-by-word" \| "karaoke" \| "typewriter" | `"none"` |  | How the words appear: all at once, the word being said highlighted, word by word, karaoke or typewriter. |
| `x` | number |  |  | Where the middle of the captions is, in pixels right of the frame's centre and below it, as on a card or a badge. `y` takes the place of `style.position`; `x` alone keeps the height that names. |
| `y` | number |  |  | Pixels below the frame's centre for the middle of the captions, as `x`. |
| `width` | number (> 0) |  |  | The widest a caption line may be, in pixels. Left out: the frame, less a margin at each side. |
| `align` | "left" \| "center" \| "right" \| "justify" |  |  | Which side of that width the lines sit against. Left out: `center`. |
| `maxChars` | integer (> 0) |  |  | The most characters on a generated cue's line. Left out: as many as fit at the caption size on this frame (at most 42). |
| `maxDuration` | number (> 0) | `5` |  | The longest a generated cue may stay on screen, in seconds. |
| `maxGap` | number (0..∞) | `0.8` |  | A pause longer than this, in seconds, starts a new cue. |
| `breakAfter` | string[] |  |  | Words a generated cue always ends after, as `word:N` refs on `src`: `breakAfter={["word:5", "word:12"]}`. |

Visual. Children: `caption`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Caption>`

One cue inside `<Captions>`, written by hand: its text, start and end.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The cue's name. |
| `start` | number (0..∞) \| string |  | yes | When it appears: seconds, or a word of the captions' source (`word:12`). |
| `end` | number (0..∞) \| string |  | yes | When it goes, as `start`. |
| `text` | string |  | yes | What it says. |
| `words` | { text, start, end }[] |  |  | Each word and its time in the video, in seconds, which the word animations highlight; left out, the cue shows as plain text. |

Timed, visual. No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Shape>`

A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `style` | string |  |  | A theme preset for shapes. |
| `shape` | "rectangle" \| "circle" \| "ellipse" \| "triangle" \| "arrow" \| … 4 more |  | yes | Which shape it draws. |
| `width` | number (> 0) |  |  | The shape's box, in pixels; left out, 200. |
| `height` | number (> 0) |  |  | The shape's box height, in pixels; left out, 200. |
| `points` | { x, y }[] |  |  | A polygon's or path's corners, as fractions of the box from its top left. |
| `fill` | string \| { type, color, gradient, opacity } |  |  | A colour, or `{ type, color, gradient, opacity }` for a gradient or no fill. |
| `stroke` | { color, width, opacity, dashArray, dashOffset, lineCap, lineJoin, gradient } |  |  | The outline: colour, width in pixels, opacity, dashes, caps and joins. |
| `shadow` | { color, blur, x, y, spread, inset } |  |  | A drop shadow: colour, blur and offset in pixels. |
| `shadows` | { color, blur, x, y, spread, inset }[] |  |  | Several shadows, drawn in order, for layered or inner shadows. |
| `cornerRadius` | number (0..∞) \| string |  |  | A rectangle's rounded corners, in pixels or a theme token such as `$radius`. |
| `cornerRadii` | { topLeft, topRight, bottomRight, bottomLeft } |  |  | A rectangle's corners rounded one by one, in pixels. |
| `starPoints` | integer (3..∞) |  |  | How many points a star has; left out, 5. |
| `innerRadius` | number (0..1) |  |  | A star's inner corners, as a fraction of its outer radius; left out, 0.5. |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Svg>`

One-off vector art from inline SVG markup or a file.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `style` | string |  |  | A theme preset for svg elements. |
| `src` | string |  |  | An SVG file from the manifest, as `asset:<id>`. Give this or `content`. |
| `content` | string |  |  | Inline SVG markup. Give this or `src`. |
| `viewBox` | { minX, minY, width, height } |  |  | The part of the drawing to show, in its own units, as the SVG `viewBox` attribute. |
| `preserveAspectRatio` | string |  |  | How the drawing fits its box, as the SVG attribute of that name (`xMidYMid meet`). |
| `color` | { mode, tint, opacity } |  |  | Recolours it: `tint` keeps the shading and colours it, `replace` paints every drawn pixel; `opacity` is how much. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Sticker>`

A ready-made icon or sticker by name.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `style` | string |  |  | A theme preset for stickers. |
| `src` | string |  | yes | An image the manifest lists (`asset:party`): PNG, SVG, WebP or GIF. |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Effect>`

A look on its parent: colour grading, blur, glow, outline, keying, corner pin, vignette, grain and more, or your own shader.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The effect's name. |
| `type` | "brightness" \| "contrast" \| "saturation" \| "hue" \| "blur" \| … 28 more \| string |  | yes | A built-in effect, or one the file declares with `effect()`. |
| `params` | object | `{}` |  | The type's own settings; each effect's page lists them. |
| `enabled` | boolean | `true` |  | Off, it draws nothing and stays in the file. |

Every built-in type and its params: [Effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/).

Children: `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Adjustment>`

Filters everything beneath it for its own stretch of time.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `opacity` | number (0..1) | `1` |  | How much of its effects to mix over the picture beneath. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more | `"normal"` |  | How the filtered picture mixes with the one beneath, as CSS `mix-blend-mode` does. |
| `enabled` | boolean | `true` |  | Off, it filters nothing and stays in the file. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Limits it to a region: position, scale, rotation and crop of the area it filters. |

Timed, visual, trims its source. Children: `effect`, `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Mask>`

Shows only a shape of its clip, with a feathered edge or inverted.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The mask's name. |
| `type` | "shape" \| "drawn" | `"shape"` |  | `shape` for a rectangle, ellipse or polygon; `drawn` for a bezier `path`. |
| `shape` | { rect } \| { ellipse } \| { polygon } |  |  | The region it shows: `{ rect }`, `{ ellipse }` or `{ polygon }`, in the clip's pixels. |
| `path` | { points, closed } |  |  | A drawn mask's outline: bezier points with handles, closed or open. |
| `feather` | number (0..100) | `0` |  | Softens the mask's edge, in pixels. |
| `inverted` | boolean | `false` |  | Shows everything outside the region instead of inside. |
| `expansion` | number (-100..100) | `0` |  | Grows the region outwards, or shrinks it when negative, in pixels. |
| `opacity` | number (0..1) | `1` |  | How much the mask hides: 1 hides fully outside the region, 0 not at all. |
| `easing` | "linear" \| "ease-in" \| "ease-out" \| "ease-in-out" | `"linear"` |  | How the mask moves between its keyframes. |

Children: `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Keyframe>`

Animates one property of its parent between values, with easing.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The keyframe's name. |
| `property` | string |  |  | A property of the parent element (`transform.opacity`…). |
| `param` | string |  |  | Inside an `<Effect>`: the effect param it animates. |
| `at` | number (0..∞) |  | yes | Element-relative seconds. |
| `value` | any |  | yes | The value the property or param has at `at`. |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| … 46 more | `"linear"` |  | How it moves from the keyframe before to this one. |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<SpeedKey>`

Changes its clip's speed from a moment on, eased: speed ramps.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The key's name. |
| `at` | number (0..∞) |  | yes | Seconds into the clip where the new speed is reached. |
| `speed` | number (0.1..20) |  | yes | The playback rate from here on: 2 is twice as fast. |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| … 46 more | `"linear"` |  | How the speed changes from the key before to this one. |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Freeze>`

Holds one frame of its clip for a while, then plays on.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The freeze's name. |
| `at` | number (0..∞) |  | yes | Source time of the frozen frame. |
| `start` | number (0..∞) |  | yes | Element-relative start of the hold. |
| `duration` | number (> 0) |  | yes | Seconds the frame is held before the clip plays on. |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Nested>`

A sequence written once as a component and placed like a clip.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `of` | any \| string |  | yes | A pure helper component returning tracks, or a file reference. Validated at collect time. |
| `in` | number (0..∞) \| string |  |  | Where in the nested sequence it starts, in its own seconds. |
| `out` | number (0..∞) \| string |  |  | Where in the nested sequence it ends, as `in`. |
| `volume` | number (0..4) | `1` |  | A gain on all its sound: 1 as it is, 0 muted. |

Timed, visual, audible, trims its source, transformable. Children: `effect`, `keyframe`, `mask`, `speedKey`, `freeze`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Multicam>`

Several camera angles of one take; `<Cut>`s pick which one shows.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The group's name. |
| `name` | string |  |  | A label for the editor. |
| `sync` | number (0..∞) | `0` |  | Timeline time at which every angle is aligned (plus each angle's own offset). |

Children: `angle`, `cut`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Angle>`

One camera of a `<Multicam>`: its asset and sync offset.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The angle's name: `<Cut angle>` picks it by this. |
| `src` | string |  | yes | The camera's footage, as `asset:<id>`. |
| `offset` | number | `0` |  | Source-time offset that aligns this angle with the sync point. |
| `color` | string |  |  | Its colour in the editor. |
| `name` | string |  |  | A label for the editor. |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Cut>`

Switches a `<Multicam>` to an angle at a moment.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The cut's name. |
| `at` | number (0..∞) |  | yes | Seconds into the multicam where it switches. |
| `angle` | string |  | yes | The angle it switches to. |

No children. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

## `<Audio>`

A stretch of a sound asset: volume, fades, ducking under another track, automation.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `src` | string |  | yes | The media, as `asset:<id>` from the manifest. |
| `in` | number (0..∞) \| string |  |  | Where in the source it starts: seconds, or a word, shot or silence of its transcript (`word:12`). |
| `out` | number (0..∞) \| string |  |  | Where in the source it ends, as `in`; `word:40.end` ends after the word is said. |
| `speed` | number (0.1..20) | `1` |  | Playback rate: 2 plays twice as fast and half as long. |
| `reverse` | boolean | `false` |  | Plays the trimmed source backwards. |
| `volume` | number (0..4) |  |  | A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud. |
| `fade` | { in, out } |  |  | Seconds the sound fades in at the start and out at the end. |
| `automation` | { volume, pan } |  |  | Volume and pan over time, as `[seconds into the element, value]` points; pan runs from -1 (left) to 1 (right). |
| `duck` | { under, to, attack, release } |  |  | Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume it falls to, `attack` and `release` the seconds it takes to fall and recover. |

Timed, audible, trims its source. Children: `keyframe`. [All elements](https://cutcraft.prefixtree.xyz/reference/elements/)

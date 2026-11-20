---
editLink: false
---

# `<Svg>`

One-off vector art from inline SVG markup or a file.

<Example src="previews/elements/svg" alt="<Svg>">

<<< @/../examples/showcase/docs/svg.tsx

</Example>

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle it occupies, in pixels from the frame's top left as in CSS: `x` and `y` place the point `origin` names (its top left by default), `width` and `height` size it, and its content fills it as `fit` says. Left out, the whole frame. `transform` applies after. |
| `transform` | { scale, rotation, anchor, opacity, borderRadius, crop } |  |  | How it is turned and shown: scale, rotation, anchor, opacity, rounded corners and crop. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](/reference/rendering)). |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `style` | string |  |  | A theme preset for svg elements. |
| `src` | string |  |  | An SVG file from the manifest, as `asset:<id>`. Give this or `content`. |
| `content` | string |  |  | Inline SVG markup. Give this or `src`. |
| `viewBox` | { minX, minY, width, height } |  |  | The part of the drawing to show, in its own units, as the SVG `viewBox` attribute. |
| `preserveAspectRatio` | string |  |  | How the drawing fits its box, as the SVG attribute of that name (`xMidYMid meet`). |
| `color` | { mode, tint, opacity } |  |  | Recolours it: `tint` keeps the shading and colours it, `replace` paints every drawn pixel; `opacity` is how much. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](/reference/elements/)

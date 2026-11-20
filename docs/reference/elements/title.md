---
editLink: false
---

# `<Title>`

Text over the picture in the theme's type, with entrances by letter or by word.

<Example src="previews/elements/title" alt="<Title>">

<<< @/../examples/showcase/docs/title.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [An edit](/examples/edit) · [Captions and key points](/examples/captions) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

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
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
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
| `shadow` | { color, blur, x, y } |  |  | A drop shadow under the letters: colour, blur and offset in pixels. |
| `align` | "left" \| "center" \| "right" \| "justify" | `"center"` |  | Which side of the text box the lines sit against. |
| `valign` | "top" \| "middle" \| "bottom" | `"middle"` |  | Where in the text box's height the text sits. |
| `width` | number (> 0) |  |  | The text box, in composition pixels; the whole frame when left out, so background, align and valign work inside it. |
| `height` | number (> 0) |  |  | The text box's height, in pixels, as `width`. |
| `lineHeight` | number (0.1..10) | `1.2` |  | The distance between lines, as a multiple of the letters' size. |
| `letterSpacing` | number (-100..100) | `0` |  | Extra space between letters, in pixels. |
| `decoration` | "none" \| "underline" \| "line-through" \| "overline" |  |  | A line under, over or through the letters. |
| `animation` | { preset, in, out, stagger } |  |  | An entrance and exit: a preset, its seconds in and out, and for word-by-word the delay between words. |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](/reference/elements/)

# `<Clip>`

A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform.

<Example src="previews/elements/clip" alt="<Clip>">

<<< @/../examples/showcase/docs/clip.tsx

</Example>

**Used in:** [Product launch](/examples#a-product-launch) · [Kinetic type](/examples#kinetic-type) · [Data story](/examples#a-data-story) · [An edit](/examples#an-edit) · [Captions and key points](/examples#captions-and-key-points) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

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
| `pitchCorrection` | boolean | `false` |  |
| `audioTrack` | integer | `0` |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `emphasis` | "none" \| "pulse" \| "shake" \| "bounce" \| "float" \| … 21 more \| { type, speed, intensity, loop, focusPoint, zoomScale, holdDuration, startTime, animationDuration } |  |  |
| `volume` | number (0..4) |  |  |
| `fade` | { in, out } |  |  |
| `automation` | { volume, pan } |  |  |
| `duck` | { under, to, attack, release } |  |  |
| `frame` | { focus } |  |  |
| `smoothSlowMo` | boolean | `false` |  |
| `interpolation` | "low" \| "medium" \| "high" |  |  |
| `stabilize` | { enabled, strength, crop } |  |  |
| `chromaKey` | { enabled, color, tolerance, edgeSoftness, spillSuppression } |  |  |
| `behindSubject` | boolean | `false` |  |

Timed, visual, audible, trims its source, transformable. Children: `effect`, `audioEffect`, `colorGrade`, `keyframe`, `mask`, `speedKey`, `freeze`. [All elements](/reference/elements/)

---
editLink: false
---

# `<Composition>`

The video: frame rate, size, background and theme. It ends where its content ends.

<Example src="previews/elements/composition" alt="<Composition>">

<<< @/../examples/showcase/docs/composition.tsx

</Example>

**Used in:** [Product launch](/examples#a-product-launch) · [Kinetic type](/examples#kinetic-type) · [Data story](/examples#a-data-story) · [Logo reveal](/examples#a-logo-reveal) · [An edit](/examples#an-edit) · [Captions and key points](/examples#captions-and-key-points) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

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

Children: `track`, `marker`, `multicam`, `captions`. [All elements](/reference/elements/)

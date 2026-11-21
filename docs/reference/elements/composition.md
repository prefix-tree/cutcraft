---
editLink: false
---

# `<Composition>`

The video: frame rate, size, background and theme. It ends where its content ends. Clips written straight in it play in order, as its main track.

<Example src="previews/elements/composition" alt="<Composition>">

<<< @/../examples/showcase/docs/composition.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [Product launch](/examples/launch) · [Kinetic type](/examples/kinetic) · [Data story](/examples/data) · [Logo reveal](/examples/logo) · [An edit](/examples/edit) · [Captions and key points](/examples/captions) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string | `"composition"` |  | The video's name. |
| `fps` | number (>0..240) \| "23.976" \| "29.97" \| "47.952" \| "59.94" \| "119.88" \| { num, den } |  | yes | Frames per second: a number (`30`, `25`, `60`), an NTSC rate by name (`"29.97"`, `"23.976"`, `"59.94"`, which are 30000/1001, 24000/1001 and 60000/1001), or an exact fraction `{ num, den }`. A rate must divide into whole ticks. |
| `width` | integer (16..8192) |  | yes | The frame's width in pixels. |
| `height` | integer (16..8192) |  | yes | The frame's height in pixels. |
| `sampleRate` | integer (8000..192000) | `48000` |  | The soundtrack's samples per second. It must divide into whole ticks; 44100, 48000 and 96000 do. |
| `channels` | integer (1..8) | `2` |  | The soundtrack's channels: 1 is mono, 2 stereo. |
| `background` | { type, color, gradient } |  |  | What shows where nothing covers the frame: a colour, a gradient, or (`blur`) the picture itself, blurred to fill. |
| `theme` | { extends, palette, fonts, radius, motion, styles } |  |  | The video's look: palette, fonts, radius, motion style and element presets. Elements use it through `$tokens` and `style`. |
| `motionBlur` | { shutterAngle, samples } |  |  | A film camera's blur on everything that moves, in the export: each frame averages `samples` moments across the time its shutter is open, `shutterAngle` degrees of the frame (180 is half the frame, the film default). Drawn by the browser export, which a file with it uses on its own; the preview stays sharp. |

Children: `track`, `marker`, `captions`. [All elements](/reference/elements/)

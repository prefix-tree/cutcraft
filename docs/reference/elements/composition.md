# `<Composition>`

The video: frame rate, size, background and theme. It ends where its content ends.

<Example src="previews/elements/composition" alt="<Composition>">

<<< @/../examples/showcase/docs/composition.tsx

</Example>

**Used in:** [Product launch](/examples#a-product-launch) · [Kinetic type](/examples#kinetic-type) · [Data story](/examples#a-data-story) · [Logo reveal](/examples#a-logo-reveal) · [An edit](/examples#an-edit) · [Captions and key points](/examples#captions-and-key-points) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string | `"composition"` |  |
| `fps` | number (−∞..240) |  | yes |
| `width` | integer |  | yes |
| `height` | integer |  | yes |
| `sampleRate` | integer | `48000` |  |
| `channels` | integer | `2` |  |
| `background` | { mode, color, gradient } |  |  |
| `theme` | { extends, palette, fonts, radius, motion, styles } |  |  |

Children: `track`, `marker`, `multicam`, `captions`. [All elements](/reference/elements/)

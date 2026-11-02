# `<Composition>`

The video: frame rate, size, background and theme. It ends where its content ends.

<Example src="previews/elements/composition" alt="<Composition>">

<<< @/../examples/showcase/docs/composition.tsx

</Example>

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

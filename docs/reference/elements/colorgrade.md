# `<ColorGrade>`

Temperature and tint on its parent.

<Example src="previews/elements/colorgrade" alt="<ColorGrade>">

<<< @/../examples/showcase/docs/colorgrade.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `wheels` | { shadows, midtones, highlights, shadowsLift, midtonesGamma, highlightsGain } |  |  |
| `curves` | { rgb, red, green, blue } |  |  |
| `lut` | { src, intensity } |  |  |
| `hsl` | { hue, saturation, luminance } |  |  |
| `temperature` | number (-100..100) |  |  |
| `tint` | number (-100..100) |  |  |

No children. [All elements](/reference/elements/)

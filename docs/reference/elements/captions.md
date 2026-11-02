# `<Captions>`

Subtitles from an asset's transcript that follow the clips through every trim.

<Example src="previews/elements/captions" alt="<Captions>">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `src` | string |  |  |
| `style` | string \| { font, size, weight, color, background, shadow, stroke, position, highlight, upcoming } |  |  |
| `animation` | "none" \| "word-highlight" \| "word-by-word" \| "karaoke" \| "bounce" \| "typewriter" | `"none"` |  |
| `maxChars` | integer |  |  |
| `maxDuration` | number | `5` |  |
| `maxGap` | number (0..∞) | `0.8` |  |

Visual. Children: `caption`. [All elements](/reference/elements/)

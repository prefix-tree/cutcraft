# `<Captions>`

Subtitles from an asset's transcript that follow the clips through every trim.

<Example src="previews/elements/captions" alt="<Captions>">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

**Used in:** [Kinetic type](/examples#kinetic-type) · [Captions and key points](/examples#captions-and-key-points) · [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `src` | string |  |  |
| `style` | string \| { font, size, weight, color, background, shadow, stroke, position, highlight, upcoming } |  |  |
| `animation` | "none" \| "word-highlight" \| "word-by-word" \| "karaoke" \| "typewriter" | `"none"` |  |
| `maxChars` | integer |  |  |
| `maxDuration` | number | `5` |  |
| `maxGap` | number (0..∞) | `0.8` |  |
| `breakAfter` | string[] |  |  |

Visual. Children: `caption`. [All elements](/reference/elements/)

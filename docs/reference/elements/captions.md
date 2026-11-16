---
editLink: false
---

# `<Captions>`

Subtitles from an asset's transcript that follow the clips through every trim.

<Example src="previews/elements/captions" alt="<Captions>">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

**Used in:** [Kinetic type](/examples/kinetic) · [Captions and key points](/examples/captions) · [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The captions' name. |
| `src` | string |  |  | Generate children from the asset's transcript. Literal `<Caption>` children override this. |
| `style` | string \| { font, size, weight, color, background, shadow, stroke, position, highlight, highlightBox, upcoming } |  |  | Caption styling, or the name of a theme captions preset. |
| `animation` | "none" \| "word-highlight" \| "word-by-word" \| "karaoke" \| "typewriter" | `"none"` |  | How the words appear: all at once, the word being said highlighted, word by word, karaoke or typewriter. |
| `x` | number |  |  | Where the middle of the captions is, in pixels right of the frame's centre and below it, as on a card or a badge. `y` takes the place of `style.position`; `x` alone keeps the height that names. |
| `y` | number |  |  | Pixels below the frame's centre for the middle of the captions, as `x`. |
| `width` | number (> 0) |  |  | The widest a caption line may be, in pixels. Left out: the frame, less a margin at each side. |
| `align` | "left" \| "center" \| "right" \| "justify" |  |  | Which side of that width the lines sit against. Left out: `center`. |
| `maxChars` | integer (> 0) |  |  | The most characters on a generated cue's line. Left out: as many as fit at the caption size on this frame (at most 42). |
| `maxDuration` | number (> 0) | `5` |  | The longest a generated cue may stay on screen, in seconds. |
| `maxGap` | number (0..∞) | `0.8` |  | A pause longer than this, in seconds, starts a new cue. |
| `breakAfter` | string[] |  |  | Words a generated cue always ends after, as `word:N` refs on `src`: `breakAfter={["word:5", "word:12"]}`. |

Visual. Children: `caption`. [All elements](/reference/elements/)

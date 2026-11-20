---
editLink: false
---

# `<Captions>`

Subtitles from an asset's transcript that follow the clips through every trim.

<Example src="previews/elements/captions" alt="<Captions>">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [Kinetic type](/examples/kinetic) · [Captions and key points](/examples/captions) · [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The captions' name. |
| `src` | string |  |  | Generate children from the asset's transcript. Literal `<Caption>` children override this. |
| `style` | string \| { font, size, weight, color, background, shadow, stroke, highlight, highlightBox, upcoming } |  |  | Caption styling, or the name of a theme captions preset. |
| `animation` | "none" \| "word-highlight" \| "word-by-word" \| "karaoke" \| "typewriter" | `"none"` |  | How the words appear: all at once, the word being said highlighted, word by word, karaoke or typewriter. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle the caption block sits in, from the frame's top left as on any element. Left out, the lower safe area: centred, as wide as the frame less a margin at each side, its bottom a margin above the frame's bottom (`origin: "bottom"`). Each field written replaces that one of the default, so a box with only `y: 1150` and `origin: "center"` puts the block's middle at 1150 and keeps the default width. Without a `height`, the block is as tall as its lines. |
| `align` | "left" \| "center" \| "right" \| "justify" |  |  | Which side of that width the lines sit against. Left out: `center`. |
| `maxChars` | integer (> 0) |  |  | The most characters on a generated cue's line. Left out: as many as fit at the caption size on this frame (at most 42). |
| `maxDuration` | number (> 0) | `5` |  | The longest a generated cue may stay on screen, in seconds. |
| `maxGap` | number (0..∞) | `0.8` |  | A pause longer than this, in seconds, starts a new cue. |
| `breakAfter` | string[] |  |  | Words a generated cue always ends after, as `word:N` refs on `src`: `breakAfter={["word:5", "word:12"]}`. |

Visual. Children: `caption`. [All elements](/reference/elements/)

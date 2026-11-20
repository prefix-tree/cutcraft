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
| `style` | string \| { preset, font, size, weight, color, background, shadow, stroke, highlight, highlightBox, upcoming, align } |  |  | How the words look: the name of a theme captions preset, or an object of its fields, with `preset` naming the one it starts from. |
| `animation` | "none" \| "wordHighlight" \| "wordByWord" \| "karaoke" \| "typewriter" | `"none"` |  | How the words appear: all at once, the word being said highlighted, word by word, karaoke or typewriter. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle the caption block sits in, from the frame's top left as on any element. Left out, the lower safe area: centred, as wide as the frame less a margin at each side, its bottom a margin above the frame's bottom (`origin: "bottom"`). Each field written replaces that one of the default, so a box with only `y: 1150` and `origin: "center"` puts the block's middle at 1150 and keeps the default width. Without a `height`, the block is as tall as its lines. |
| `maxChars` | integer (> 0) |  |  | The most characters on a generated cue's line. Left out: as many as fit at the caption size on this frame (at most 42). |
| `maxDuration` | number (> 0) | `5` |  | The longest a generated cue may stay on screen, in seconds. |
| `maxGap` | number (0..∞) | `0.8` |  | A pause longer than this, in seconds, starts a new cue. |
| `breakAfter` | string[] |  |  | Words a generated cue always ends after, as `word:N` refs on `src`: `breakAfter={["word:5", "word:12"]}`. |

### `style`

A theme preset's name, or an object of these fields. `preset` names the preset the object starts from; the fields written beside it win.

| field | type | default | description |
|---|---|---|---|
| `preset` | string |  | A theme captions preset this style starts from; the fields written beside it win. |
| `font` | string |  | The font family, as a title's. Left out: Inter. |
| `size` | number (1..1000) |  | The letters' size, in pixels. Left out: a 24th of the frame's height. |
| `weight` | integer (100..900) \| "normal" \| "bold" |  | How heavy the letters are: 100 to 900, or `normal` and `bold`. Left out: 800. |
| `color` | string |  | The letters' colour, or a theme token. Left out: white. |
| `background` | string |  | A colour behind each cue. |
| `shadow` | { color, blur, x, y } |  | A drop shadow under the letters. Left out: a dark halo that reads on light and dark footage. |
| `stroke` | { color, thickness } |  | An outline around the letters, drawn under them: its colour and thickness in pixels. |
| `highlight` | string |  | The colour of the word being said, for the word animations. |
| `highlightBox` | string |  | A filled, rounded box behind the word being said. `highlight` stays the colour of its letters. |
| `upcoming` | string |  | The colour of the words not yet said. |
| `align` | "left" \| "center" \| "right" \| "justify" |  | Which side of the box's width the lines sit against. Left out: `center`. |

Visual. Children: `caption`. [All elements](/reference/elements/)

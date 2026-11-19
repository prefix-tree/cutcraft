---
title: Examples
---

# Examples

Every example is one file, rendered by UberScene's own export. Hover a poster to play it; open it to read the file and
what its key parts do. For starting points by kind of video, see the [recipes](/recipes/) and the
[walkthrough](/guide/writing-files).

<Gallery />

## Where to start

| You're making | Start from |
|---|---|
| A product launch or promo | [Product launch](/examples/launch), the [walkthrough](/guide/writing-files), [Brand spot](/recipes/brand-spot) |
| A montage of footage with transitions, a grade and sound | [A coffee film](/examples/coffee) |
| An interview or podcast cut | [A talking head with a diagram](/examples/lunar-eclipse), [An interview that changes layout](/examples/hundred-videos), [Talking-head cut](/recipes/talking-head), [Multicam highlights](/recipes/highlights) |
| A vertical short | [A talking head with a diagram](/examples/lunar-eclipse), [Kinetic type](/examples/kinetic), [Captions and key points](/examples/captions), [Vertical clip from a podcast](/recipes/vertical-podcast) |
| An explainer with no footage | [One pixel](/examples/one-pixel), [How game lighting fakes it](/examples/game-lighting) |
| A product or screen demo | [Product demo with zoom-ins](/recipes/product-demo), [From notes to a cut](/examples/notes-to-cut) |
| Charts and numbers | [Data story](/examples/data), [Stats with handles](/recipes/stats) |
| An intro, outro or logo sting | [Logo reveal](/examples/logo) |
| A slideshow | [Slideshow with motion](/recipes/slideshow) |
| One video in many versions | [Variants from one file](/recipes/variants) |

| To see | Look at | Explained in |
|---|---|---|
| Cuts on transcript words (`in="word:12"`) | [Product launch](/examples/launch), [Data story](/examples/data), [Talking-head cut](/recipes/talking-head) | [Timing](/guide/time) |
| Overlays on the word that names them (`anchor` + `at`) | [Product launch](/examples/launch), [Kinetic type](/examples/kinetic), [Captions](/examples/captions) | [Timing](/guide/time) |
| Elements that leave with another (`until` on `duration`) | [A talking head with a diagram](/examples/lunar-eclipse), [An interview that changes layout](/examples/hundred-videos) | [Timing](/guide/time#how-long-it-plays) |
| Captions from the transcript | [A talking head with a diagram](/examples/lunar-eclipse), [Kinetic type](/examples/kinetic), [Captions](/examples/captions), [Vertical clip](/recipes/vertical-podcast) | [Captions and sound](/guide/captions-and-sound) |
| Captions placed with `x`, `y` and `width` | [An interview that changes layout](/examples/hundred-videos), [One pixel](/examples/one-pixel), [A talking head with a diagram](/examples/lunar-eclipse) (`y`) | [Place captions](/guide/captions-and-sound#place-captions) |
| A box behind the word being said (`highlightBox`) | [A talking head with a diagram](/examples/lunar-eclipse), [One pixel](/examples/one-pixel) | [Highlight the word being said](/guide/captions-and-sound#highlight-the-word-being-said) |
| Narration timed from a script (`narrate()`) | [One pixel](/examples/one-pixel), [From notes to a cut](/examples/notes-to-cut) | [Narration from a script](/guide/captions-and-sound#narration-from-a-script) |
| Captions from an SRT, VTT or Whisper file | [Captions](/examples/captions) | [Getting a transcript](/guide/captions-and-sound#getting-a-transcript) |
| Diagram parts (angles, rows, strike-throughs) | [A talking head with a diagram](/examples/lunar-eclipse), [An interview that changes layout](/examples/hundred-videos) | [Diagram parts](/guide/free-code#diagram-parts) |
| Named parts (`data-name`) for the layout check and `uberscene where` | [A talking head with a diagram](/examples/lunar-eclipse), [One pixel](/examples/one-pixel), [An interview that changes layout](/examples/hundred-videos) | [Check the layout](/guide/checking#check-the-layout), [Where things are at a moment](/guide/checking#where-things-are-at-a-moment) |
| Ready-made cards and frames (`TypeCard`, `QuoteCard`, `Frame`) | [A talking head with a diagram](/examples/lunar-eclipse) (`Frame`), one demo each in [Components](/reference/components/) | [Cards for a talking head](/guide/titles-and-graphics#cards-for-a-talking-head) |
| three.js (`<Three>`) | [Product launch](/examples/launch), [Logo reveal](/examples/logo), [How game lighting fakes it](/examples/game-lighting), [One pixel](/examples/one-pixel), [Brand spot](/recipes/brand-spot) | [Free code](/guide/free-code#three-js-and-motion) |
| Motion (`<Motion>`) | [Kinetic type](/examples/kinetic), [Data story](/examples/data), [An edit](/examples/edit) | [Free code](/guide/free-code#three-js-and-motion) |
| Scenes from blocks, with their props set where they are placed | [From notes to a cut](/examples/notes-to-cut), [A coffee film](/examples/coffee), [An interview that changes layout](/examples/hundred-videos) | [Blocks](/guide/blocks) |
| Any React in a `<Layer>` | [Data story](/examples/data) (counters), [Stats with handles](/recipes/stats) | [Free code](/guide/free-code) |
| Transitions and keyframes | [A coffee film](/examples/coffee), [An edit](/examples/edit), [Slideshow](/recipes/slideshow) | [Elements](/reference/elements/) |
| Speed ramps, a held frame, a LUT that comes in and sound cues on each beat | [A coffee film](/examples/coffee) | [Colour and grading](/guide/colour), [Sound effects at a cut](/guide/transitions#sound-effects-at-a-cut) |
| Every built-in effect and transition, one demo each | [Effects and transitions](/reference/effects/) | [Colour](/guide/colour), [Keying, blurs and pins](/guide/footage-tools), [Timing](/guide/time) |
| A grade built from several effects, in order | [Colour grade](/guide/colour) | [Colour and grading](/guide/colour) |
| Effect order changing the picture | [Grayscale then duotone, and the reverse](/guide/custom-effects) | [Free code](/guide/free-code) |
| One prop that restyles everything (themes) | [Brand spot](/recipes/brand-spot) | [Themes](/guide/themes) |
| Tweakable values (`schema`, `defaults`) | Every showcase file, [Variants](/recipes/variants) | [The file](/guide/the-file#schema-and-defaults-are-the-knobs) |
| Music that ducks under speech | [Talking-head cut](/recipes/talking-head), the [walkthrough](/guide/writing-files) | [Captions and sound](/guide/captions-and-sound#sound) |
| Google Fonts or your own font files | [Fonts example](/guide/themes#fonts) | [Themes](/guide/themes#fonts) |
| Motion blur | [Motion blur example](/guide/exporting#motion-blur) | [Exporting](/guide/exporting#motion-blur) |
| Your own effects and transitions in GLSL | [Duotone, circle reveal, colour split on a title](/guide/custom-effects) | [Free code](/guide/custom-effects) |
| A flare or a sound over a cut | [At a cut](/guide/transitions#over-a-cut-light-leaks-flashes-and-whooshes) | [Timing](/guide/transitions#over-a-cut-light-leaks-flashes-and-whooshes) |

## Rendering them yourself

Each showcase video is one file in
[`examples/showcase`](https://github.com/prefix-tree/uberscene/tree/main/examples/showcase), rendered with
`pnpm --filter @uberscene/example-showcase render`. The guide's feature examples are in
[`examples/showcase/guide`](https://github.com/prefix-tree/uberscene/tree/main/examples/showcase/guide), rendered with
`pnpm --filter @uberscene/example-showcase docs`. Every file renders through the player in
[headless Chrome](/guide/exporting#the-browser-it-runs-in).

The showcase footage is made by `ffmpeg`'s own sources (`pnpm --filter @uberscene/example-showcase gen`), except the
two coffee shots in the effect and transition demos, close and wide: Pixabay videos
[209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay
Content License. They are not committed; `gen` reads them from `examples/showcase/media/stock/` and checks their
hashes.

The shorts are in [`examples/shorts`](https://github.com/prefix-tree/uberscene/tree/main/examples/shorts),
rendered with `pnpm --filter @uberscene/example-shorts render`. The two lighting explainers and the snake use no media at all. The
talking head is real footage: 79 seconds of a NASA interview, in the public domain, committed with its transcript and
credit in `examples/shorts/media`. The interview that changes layout is a 44 second excerpt of a podcast, which is
the podcast's copyright and is credited in the same folder.

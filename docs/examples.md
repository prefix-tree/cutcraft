---
title: Examples
---

<script setup>
import { withBase } from "vitepress";
</script>

# Examples

Short finished videos, each rendered next to the file that made it. Start here to see what CutCraft can do. Every
example is a complete file, and there are four kinds:

- **Showcase videos and shorts** (this page): the [showcase](#showcase) files show one idea each; the
  [shorts](#shorts) are longer vertical films, some cut from real footage.
- **[Recipes](/recipes/)**: files for the videos people most often make (an interview cut, a product demo, a vertical
  clip, variants). Each passes the lint and has a test; copy one as a starting point.
- **[The walkthrough](/guide/writing-files)**: one launch video a model wrote from a brief, explained line by line.
- **Feature examples** in the guide: short files that each show one feature, rendered next to their code on the page
  that explains it (fonts, motion blur, your own effects and transitions, something over a cut).

## Where to start

| You're making | Start from |
|---|---|
| A product launch or promo | [Product launch](#a-product-launch), the [walkthrough](/guide/writing-files), [Brand spot](/recipes/brand-spot) |
| An interview or podcast cut | [A talking head with a diagram](#a-talking-head-with-a-diagram), [An interview that changes layout](#an-interview-that-changes-layout-with-the-story), [Talking-head cut](/recipes/talking-head), [Multicam highlights](/recipes/highlights) |
| A vertical short | [A talking head with a diagram](#a-talking-head-with-a-diagram), [Kinetic type](#kinetic-type), [Captions and key points](#captions-and-key-points), [Vertical clip from a podcast](/recipes/vertical-podcast) |
| An explainer with no footage | [One pixel](#one-pixel), [How game lighting fakes it](#how-game-lighting-fakes-it) |
| A product or screen demo | [Product demo with zoom-ins](/recipes/product-demo) |
| Charts and numbers | [Data story](#a-data-story), [Stats with handles](/recipes/stats) |
| An intro, outro or logo sting | [Logo reveal](#a-logo-reveal) |
| A slideshow | [Slideshow with motion](/recipes/slideshow) |
| One video in many versions | [Variants from one file](/recipes/variants) |

| To see | Look at | Explained in |
|---|---|---|
| Cuts on transcript words (`in="word:12"`) | [Product launch](#a-product-launch), [Data story](#a-data-story), [Talking-head cut](/recipes/talking-head) | [Timing](/guide/time) |
| Overlays on the word that names them (`anchor` + `at`) | [Product launch](#a-product-launch), [Kinetic type](#kinetic-type), [Captions](#captions-and-key-points) | [Timing](/guide/time) |
| Elements that leave with another (`until` on `duration`) | [A talking head with a diagram](#a-talking-head-with-a-diagram), [An interview that changes layout](#an-interview-that-changes-layout-with-the-story) | [Timing](/guide/time#how-long-it-plays) |
| Captions from the transcript | [A talking head with a diagram](#a-talking-head-with-a-diagram), [Kinetic type](#kinetic-type), [Captions](#captions-and-key-points), [Vertical clip](/recipes/vertical-podcast) | [Captions and sound](/guide/captions-and-sound) |
| Captions placed with `x`, `y` and `width` | [An interview that changes layout](#an-interview-that-changes-layout-with-the-story), [One pixel](#one-pixel), [A talking head with a diagram](#a-talking-head-with-a-diagram) (`y`) | [Place captions](/guide/captions-and-sound#place-captions) |
| A box behind the word being said (`highlightBox`) | [A talking head with a diagram](#a-talking-head-with-a-diagram), [One pixel](#one-pixel) | [Highlight the word being said](/guide/captions-and-sound#highlight-the-word-being-said) |
| Narration timed from a script (`narrate()`) | [One pixel](#one-pixel) | [Narration from a script](/guide/captions-and-sound#narration-from-a-script) |
| Captions from an SRT, VTT or Whisper file | [Captions](#captions-and-key-points) | [Getting a transcript](/guide/captions-and-sound#getting-a-transcript) |
| Diagram parts (angles, rows, strike-throughs) | [A talking head with a diagram](#a-talking-head-with-a-diagram), [An interview that changes layout](#an-interview-that-changes-layout-with-the-story) | [Diagram parts](/guide/free-code#diagram-parts) |
| Named parts (`data-name`) for the layout check and `cutcraft where` | [A talking head with a diagram](#a-talking-head-with-a-diagram), [One pixel](#one-pixel), [An interview that changes layout](#an-interview-that-changes-layout-with-the-story) | [Check the layout](/guide/checking#check-the-layout), [Where things are at a moment](/guide/checking#where-things-are-at-a-moment) |
| Ready-made cards and frames (`TypeCard`, `QuoteCard`, `Frame`) | [A talking head with a diagram](#a-talking-head-with-a-diagram) (`Frame`), one demo each in [Components](/reference/components/) | [Cards for a talking head](/guide/titles-and-graphics#cards-for-a-talking-head) |
| three.js (`<Three>`) | [Product launch](#a-product-launch), [Logo reveal](#a-logo-reveal), [How game lighting fakes it](#how-game-lighting-fakes-it), [One pixel](#one-pixel), [Brand spot](/recipes/brand-spot) | [Free code](/guide/free-code#three-js-and-motion) |
| Motion (`<Motion>`) | [Kinetic type](#kinetic-type), [Data story](#a-data-story), [An edit](#an-edit) | [Free code](/guide/free-code#three-js-and-motion) |
| Any React in a `<Layer>` | [Data story](#a-data-story) (counters), [Stats with handles](/recipes/stats) | [Free code](/guide/free-code) |
| Transitions and keyframes | [An edit](#an-edit), [Slideshow](/recipes/slideshow) | [Elements](/reference/elements/) |
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

## Showcase

Short files in [`examples/showcase`](https://github.com/prefix-tree/cutcraft/tree/main/examples/showcase), each
showing one idea. The people on camera are stand-ins: their footage is a gradient, and the manifest holds the words
they would say.

### The logo film

The landing page's hero: a woodblock print in the logo's colours.

<div class="cc-pair"><video :src="withBase('/showcase/hero.webm')" :poster="withBase('/showcase/hero.jpg')" controls muted loop playsinline></video></div>

Waves roll in, a red sun rises through bands of mist while birds cross, a katana cuts it in two, and the print draws
in to the logo's tile, where the colours turn over. The name follows, then the three ways to make a video, and a
seal. It is one `<Layer>` of React SVG timed by `useLayer().elapsed`, plus `<Title>`s in Google Fonts. It ends on the
paper it began on, so it loops.

**Shows:** React SVG in a `<Layer>` timed by `useLayer().elapsed`, titles in Google Fonts, a loop. [Free code](/guide/free-code#the-video-s-clock) · [Themes](/guide/themes#fonts)

<<< @/../examples/showcase/hero.tsx

### A product launch

The founder on camera, cut on her words, with b-roll in the middle.

<div class="cc-pair"><video :src="withBase('/showcase/launch.webm')" :poster="withBase('/showcase/launch.jpg')" controls muted loop playsinline></video></div>

A `<Three>` layer turns a phone in on the word "Shed" and keeps it turning; its screen is the product's name drawn on
a canvas. A Motion lower third names her. Each feature appears as a pill on the word that names it
(`anchor="talk" at="word:8"`), so recutting the talk retimes every callout.

**Shows:** cuts on words, overlays on words, `<Three>`, `<Motion>`, a crossfade, tweakable props. [Timing](/guide/time) · [Free code](/guide/free-code#three-js-and-motion) · [`<Three>`](/reference/elements/three) · [`<Motion>`](/reference/elements/motion)

<<< ../examples/showcase/launch.tsx

### Kinetic type

A vertical short of animated phrases over karaoke captions.

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/kinetic.webm')" :poster="withBase('/showcase/kinetic.jpg')" controls muted loop playsinline></video></div>

Each phrase is a `<Motion>` sequence anchored to the word that starts it: one slams in, one stacks word by word, one
slides across. Karaoke captions run underneath.

**Shows:** `<Motion>` sequences anchored to words, karaoke captions, a vertical composition. [Timing](/guide/time) · [Captions and sound](/guide/captions-and-sound) · [`<Motion>`](/reference/elements/motion)

<<< ../examples/showcase/kinetic.tsx

### A data story

A bar chart and counters that move with the numbers being said.

<div class="cc-pair"><video :src="withBase('/showcase/data.webm')" :poster="withBase('/showcase/data.jpg')" controls muted loop playsinline></video></div>

The chart is plain SVG animated by Motion: each bar grows on the word that says its number. The counters are a few
lines of React in a `<Layer>`, counting up on the layer's clock.

**Shows:** SVG animated by `<Motion>`, React counters in a `<Layer>` reading `useLayer()`, numbers on the words that say them. [Free code](/guide/free-code) · [`<Layer>`](/reference/elements/layer) · [`<Motion>`](/reference/elements/motion)

<<< ../examples/showcase/data.tsx

### A logo reveal

Particles that settle into a name, then a tagline.

<div class="cc-pair"><video :src="withBase('/showcase/logo.webm')" :poster="withBase('/showcase/logo.jpg')" controls muted loop playsinline></video></div>

Three thousand three.js particles, scattered by a seeded random, settle into the name sampled from a canvas. Then a
Motion tagline slides in under it. Every particle's place is a function of time, so a frame looks the same however
it is reached.

**Shows:** a three.js particle system written as a function of time, a seeded random, a `<Motion>` hand-off. [Free code](/guide/free-code#the-video-s-clock) · [`<Three>`](/reference/elements/three)

<<< ../examples/showcase/logo.tsx

### An edit

Three shots cut back to back, with transitions, a push-in and titles.

<div class="cc-pair"><video :src="withBase('/showcase/edit.webm')" :poster="withBase('/showcase/edit.jpg')" controls muted loop playsinline></video></div>

The shots sit on a sequence track, with a wipe and a slide between them as siblings. The middle shot pushes in with
four keyframes, a title builds word by word, and a Motion lower third comes in over the second shot. The overlays
anchor to the shots, so they move when a cut moves.

**Shows:** a sequence track, transitions as siblings, keyframes, titles anchored to shots, a `<Motion>` lower third. [Timing](/guide/time) · [`<Transition>`](/reference/elements/transition) · [`<Keyframe>`](/reference/elements/keyframe)

<<< ../examples/showcase/edit.tsx

### Captions and key points

A vertical short with word-by-word captions and a key point on its word.

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/captions.webm')" :poster="withBase('/showcase/captions.jpg')" controls muted loop playsinline></video></div>

The captions are generated from the words the clip plays and highlight word by word. The key point is anchored to
the clip and timed to the word that names it (`at="word:16"`), so trimming the clip keeps it on that word.

**Shows:** cuts on words, generated karaoke captions, a title on the word that names it. [Captions and sound](/guide/captions-and-sound) · [Timing](/guide/time)

<<< ../examples/showcase/captions.tsx

## Shorts

Longer vertical films in [`examples/shorts`](https://github.com/prefix-tree/cutcraft/tree/main/examples/shorts). Two
are pure animation with no media; two are cut from real interviews.

### How game lighting fakes it

A vertical explainer of five lighting tricks, made of pure animation: no footage, no media file.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/game-lighting.webm')" :poster="withBase('/shorts/game-lighting.jpg')" controls muted loop playsinline></video></div>

A small room is shown fully lit, then with no lighting at all. Then five tricks are switched on one at a time: direct
light, shadows, bounce light, ambient occlusion and bloom. The subtitles at the top say how each one works, and the
chips at the bottom light up as each comes on. It ends on the picture it opened with, so it loops.

The room is one `<Three>` scene, and every light and the camera are set from the layer's time. The ambient occlusion
is baked into the model's vertices when the scene is set up. Bloom is not in the scene: it is a `glow` effect with
keyframes on the `<Three>` tag. The opening and closing lines and the two wall colours are props, so a variant needs
no edit.

**Shows:** a three.js scene driven by the video's clock, a built-in effect with keyframes on a `<Three>` tag, written captions, a `<Layer>` that reads the time, props for variants. [Free code](/guide/free-code#three-js-and-motion) · [Captions and sound](/guide/captions-and-sound)

<<< ../examples/shorts/game-lighting.tsx

### A talking head with a diagram

A vertical short cut from a real interview: NASA's Ernie Wright on why there is no lunar eclipse every month, and why
the Moon turns red when there is one. Press play for the sound.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/lunar-eclipse.webm')" :poster="withBase('/shorts/lunar-eclipse.jpg')" controls playsinline></video></div>

It is five pieces of an eight minute interview, each cut on a word of the transcript. A diagram above the speaker
moves on his words. The Moon's path tips as he says "tilted", the Moon passes over the Earth's shadow on "above" and
under it on "below", six months are counted and it goes through, and it takes each colour as he names it.

The diagram is ordinary React in `<Layer>`s. Each layer starts on a word, draws the whole panel from there on and
lasts until its clip ends. So no cut and no cue in the file is typed in seconds, and trimming a clip moves everything
drawn over it. The angle that counts to five degrees, the row of months and the line through the wrong answer are the
kit's [diagram parts](/guide/free-code#diagram-parts).

The captions come from the transcript, with a box behind the word being said. The Moon, the Earth and the labels are
named with `data-name`, so the layout check holds each one to the area TikTok, Reels and Shorts leave clear.

**Shows:** cuts on words, captions with a boxed word and a chosen height, free code in a `<Layer>` started on a word, named parts for the layout check, `Frame`, graphics that last until their clip ends. [Timing](/guide/time) · [Free code](/guide/free-code) · [Captions and sound](/guide/captions-and-sound) · [Checking the layout](/guide/checking#check-the-layout)

Footage: NASA's Scientific Visualization Studio, [item 14791](https://svs.gsfc.nasa.gov/14791/), public domain.

<<< ../examples/shorts/lunar-eclipse.tsx

### One pixel

A two minute explainer of how a game lights a room, told by following one dot of the screen, for someone who has
never thought about it. It has no footage and no media.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/one-pixel.webm')" :poster="withBase('/shorts/one-pixel.jpg')" controls muted loop playsinline></video></div>

It opens with light going straight through a ball and explains why real light is too slow to copy. Then it shows five
cheats: is the surface facing the lamp, can the lamp see it, light bounced off a wall and worked out in advance, tight
places darkened, and the brightest dots smeared into a glow.

The narration leads. The script is one string in the file, with a cue marked on the words that matter. The kit's
[`narrate`](/guide/captions-and-sound#narration-from-a-script) turns it into word times, subtitles and cues, and every
animation reads those cue times. There is no voice in it: the subtitles show a phrase at a time with a box on the word
being said, timed at a speaking pace, for a voice to be recorded over.

Two stages take turns: a three.js room, and the same room cut in half and drawn as a diagram, where the floor is a
row of dots with a brightness number on each. The diagram and the subtitles keep inside the area TikTok, Reels and
Shorts all leave clear of their own controls, so the lower third of the frame holds only the background. One constant
in the file places the diagram, its labels are named with `data-name`, and `--check-layout` passes on all three zones.

**Shows:** a film timed from its script, subtitles with a boxed word, a `<Three>` scene with each trick as a switch, an SVG diagram in a `<Layer>` driven by the video's time, a built-in effect with keyframes. [Free code](/guide/free-code) · [Captions and sound](/guide/captions-and-sound)

<<< ../examples/shorts/one-pixel.tsx

### An interview that changes layout with the story

Forty-four seconds of MrBeast on the Lex Fridman Podcast, shot landscape with two cameras, cut as a vertical short.
Press play for the sound.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/hundred-videos.webm')" :poster="withBase('/shorts/hundred-videos.jpg')" controls playsinline></video></div>

The layout follows what is being said. The set-up, the question and the conclusion are full screen on whoever is
speaking. While he explains, the same shot eases back and up, the picture darkens from his chest down, and a graphic
sits under his face: a hundred cells filling as he says "a hundred videos", the five things he lists arriving one at
a time with the earlier ones dimmed, and the loop he describes with each word he names joining it.

The picture moves smoothly only when the layout changes: keyframes on the clip's crop and position, over half a
second. Where the source itself cuts between its two cameras, the crop switches on that frame. The speaker's pauses
are as recorded; nothing is closed up.

Everything that must be read is inside the area TikTok, Reels and Shorts all leave clear, and the
[layout check](/guide/checking#check-the-layout) passes on all three. The darkening is a `<Layer>` marked
`data-ground`, so the check takes it for the ground that the graphics and subtitles sit on. The graphics use the
kit's [diagram parts](/guide/free-code#diagram-parts) and name their own parts with `data-name`. The subtitles are
set in Poppins, declared with `googleFont()` and chosen from a `cutcraft fonts --sheet` of the short's own words.

A second file, `cards/hundred-videos-compare.tsx`, plays the source and the rendered short in step, for showing what
an edit did:

<div class="cc-pair"><video :src="withBase('/shorts/hundred-videos-compare.webm')" :poster="withBase('/shorts/hundred-videos-compare.jpg')" controls playsinline></video></div>

**Shows:** reframing 16:9 to 9:16 round whoever speaks, keyframes on `transform.crop`, direct cuts on the source's camera cuts, a scrim marked `data-ground`, graphics timed to words with `useProgress`, word-highlight subtitles placed with `x`, `y` and `width`, a Google font, three safe zones. [Timing](/guide/time) · [Free code](/guide/free-code) · [Themes](/guide/themes#choosing-a-font) · [Checking the layout](/guide/checking#check-the-layout)

Footage: [Lex Fridman Podcast #351](https://www.youtube.com/watch?v=Z3_PwvvfxIU), a 44 second excerpt, the copyright of the podcast. It is not covered by this project's licence, and neither speaker has anything to do with this project.

<<< ../examples/shorts/hundred-videos.tsx

## Rendering them yourself

Each showcase video is one file in
[`examples/showcase`](https://github.com/prefix-tree/cutcraft/tree/main/examples/showcase), rendered with
`pnpm --filter @cutcraft/example-showcase render`. The guide's feature examples are in
[`examples/showcase/guide`](https://github.com/prefix-tree/cutcraft/tree/main/examples/showcase/guide), rendered with
`pnpm --filter @cutcraft/example-showcase docs`. Every file renders through the player in
[headless Chrome](/guide/exporting#the-browser-it-runs-in).

The showcase footage is made by `ffmpeg`'s own sources (`pnpm --filter @cutcraft/example-showcase gen`), except the
two coffee shots in the effect and transition demos, close and wide: Pixabay videos
[209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay
Content License. They are not committed; `gen` reads them from `examples/showcase/media/stock/` and checks their
hashes.

The four shorts are in [`examples/shorts`](https://github.com/prefix-tree/cutcraft/tree/main/examples/shorts),
rendered with `pnpm --filter @cutcraft/example-shorts render`. The two lighting explainers use no media at all. The
talking head is real footage: 79 seconds of a NASA interview, in the public domain, committed with its transcript and
credit in `examples/shorts/media`. The interview that changes layout is a 44 second excerpt of a podcast, which is
the podcast's copyright and is credited in the same folder.

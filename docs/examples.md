---
title: Examples
---

<script setup>
import { withBase } from "vitepress";
</script>

# Examples

There are three kinds of example, each a complete file:

- **Showcase videos** (this page): short finished videos, each rendered next to the file that made it. Start here to
  see what CutCraft can do.
- **[Recipes](/recipes/)**: files for the videos people most often make (an interview cut, a product demo, a vertical
  clip, variants). Each passes the lint and has a test; copy one as a starting point.
- **[The walkthrough](/guide/writing-files)**: one launch video a model wrote from a brief, explained line by line.
- **Feature examples** in the guide: short files that each show one feature, rendered next to their code on the page
  that explains it (fonts, motion blur, your own effects and transitions, something over a cut).

## Where to start

| You're making | Start from |
|---|---|
| A product launch or promo | [Product launch](#a-product-launch), the [walkthrough](/guide/writing-files), [Brand spot](/recipes/brand-spot) |
| An interview or podcast cut | [Talking-head cut](/recipes/talking-head), [Multicam highlights](/recipes/highlights) |
| A vertical short | [Kinetic type](#kinetic-type), [Captions and key points](#captions-and-key-points), [Vertical clip from a podcast](/recipes/vertical-podcast) |
| A product or screen demo | [Product demo with zoom-ins](/recipes/product-demo) |
| Charts and numbers | [Data story](#a-data-story), [Stats with handles](/recipes/stats) |
| An intro, outro or logo sting | [Logo reveal](#a-logo-reveal) |
| A slideshow | [Slideshow with motion](/recipes/slideshow) |
| One video in many versions | [Variants from one file](/recipes/variants) |

| To see | Look at | Explained in |
|---|---|---|
| Cuts on transcript words (`in="word:12"`) | [Product launch](#a-product-launch), [Data story](#a-data-story), [Talking-head cut](/recipes/talking-head) | [Time by meaning](/guide/time) |
| Overlays on the word that names them (`anchor` + `at`) | [Product launch](#a-product-launch), [Kinetic type](#kinetic-type), [Captions](#captions-and-key-points) | [Time by meaning](/guide/time) |
| Captions from the transcript | [Kinetic type](#kinetic-type), [Captions](#captions-and-key-points), [Vertical clip](/recipes/vertical-podcast) | [Captions and sound](/guide/captions-and-sound) |
| three.js (`<Three>`) | [Product launch](#a-product-launch), [Logo reveal](#a-logo-reveal), [Brand spot](/recipes/brand-spot) | [Free code](/guide/free-code#three-js-and-motion) |
| Motion (`<Motion>`) | [Kinetic type](#kinetic-type), [Data story](#a-data-story), [An edit](#an-edit) | [Free code](/guide/free-code#three-js-and-motion) |
| Any React in a `<Layer>` | [Data story](#a-data-story) (counters), [Stats with handles](/recipes/stats) | [Free code](/guide/free-code) |
| Transitions and keyframes | [An edit](#an-edit), [Slideshow](/recipes/slideshow) | [Elements](/reference/elements/) |
| Every built-in effect and transition, one demo each | [Effects and transitions](/reference/effects/) | [Colour](/guide/colour), [Keying, blurs and pins](/guide/footage-tools), [Time by meaning](/guide/time) |
| A grade built from several effects, in order | [Colour grade](/guide/colour) | [Colour and grading](/guide/colour) |
| Effect order changing the picture | [Grayscale then duotone, and the reverse](/guide/free-code#effects-and-transitions-of-your-own) | [Free code](/guide/free-code) |
| One prop that restyles everything (themes) | [Brand spot](/recipes/brand-spot) | [Themes](/guide/themes) |
| Tweakable values (`schema`, `defaults`) | Every showcase file, [Variants](/recipes/variants) | [The file](/guide/the-file#schema-and-defaults-are-the-knobs) |
| Music that ducks under speech | [Talking-head cut](/recipes/talking-head), the [walkthrough](/guide/writing-files) | [Captions and sound](/guide/captions-and-sound#sound) |
| Captions from an SRT, VTT or Whisper file | [Captions](#captions-and-key-points) | [Getting a transcript](/guide/captions-and-sound#getting-a-transcript) |
| Google Fonts or your own font files | [Fonts example](/guide/themes#fonts) | [Themes](/guide/themes#fonts) |
| Motion blur | [Motion blur example](/guide/exporting#motion-blur) | [Exporting](/guide/exporting#motion-blur) |
| Your own effects and transitions in GLSL | [Duotone, circle reveal, colour split on a title](/guide/free-code#effects-and-transitions-of-your-own) | [Free code](/guide/free-code#effects-and-transitions-of-your-own) |
| A flare or a sound over a cut | [At a cut](/guide/time#at-a-cut-light-leaks-flashes-and-whooshes) | [Time by meaning](/guide/time#at-a-cut-light-leaks-flashes-and-whooshes) |

## Rendering them yourself

Each video is one file in [`examples/showcase`](https://github.com/prefix-tree/cutcraft/tree/main/examples/showcase),
rendered with `pnpm --filter @cutcraft/example-showcase render`; the guide's feature examples, in
[`examples/showcase/guide`](https://github.com/prefix-tree/cutcraft/tree/main/examples/showcase/guide), with
`pnpm --filter @cutcraft/example-showcase docs`. The footage is made by `ffmpeg`'s own sources
(`pnpm --filter @cutcraft/example-showcase gen`), except the coffee shot in the effect and transition demos:
[Pixabay video 209419](https://pixabay.com/videos/id-209419/), under the Pixabay Content License. It is not committed;
`gen` reads it from `examples/showcase/media/stock/` and checks its hash. Every file renders through the player in
[headless Chrome](/guide/exporting#the-browser-it-runs-in). The people on camera are stand-ins: their
footage is a gradient, and the manifest holds the words they would say.

## A product launch

The founder on camera, cut on her words, with b-roll in the middle. A `<Three>` layer turns a phone in on the word
"Shed" and keeps it turning; its screen is the product's name drawn on a canvas. A Motion lower third names her, and
each feature appears as a pill on the word that names it (`anchor="talk" at="word:8"`), so recutting the talk retimes
every callout.

**Shows:** cuts on words, overlays on words, `<Three>`, `<Motion>`, a crossfade, tweakable props. [Time by meaning](/guide/time) · [Free code](/guide/free-code#three-js-and-motion) · [`<Three>`](/reference/elements/three) · [`<Motion>`](/reference/elements/motion)

<div class="cc-pair"><video :src="withBase('/showcase/launch.webm')" :poster="withBase('/showcase/launch.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/launch.tsx

## Kinetic type

A vertical short. Each phrase is a `<Motion>` sequence anchored to the word that starts it: one slams in, one stacks
word by word, one slides across. Karaoke captions run underneath.

**Shows:** `<Motion>` sequences anchored to words, karaoke captions, a vertical composition. [Time by meaning](/guide/time) · [Captions and sound](/guide/captions-and-sound) · [`<Motion>`](/reference/elements/motion)

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/kinetic.webm')" :poster="withBase('/showcase/kinetic.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/kinetic.tsx

## A data story

A chart written as plain SVG and animated by Motion: each bar grows on the word that says its number. The counters
are a few lines of React in a `<Layer>`, counting up on the layer's clock.

**Shows:** SVG animated by `<Motion>`, React counters in a `<Layer>` reading `useLayer()`, numbers on the words that say them. [Free code](/guide/free-code) · [`<Layer>`](/reference/elements/layer) · [`<Motion>`](/reference/elements/motion)

<div class="cc-pair"><video :src="withBase('/showcase/data.webm')" :poster="withBase('/showcase/data.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/data.tsx

## A logo reveal

Three thousand three.js particles, scattered by a seeded random, settle into the name sampled from a canvas, then a
Motion tagline slides in under it. Every particle's place is a function of time, so a frame looks the same however
it is reached.

**Shows:** a three.js particle system written as a function of time, a seeded random, a `<Motion>` hand-off. [Free code](/guide/free-code#the-video-s-clock) · [`<Three>`](/reference/elements/three)

<div class="cc-pair"><video :src="withBase('/showcase/logo.webm')" :poster="withBase('/showcase/logo.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/logo.tsx

## An edit

Three shots cut back to back on a sequence track: a wipe and a slide sit between them as siblings, the middle shot
pushes in with four keyframes, a title builds word by word, and a Motion lower third comes in over the second shot. The
overlays anchor to the shots, so they move when a cut moves.

**Shows:** a sequence track, transitions as siblings, keyframes, titles anchored to shots, a `<Motion>` lower third. [Time by meaning](/guide/time) · [`<Transition>`](/reference/elements/transition) · [`<Keyframe>`](/reference/elements/keyframe)

<div class="cc-pair"><video :src="withBase('/showcase/edit.webm')" :poster="withBase('/showcase/edit.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/edit.tsx

## Captions and key points

A vertical short. The captions are generated from the words the clip plays and highlight word by word; the key point
is anchored to the clip and timed to the word that names it (`at="word:16"`), so trimming the clip keeps it on that
word.

**Shows:** cuts on words, generated karaoke captions, a title on the word that names it. [Captions and sound](/guide/captions-and-sound) · [Time by meaning](/guide/time)

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/captions.webm')" :poster="withBase('/showcase/captions.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/captions.tsx

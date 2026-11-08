---
layout: page
title: CutCraft
titleTemplate: Video editor as code
footer: false
sidebar: false
aside: false
---

<script setup>
import { withBase } from "vitepress";
import bench from "./bench.json";

const drag = bench.editor.find((r) => r.nodes > 500 && r.step.startsWith("transform"));
</script>

<div class="home vp-doc">

<section class="home-hero">
<div class="home-hero-text">

<img class="home-icon" :src="withBase('/logo.svg')" alt="CutCraft">

# Video editor as code

<p class="home-lead">LLMs write code well and math badly. So a model writes a TSX file of words and shots, and CutCraft
does the arithmetic, plays it in the browser, edits it and exports it.</p>

<CopyCommand command="npm install cutcraft @cutcraft/kit react zod" />

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-button" :href="withBase('/guide/introduction')">Read the docs</a>
<a class="home-button" :href="withBase('/playground')">Playground</a>
<a class="home-button" href="https://github.com/prefix-tree/cutcraft">GitHub</a>
</div>

<p class="home-meta">MIT · plays in the browser · exports MP4, WebM and stills</p>

</div>
<div class="home-hero-media">
<HeroVideo src="showcase/hero" alt="A woodblock print: waves roll in under a red sun, a katana cuts it in two, and the print draws in to the CutCraft logo" />
</div>
</section>

<section class="home-words">
<div>

## Cut on words, not seconds

What a desktop editor like Premiere Pro gives you, as a file: tracks, cuts, transitions, titles, captions, sound,
colour, keying and export. Anything the timeline doesn't cover is free code: React, CSS, three.js or Motion.

The model never counts seconds: the cut starts on word 12, the title on word 16 of the clip that says it, and
CutCraft works out the frames. Trim or drag the clip and both stay on their words.

</div>
<div>

```tsx
<Composition fps={30} width={1080} height={1920}>
  <Track id="main">
    <Clip id="hook" src="asset:talk" in="word:12" out="word:23.end" />
    <Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" />
  </Track>
  <Track id="text">
    <Title id="point" anchor="hook" at="word:16" duration={3}>
      10× output
    </Title>
  </Track>
  <Captions id="captions" src="asset:talk" animation="karaoke" />
</Composition>
```

</div>
</section>

<Feature title="Captions that follow the words" src="showcase/captions" link="/guide/captions-and-sound">

Captions come from the clip's transcript, so they follow it through every trim, with karaoke, word-by-word and
typewriter styles. Import an SRT, VTT or Whisper file, or write cues by hand.

```tsx
<Captions id="captions" src="asset:speaker" animation="karaoke" />
```

</Feature>

<Feature title="Transitions" src="previews/transitions/iris" link="/reference/effects/#transitions" more="All twelve" reverse>

Fades, wipes, slides and pushes, and shader transitions: iris, clock wipe, blinds, film burn, pixel dissolve and zoom.
Each sits between two clips and takes its params from the file.

```tsx
<Transition id="open" type="iris" duration={1} />
```

</Feature>

<Feature title="Colour and effects" src="previews/guide/colour-grade" link="/guide/colour">

Exposure, white balance, curves, levels, LUTs, keying, region blur, corner pin, glow and more: twenty-eight built in,
run as shaders in the preview and the export alike, and your own in GLSL. Effects run in the order the file lists them.

```tsx
<Effect id="expose" type="exposure" params={{ stops: 0.5 }} />
<Effect id="balance" type="whiteBalance" params={{ temperature: 0.3 }} />
```

</Feature>

<Feature title="Free code where the timeline stops" src="showcase/logo" link="/guide/free-code" reverse>

A `<Layer>` takes any React, CSS or WebGL, and `<Three>` and `<Motion>` put three.js and Motion on the timeline. All
of it follows the video's clock, so it scrubs frame-exact.

```tsx
<Layer id="clock" anchor="shot" duration={3}>
  <Elapsed />
</Layer>
```

</Feature>

<Feature title="Edit by hand, keep the code" src="showcase/edit" link="/guide/editing">

Every drag and trim in the editor is an undoable action written back to the file as a one-value change, so the model
reads your edit as the code it wrote. One drag step on a composition of {{ drag.nodes.toLocaleString("en-US") }}
elements takes {{ (drag.usPerStep / 1000).toFixed(2) }} ms
<span class="home-note">({{ bench.machine }}, Node {{ bench.node }})</span>.

</Feature>

<Feature title="What you preview is what you export" src="showcase/kinetic" link="/guide/exporting" reverse>

The browser plays the file, and the export runs the same player in headless Chrome: MP4, WebM and stills. A lint, a
list of what renders and a layout check catch mistakes before the render.

```sh
npx cutcraft video.tsx --out video.mp4
```

</Feature>

<section class="home-try">

## Try it

<p class="home-strip-lead">Edit the file; the video follows. It plays right here, in the same player your app embeds.</p>

<Playground compact />

<p class="home-links"><a :href="withBase('/playground')">Open the playground →</a></p>

</section>

<section class="home-strip">

## Effects and transitions

<p class="home-strip-lead">Hover a card to play it. Every one has a page with the file that made it.</p>

<div class="home-strip-row">
<PreviewCard code hover title="whiteBalance" link="/reference/effects/whiteBalance" src="previews/effects/whiteBalance" />
<PreviewCard code hover title="duotone" link="/reference/effects/duotone" src="previews/effects/duotone" />
<PreviewCard code hover title="colorKey" link="/reference/effects/colorKey" src="previews/effects/colorKey" />
<PreviewCard code hover title="cornerPin" link="/reference/effects/cornerPin" src="previews/effects/cornerPin" />
<PreviewCard code hover title="regionBlur" link="/reference/effects/regionBlur" src="previews/effects/regionBlur" />
<PreviewCard code hover title="glow" link="/reference/effects/glow" src="previews/effects/glow" />
<PreviewCard code hover title="outline" link="/reference/effects/outline" src="previews/effects/outline" />
<PreviewCard code hover title="longShadow" link="/reference/effects/longShadow" src="previews/effects/longShadow" />
<PreviewCard code hover title="iris" link="/reference/transitions/iris" src="previews/transitions/iris" />
<PreviewCard code hover title="filmBurn" link="/reference/transitions/filmBurn" src="previews/transitions/filmBurn" />
<PreviewCard code hover title="pixelDissolve" link="/reference/transitions/pixelDissolve" src="previews/transitions/pixelDissolve" />
<PreviewCard code hover title="blinds" link="/reference/transitions/blinds" src="previews/transitions/blinds" />
</div>

<p class="home-links"><a :href="withBase('/reference/effects/')">All 40 effects and transitions →</a></p>

</section>

<section class="home-examples">

## Examples

Every video on this site is a short file rendered by CutCraft's own export engine; each card opens the file that made
it.

<div class="cc-cards home-cards">
<PreviewCard title="A product launch" link="/examples#a-product-launch" src="showcase/launch" text="A three.js phone beside the founder, each feature on its word." />
<PreviewCard title="Kinetic type" link="/examples#kinetic-type" src="showcase/kinetic" text="Motion sequences that land on their words." />
<PreviewCard title="A data story" link="/examples#a-data-story" src="showcase/data" text="SVG and React; each number on the word that says it." />
<PreviewCard title="A logo reveal" link="/examples#a-logo-reveal" src="showcase/logo" text="three.js particles that settle into a name." />
<PreviewCard title="An edit" link="/examples#an-edit" src="showcase/edit" text="Three shots, a wipe and a slide, and a push-in on keyframes." />
<PreviewCard title="A vertical short" link="/examples#captions-and-key-points" src="showcase/captions" text="Captions follow the words; the key point lands on its word." />
</div>

</section>

<section class="home-inside">

## What's inside

<div class="home-inside-grid">

- **The model writes words, CutCraft does the math.** Cuts name transcript words and camera shots, titles name the
  word they belong to, and CutCraft turns them into frames through every trim and speed change.
- **A full editor's timeline.** Tracks, clips, transitions, keyframes, speed ramps, masks, titles, captions, a
  soundtrack, colour grading and keying, each an element in the file.
- **Free code where the timeline stops.** A `<Layer>` takes any React, CSS or WebGL, and `<Three>` and `<Motion>`
  put three.js and Motion on the timeline.
- **Edit by hand, keep the code.** Every drag and trim in the editor is an undoable action written back to the file.
- **What you preview is what you export.** The same player plays the file and exports it
  ([how it works](./guide/export-architecture)).
- **Checks like a compiler.** A lint for the file, a list of what renders, and a layout check that points at the line
  where a graphic covers a face or leaves the safe zone.

</div>

</section>

<section class="home-foot">

**Free and open source under the MIT licence.**

[Quick start](./guide/getting-started) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/cutcraft) ·
[npm](https://www.npmjs.com/package/cutcraft)

</section>

</div>

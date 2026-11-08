---
layout: page
title: CutCraft
titleTemplate: Video editor as code
footer: false
---

<script setup>
import { withBase } from "vitepress";
import bench from "./bench.json";

const drag = bench.editor.find((r) => r.nodes > 500 && r.step.startsWith("transform"));
</script>

<div class="home vp-doc">

<img class="home-icon" :src="withBase('/logo.svg')" alt="CutCraft">

# Video editor as code

LLMs write code well and math badly. So a model writes a TSX file of words and shots, and CutCraft does the
arithmetic, plays it in the browser, edits it and exports it.

What a desktop editor like Premiere Pro gives you, as a file: tracks, cuts, transitions, titles, captions, sound,
colour, keying and export. Anything the timeline doesn't cover is free code: React, CSS, three.js or Motion.

```sh
npm install cutcraft @cutcraft/kit react zod
```

<p class="home-links"><a :href="withBase('/guide/getting-started')">Quick start</a> · <a :href="withBase('/examples')">Examples</a> · <a :href="withBase('/guide/introduction')">Introduction</a> · <a href="https://github.com/prefix-tree/cutcraft">GitHub</a> · MIT</p>

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

The model never counts seconds: the cut starts on word 12, the title on word 16 of the clip that says it, and
CutCraft works out the frames. Trim or drag the clip and both stay on their words.

## Examples

Every video on this site is a short file rendered by CutCraft's own export engine; each card opens the file that made
it.

<div class="home-videos">
<figure class="wide"><video :src="withBase('/showcase/launch.webm')" :poster="withBase('/showcase/launch.jpg')" autoplay muted loop playsinline></video><figcaption>A product launch: a three.js phone beside the founder, each feature on the word that names it. <a :href="withBase('/examples')">Its file →</a></figcaption></figure>
</div>

<div class="cc-cards home-cards">
<PreviewCard title="Kinetic type" link="/examples#kinetic-type" src="showcase/kinetic" text="Motion sequences that land on their words." />
<PreviewCard title="A data story" link="/examples#a-data-story" src="showcase/data" text="SVG and React; each number on the word that says it." />
<PreviewCard title="A logo reveal" link="/examples#a-logo-reveal" src="showcase/logo" text="three.js particles that settle into a name." />
<PreviewCard title="A vertical short" link="/examples#captions-and-key-points" src="showcase/captions" text="Captions follow the words; the key point lands on its word." />
<PreviewCard title="Free code" link="/reference/elements/layer" src="previews/elements/layer" text="Any React in a Layer, timed by useT()." />
<PreviewCard title="Transitions" link="/reference/elements/transition" src="previews/elements/transition" text="A wipe between two clips." />
<PreviewCard title="Keyframes" link="/reference/elements/keyframe" src="previews/elements/keyframe" text="A slow push-in, eased." />
<PreviewCard title="Titles" link="/reference/elements/title" src="previews/elements/title" text="Entrances by letter, word or line." />
<PreviewCard title="Masks" link="/reference/elements/mask" src="previews/elements/mask" text="A feathered oval over footage." />
<PreviewCard title="Speed ramps" link="/reference/elements/speedkey" src="previews/elements/speedkey" text="Normal speed easing into 4×." />
<PreviewCard title="Colour" link="/guide/colour" src="previews/guide/white-balance" text="Cool and warm white balance on one shot." />
</div>

<p class="home-links"><a :href="withBase('/examples')">Examples</a> · <a :href="withBase('/reference/elements/')">All elements</a> · <a :href="withBase('/guide/free-code')">Free code</a></p>

## What's inside

- **The model writes words, CutCraft does the math.** Cuts name transcript words and camera shots, titles name the
  word they belong to, and CutCraft turns them into frames through every trim and speed change.
- **A full editor's timeline.** Tracks, clips, transitions, keyframes, speed ramps, masks, titles, captions, a
  soundtrack, colour grading and keying, each an element in the file.
- **Free code where the timeline stops.** A `<Layer>` takes any React, CSS or WebGL, and `<Three>` and `<Motion>`
  put three.js and Motion on the timeline. All of it follows the video's clock, so it scrubs frame-exact.
- **Edit by hand, keep the code.** Every drag and trim in the editor is an undoable action written back to the file as
  a one-value change, so the model reads your edit as the code it wrote.
- **What you preview is what you export.** The browser plays the file, and the export runs the same player in
  headless Chrome: MP4, WebM and stills ([how it works](./guide/export-architecture)).
- **Checks like a compiler.** A lint for the file, a list of what renders, and a layout check that points at the line
  where a graphic covers a face or leaves the safe zone.

## Fast in the editor

In the editor, one drag step on a composition of {{ drag.nodes.toLocaleString("en-US") }} elements (validate the action,
patch the file, resolve everything again) takes {{ (drag.usPerStep / 1000).toFixed(2) }} ms
<span class="home-note">({{ bench.machine }}, Node {{ bench.node }}; <code>pnpm docs:bench</code> measures yours)</span>.

## Read more

- [Quick start](./guide/getting-started): install, write a first file, export it.
- [Free code](./guide/free-code): any React, three.js or Motion, on the video's clock.
- [A launch video, line by line](./guide/writing-files): one file from a brief to a finished video.
- [Elements](./reference/elements/), [CLI](./reference/cli) and [API](./reference/api): every element, option and function.

<p class="home-foot">CutCraft is free and open source under the MIT licence.</p>

</div>

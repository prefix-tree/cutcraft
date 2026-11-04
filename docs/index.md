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

A video is a TSX file. Clips are cut on transcript words and camera shots, titles land on the word they belong to,
and anything you draw can be free code: React, CSS, three.js or Motion. The browser plays the file, an editor edits
the same file, and the export renders it with the same engine.

<p class="home-links"><a :href="withBase('/guide/getting-started')">Quick start</a> · <a :href="withBase('/examples')">Examples</a> · <a :href="withBase('/guide/introduction')">Introduction</a> · <a href="https://github.com/prefix-tree/cutcraft">GitHub</a></p>

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

No second counts the model had to compute: the cut starts on word 12, the title on word 16 of the clip that says it,
and both move when the clip is trimmed or dragged.

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
<PreviewCard title="Colour" link="/reference/elements/colorgrade" src="previews/elements/colorgrade" text="Cool and warm grades on one shot." />
</div>

<p class="home-links"><a :href="withBase('/examples')">Examples</a> · <a :href="withBase('/reference/elements/')">All elements</a> · <a :href="withBase('/guide/free-code')">Free code</a></p>

## What's inside

- **One file, three authors.** The model writes it, the editor's gestures become actions that fold back into it as
  small edits, and the model reads what you did as the code it wrote.
- **No math for the model.** Cuts name transcript words and camera shots, titles name the word they belong to, and
  the resolver turns them into seconds through every trim and speed change.
- **Free code where you want it.** A `<Layer>` takes any React, CSS or WebGL, and `<Three>` and `<Motion>` put
  three.js and Motion on the timeline. All of it follows the video's clock, so it scrubs and seeks frame-exact.
- **Every action undoes.** 131 editor actions, each able to validate, apply, invert and write itself back to the file.
- **Plays in the browser.** WebCodecs decoding, a canvas for footage, DOM for overlays, Web Audio as the clock, and a
  frame-exact seek.
- **Exports in Node.** The same engine, headless: WebM, MP4, MOV, soundtracks and stills, with its own audio mix.
- **Checks like a compiler.** A lint for the file, a list of what renders, and a layout check that points at the line
  where a graphic covers a face or leaves the safe zone.

## Benchmarks

The same three 1080p H.264 videos exported by CutCraft, Remotion and Diffusion Studio, each at its defaults, in frames
per second ([method and every variant](./comparisons/export-speed)).

<div class="home-chart cc-bench">
<p class="cc-bench-group">Cuts: five shots of one file</p>
<div class="row"><span class="name">CutCraft</span><span class="track"><span class="bar" style="width: 90%"></span></span><span class="value">199</span></div>
<div class="row"><span class="name">Diffusion Studio</span><span class="track"><span class="bar other" style="width: 90%"></span></span><span class="value">198</span></div>
<div class="row"><span class="name">Remotion</span><span class="track"><span class="bar other" style="width: 10%"></span></span><span class="value">21</span></div>
<p class="cc-bench-group">Crossfades with a title on each</p>
<div class="row"><span class="name">CutCraft</span><span class="track"><span class="bar" style="width: 36%"></span></span><span class="value">80</span></div>
<div class="row"><span class="name">Diffusion Studio</span><span class="track"><span class="bar other" style="width: 86%"></span></span><span class="value">190</span></div>
<div class="row"><span class="name">Remotion</span><span class="track"><span class="bar other" style="width: 10%"></span></span><span class="value">23</span></div>
<p class="cc-bench-group">Motion graphics, no footage</p>
<div class="row"><span class="name">CutCraft</span><span class="track"><span class="bar" style="width: 68%"></span></span><span class="value">149</span></div>
<div class="row"><span class="name">Diffusion Studio</span><span class="track"><span class="bar other" style="width: 91%"></span></span><span class="value">201</span></div>
<div class="row"><span class="name">Remotion</span><span class="track"><span class="bar other" style="width: 39%"></span></span><span class="value">85</span></div>
</div>

<p class="home-note">Apple M3 Pro, 2 November 2026. On a 4-core Linux server with no GPU, CutCraft renders the same videos at 111, 37 and 61 fps. An export through headless Chrome, in the works, rendered them at 191, 185 and 202 fps in a first test.</p>

In the editor, one drag step on a composition of {{ drag.nodes.toLocaleString("en-US") }} elements (validate the action,
patch the file, resolve everything again) takes {{ (drag.usPerStep / 1000).toFixed(2) }} ms
<span class="home-note">({{ bench.machine }}, Node {{ bench.node }}; <code>pnpm docs:bench</code> measures yours)</span>.

## Read more

- [Quick start](./guide/getting-started): install, write a first file, export it.
- [Free code](./guide/free-code): any React, three.js or Motion, on the video's clock.
- [A launch video, line by line](./guide/writing-files): one file from a brief to a finished video.
- [Elements](./reference/elements/), [CLI](./reference/cli) and [API](./reference/api): every element, option and function.
- [Compare](./comparisons/remotion): how CutCraft differs from Remotion and Diffusion Studio.

<p class="home-foot">CutCraft is free and open source under the MIT licence.</p>

</div>

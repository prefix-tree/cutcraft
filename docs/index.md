---
layout: page
title: CutCraft
titleTemplate: Video editor as code
footer: false
---

<script setup>
import { withBase } from "vitepress";
import bench from "./bench.json";

const NAMES = { edit: "An edit", captions: "A vertical short", graphics: "Data graphics", motion: "Motion" };
const rows = bench.export.map((r) => ({ name: NAMES[r.file] ?? r.file, fps: r.fps1 }));
const scale = Math.max(60, ...rows.map((r) => r.fps)) * 1.1;
const pct = (fps) => `${(fps / scale) * 100}%`;
const drag = bench.editor.find((r) => r.nodes > 500 && r.step.startsWith("transform"));
</script>

<div class="home vp-doc">

<img class="home-icon" :src="withBase('/logo.svg')" alt="CutCraft">

# Video editor as code

LLMs are good at writing code and bad at math. So in CutCraft the model writes the video as a TSX file that names
what it means (a transcript word, a camera shot, the clip a title belongs to), and CutCraft does the arithmetic. The
browser plays the file, an editor's timeline and inspector edit the same file, and Node exports it with the same
engine.

<p class="home-links"><a :href="withBase('/guide/getting-started')">Get started</a> · <a :href="withBase('/examples')">Examples</a> · <a :href="withBase('/guide/writing-files')">Writing a file</a> · <a href="https://github.com/prefix-tree/cutcraft">GitHub</a></p>

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

Each video is one short file rendered by CutCraft's own export engine. [All four, with their files →](./examples)

<div class="home-videos">
<figure class="wide"><video :src="withBase('/showcase/edit.webm')" :poster="withBase('/showcase/edit.jpg')" autoplay muted loop playsinline></video><figcaption>An edit: shots, a wipe and a slide, a push-in, a title and a lower third.</figcaption></figure>
<figure><video :src="withBase('/showcase/graphics.webm')" :poster="withBase('/showcase/graphics.jpg')" autoplay muted loop playsinline></video><figcaption>Data graphics, with the numbers as props.</figcaption></figure>
<figure><video :src="withBase('/showcase/motion.webm')" :poster="withBase('/showcase/motion.jpg')" autoplay muted loop playsinline></video><figcaption>A chart that springs up, drawn in a layer.</figcaption></figure>
<figure class="wide side"><video :src="withBase('/showcase/captions.webm')" :poster="withBase('/showcase/captions.jpg')" autoplay muted loop playsinline></video><figcaption>A vertical short: captions follow the words, and the key point starts on the word that names it.</figcaption></figure>
</div>

## What's inside

- **One file, three authors.** The model writes it, the editor's gestures become actions that fold back into it as
  small edits, and the model reads what you did as the code it wrote.
- **No math for the model.** Cuts name transcript words and camera shots, titles name the word they belong to, and
  the resolver turns them into seconds through every trim and speed change.
- **Every action undoes.** 131 editor actions, each able to validate, apply, invert and write itself back to the file.
- **Plays in the browser.** WebCodecs decoding, a canvas for footage, DOM for overlays, Web Audio as the clock, and a
  frame-exact seek.
- **Exports in Node.** The same engine, headless: WebM, MP4, MOV, soundtracks and stills, with its own audio mix.
- **Checks like a compiler.** A lint for the file, a list of what renders, and a layout check that points at the line
  where a graphic covers a face or leaves the safe zone.

## Benchmarks

Export speed of the examples on one thread, in frames per second. The footage is 30 fps, so a bar past the line
renders faster than real time.

<div class="home-chart">
<div class="row" v-for="r in rows" :key="r.name"><span class="name">{{ r.name }}</span><span class="track"><span class="bar" :style="{ width: pct(r.fps) }"></span><span class="realtime" :style="{ left: pct(30) }"></span></span><span class="value">{{ r.fps }}</span></div>
</div>

In the editor, one drag step on a composition of {{ drag.nodes.toLocaleString("en-US") }} elements (validate the action,
patch the file, resolve everything again) takes {{ (drag.usPerStep / 1000).toFixed(2) }} ms.

<p class="home-note">Measured {{ bench.measured }} on {{ bench.machine }}{{ bench.ci ? " (GitHub Actions)" : "" }}, Node {{ bench.node }}. <code>pnpm docs:bench</code> measures your machine.</p>

Against Remotion and Diffusion Studio on the same three videos: [Export speed](./comparisons/export-speed).

## Read more

- [Getting started](./guide/getting-started): install, run the example, export a file.
- [Writing a file](./guide/writing-files): one file from brief to pixels, and why each convention exists.
- [Elements](./reference/elements/) and [graphics](./reference/graphics/): every element, prop and built-in graphic.
- [Exporting](./guide/exporting): formats, speed, and the layout check.
- [Decisions](./decisions/): why it is built this way.

<p class="home-foot">CutCraft is free and open source under the MIT licence.</p>

</div>

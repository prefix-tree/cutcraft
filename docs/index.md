---
layout: page
title: UberScene
titleTemplate: Multimedia pipeline as code
footer: false
sidebar: false
aside: false
---

<script setup>
import { withBase } from "vitepress";
</script>

<div class="home vp-doc">

<section class="home-hero">
<div class="home-hero-grid">
<div class="home-hero-main">

<p class="home-tags"><span>Make videos with code</span><span>Work in progress</span></p>

<h1 class="home-title"><span class="home-title-line">Multimedia pipeline</span> <span class="home-title-line"><span class="home-title-mark">as code.</span></span></h1>

<p class="home-lead">Write a video as a React file. Play it in the browser, fine-tune it on a timeline, export it to MP4. Next: 3D scenes in the same file that guide generative video models. Early: the API changes until 1.0.</p>

<AgentPicker />

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-button" :href="withBase('/examples/')">Examples</a>
<a class="home-button" href="https://github.com/prefix-tree/uberscene">GitHub</a>
</div>

</div>
<aside class="home-spec" aria-label="Specification">
<p class="home-spec-head"><span>At a glance</span></p>
<dl>
<div><dt>Input</dt><dd>One TSX file</dd></div>
<div><dt>Output</dt><dd>MP4 · WebM · PNG</dd></div>
<div><dt>Effects</dt><dd>45 shaders</dd></div>
<div><dt>Edit actions</dt><dd>99, undoable</dd></div>
<div><dt>Player</dt><dd>Browser, frame-exact</dd></div>
<div><dt>Render</dt><dd>Headless Chrome, no FFmpeg</dd></div>
<div><dt>Runtime</dt><dd>Node ≥ 22.19</dd></div>
<div><dt>Operator</dt><dd>You or your agent</dd></div>
<div><dt>Next</dt><dd>3D + model guidance</dd></div>
</dl>
<p class="home-spec-foot">MIT · Open source</p>
</aside>
</div>
<figure class="home-sheet">
<a :href="withBase('/examples/coffee')"><img :src="withBase('/showcase/coffee-look.webp')" width="2600" height="972" loading="eager" alt="Eight frames of the coffee film in two rows: a pour-over titled SLOW POUR, a lower third over the bloom, a callout on a held frame, an espresso machine titled FAST SHOT, a Warm LUT badge, three glasses under EVERY GLASS, A LINE OF CODE, and a red cup as a quote builds word by word; under them, a strip of the film's sound with a peak on every cue" /></a>
<figcaption><code>uberscene look coffee.tsx --at 2.5,7.2,9.9,16,19.5,24.5,30.5,34.5 --listen all</code><span>One command draws a whole cut and its sound on one sheet: this is how an agent reviews a video without watching it. <a :href="withBase('/reference/cli#look')">look →</a></span></figcaption>
</figure>
</section>

<section class="home-chapter">

## One file, one coffee

<p class="home-chapter-lead">Four stock shots of coffee, cut in one file: shader transitions, a speed ramp and a held frame, a LUT that comes in while you watch, titles, components, a block and a sound on every beat. <a :href="withBase('/examples/coffee')">The coffee film →</a></p>

<Example src="showcase/coffee" alt="A pour-over and an espresso cut together with transitions, titles, a warm grade and a closing quote">

```tsx
<Clip id="pour" src="asset:coffee" in={10} out={14} fit="cover"
  speed={[
    { at: 0, value: 1 },
    { at: 1.6, value: 0.4, easing: "easeInOutQuad" },
  ]}
  freezes={[{ start: 4.2, duration: 1.4, source: 12.4 }]} />
<Transition id="x2" type="iris" duration={0.9} />
<Clip id="shot" src="asset:espresso" in={1} out={9} fit="cover"
  effects={[{
    type: "lut",
    src: "asset:warm",
    amount: [
      { at: 3.2, value: 0, easing: "easeInOut" },
      { at: 4.4, value: 1 },
    ],
  }]} />
```

</Example>

</section>

<section class="home-live" aria-label="Try it">

<Playground compact />

</section>

<section class="home-install" id="install">

## Install

<p class="home-chapter-lead">UberScene is built for a coding agent to drive: give it the skill, then ask for a video in plain words. It adds your footage, writes <code>video.tsx</code>, checks it with sheets of frames and renders <code>video.mp4</code>. Or pick By hand and run the commands yourself. Either way you need Node 22.19 or later, and no ffmpeg.</p>

<AgentPicker full />

<p class="home-install-more"><a :href="withBase('/guide/agents')">With your agent →</a> <a :href="withBase('/guide/getting-started')">Quick start →</a></p>

</section>

<section class="home-why">

## Why UberScene

<p class="home-why-lead">An agent writes code better than it drives a timeline. The picture, the 3D and the music are one file, so the model can change all three.</p>

<ul class="home-why-list">
<li><span><strong>Edit the video in code</strong> The cut, the titles and the effects are the file. Change one value and the picture changes.</span></li>
<li><span><strong>Build the 3D in code</strong> A three.js scene and its camera sit on the same clock as the edit, and render from that file.</span></li>
<li><span><strong>Write the music in code</strong> The score is a track in the file, so the sound stays aligned with the picture.</span></li>
</ul>

</section>

<section class="home-features">

## Features

<p class="home-chapter-lead">Everything a video needs, from the first cut to the export, in the order you use it.</p>

<FeatureGroups />

</section>

<section class="home-elements">

## Every element

<p class="home-chapter-lead">Each one a few lines of TSX, rendered by the same player you embed. <a :href="withBase('/examples/')">All examples →</a></p>

<div class="home-element-grid">

<article class="home-element">

### Cuts and transitions

<p class="home-element-lead">Clips play one after another on a track. A transition between two of them overlaps them: wipe, iris, film burn, blinds and more. <a :href="withBase('/guide/transitions')">Transitions →</a></p>

<Example src="previews/elements/transition" alt="A wipe from one coffee shot to another">

<<< @/../examples/showcase/docs/transition.tsx

</Example>

</article>

<article class="home-element">

### Titles

<p class="home-element-lead">Text over the picture, timed to a clip, animated by letter or by word. <a :href="withBase('/guide/titles-and-graphics')">Titles and graphics →</a></p>

<Example src="previews/elements/title" alt="A title appearing word by word over a coffee shot">

<<< @/../examples/showcase/docs/title.tsx

</Example>

</article>

<article class="home-element">

### Captions

<p class="home-element-lead">Captions from the clip's transcript, or from SRT, VTT and Whisper. Karaoke, word by word or typewriter. <a :href="withBase('/guide/captions-and-sound')">Captions and sound →</a></p>

<Example src="previews/elements/captions" alt="Karaoke captions over a speaker">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

</article>

<article class="home-element">

### Colour and effects

<p class="home-element-lead">Exposure, white balance, curves, LUTs, keying, glow and more, written in the order a colourist works. Shaders in the preview and the export. <a :href="withBase('/reference/effects/')">All 45 effects and transitions →</a></p>

<Example src="previews/guide/colour-grade" alt="A coffee shot, then the same shot graded">

<<< @/../examples/showcase/guide/colour-grade.tsx

</Example>

</article>

<article class="home-element">

### Motion graphics

<p class="home-element-lead">Ready-made lower thirds, callouts, counters and cards, timed like any title. <a :href="withBase('/reference/components/')">Components →</a></p>

<Example src="previews/components/lower-third" alt="A lower third sliding up over a coffee shot">

<<< @/../examples/showcase/components/lower-third.tsx

</Example>

</article>

<article class="home-element">

### Three.js and any React

<p class="home-element-lead">Any component on the video's clock: three.js, Motion, SVG or canvas, frame-exact when you scrub or export. Next: a 3D scene with a camera path that also renders guidance for video models. <a :href="withBase('/guide/free-code')">Free code →</a></p>

<Example src="previews/elements/three" alt="A spinning cube over a coffee shot">

<<< @/../examples/showcase/docs/three.tsx

</Example>

</article>

</div>

</section>

<section class="home-foot">

<p class="home-foot-mark" aria-hidden="true">UberScene</p>

**Free and open source under the MIT licence.** <a :href="withBase('/examples/')">More examples →</a>

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/uberscene) ·
[npm](https://www.npmjs.com/package/uberscene)

</section>

</div>

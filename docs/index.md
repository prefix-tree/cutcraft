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

<p class="home-tags"><span>Unit 01</span><span>Make videos with code</span></p>

<h1 class="home-title"><span class="home-title-line">Multimedia pipeline</span> <span class="home-title-line"><span class="home-title-mark">as code.</span></span></h1>

<p class="home-lead">Write a video as a React file. Play it in the browser, fine-tune it on a timeline, export it to MP4. Next: 3D scenes in the same file that guide generative video models. <a href="#aim">Where it's going ↓</a></p>

<AgentPicker />

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-button" :href="withBase('/examples/')">Examples</a>
<a class="home-button" href="https://github.com/prefix-tree/uberscene">GitHub</a>
</div>

</div>
<aside class="home-spec" aria-label="Specification">
<p class="home-spec-head"><span>Spec sheet</span><span>Type US-1</span></p>
<dl>
<div><dt>Input</dt><dd>One TSX file</dd></div>
<div><dt>Output</dt><dd>MP4 · WebM · PNG</dd></div>
<div><dt>Effects</dt><dd>45 shaders</dd></div>
<div><dt>Edit actions</dt><dd>98, undoable</dd></div>
<div><dt>Player</dt><dd>Browser, frame-exact</dd></div>
<div><dt>Render</dt><dd>Headless Chrome</dd></div>
<div><dt>Runtime</dt><dd>Node ≥ 22.19</dd></div>
<div><dt>Operator</dt><dd>You or your agent</dd></div>
<div><dt>Next</dt><dd>3D + model guidance</dd></div>
</dl>
<p class="home-spec-stamp">MIT · Open source</p>
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
<Clip id="pour" src="asset:coffee" in={10} out={14} fit="cover">
  <SpeedKey id="pour-s0" at={0} speed={1} />
  <SpeedKey id="pour-s1" at={1.6} speed={0.4} easing="easeInOutQuad" />
  <Freeze id="pour-hold" at={12.4} start={4.2} duration={1.4} />
</Clip>
<Transition id="x2" type="iris" duration={0.9} />
<Clip id="shot" src="asset:espresso" in={1} out={9} fit="cover">
  <Effect id="shot-warm" type="lut" params={{ src: "asset:warm" }}>
    <Keyframe id="shot-warm-0" param="amount" at={3.2} value={0} easing="ease-in-out" />
    <Keyframe id="shot-warm-1" param="amount" at={4.4} value={1} />
  </Effect>
</Clip>
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

<section class="home-aim" id="aim">

## Where it's going

<p class="home-aim-lead"><strong>A whole multimedia pipeline written as code.</strong> Agents work better with code than with ffmpeg flags or a mouse, so the edit, its graphics and its 3D scenes belong in one file.</p>

<div class="home-aim-flow" role="img" aria-label="One video.tsx file renders the edit to MP4, and a 3D scene to guidance passes for generative video models">
<div class="home-aim-node home-aim-source">video.tsx</div>
<div class="home-aim-rows">
<div class="home-aim-row"><span class="home-aim-arrow" aria-hidden="true">→</span><div class="home-aim-node"><b>The edit</b><small>clips · captions · effects</small></div><span class="home-aim-arrow" aria-hidden="true">→</span><div class="home-aim-node home-aim-out"><b>MP4</b><small>today</small></div></div>
<div class="home-aim-row home-aim-next"><span class="home-aim-arrow" aria-hidden="true">→</span><div class="home-aim-node"><b>3D scene</b><small>three.js + camera path</small></div><span class="home-aim-arrow" aria-hidden="true">→</span><div class="home-aim-node"><b>Guidance passes</b><small>preview · depth · masks · pose · camera</small></div><span class="home-aim-arrow" aria-hidden="true">→</span><div class="home-aim-node home-aim-out"><b>Video models</b><small>next</small></div></div>
</div>
</div>

<p class="home-aim-text">A rough 3D render is one of the most precise ways to pin down camera and layout for generative video models. So the file that cuts your video should also render what those models take, frame for frame, on the same timeline. A glTF export keeps the scene open in Blender.</p>

<ol class="home-roadmap">
<li class="is-done"><span>Done</span><strong>Editing as code</strong> Tracks, captions, audio, transitions, effects, and React, Motion and three.js layers.</li>
<li class="is-done"><span>Done</span><strong>One file, every editor</strong> Agent edits and timeline edits write back to the same source, with undo.</li>
<li class="is-now"><span>Now</span><strong>3D scenes</strong> A three.js scene with a camera path on the video's clock.</li>
<li class="is-next"><span>Next</span><strong>Guidance passes</strong> Shaded preview, depth, masks, pose skeletons and the camera for every frame, at the model's frame rate.</li>
<li class="is-next"><span>Next</span><strong>glTF export</strong> The same scene, opened in Blender.</li>
</ol>

</section>

<section class="home-features">

## Features

<ul class="home-feature-list">
<li><strong>Timeline elements</strong> Clips, tracks, transitions, titles, shapes, masks, keyframes, speed ramps, freeze frames and multicam.</li>
<li><strong>Captions</strong> From the clip's transcript, SRT, VTT or Whisper; karaoke, word by word or typewriter.</li>
<li><strong>Effects and transitions</strong> 45 built in, run as shaders in the preview and the export, or your own in GLSL.</li>
<li><strong>Motion graphics</strong> Lower thirds, callouts, counters, quote cards and themes.</li>
<li><strong>Free code</strong> Any React, CSS, SVG, canvas, three.js or Motion, on the video's clock.</li>
<li><strong>Editing API</strong> 98 undoable actions that write each change back into the file.</li>
<li><strong>Player</strong> A React component that plays the file in the browser, frame-exact.</li>
<li><strong>Export</strong> MP4, WebM and stills from the command line, rendered in headless Chrome.</li>
<li><strong>Checks</strong> Lint, contact sheets and layout checks, to review a cut without watching it.</li>
<li><strong>Agent skill</strong> Teaches Claude Code and other agents to write, check and render videos.</li>
</ul>

</section>

<section class="home-chapter">

## Edit the file from code

<p class="home-chapter-lead">98 actions edit the file itself: each one checked, undoable, and written back to its text as a one-value change. Wire them to any editor: a timeline, a form, an agent's tool call. <a :href="withBase('/guide/editing')">Editing →</a></p>

<Example src="showcase/edit" alt="Three shots cut back to back, with transitions, a push-in and titles">

```ts
import { collectModule, Executor } from "@uberscene/sdk";
import { foldToSource, loadModule } from "@uberscene/sdk";

const tree = collectModule(loadModule(text));
const exec = new Executor({ tree, manifest });

// A drag on your timeline, a field in your form, a tool call:
exec.execute({ type: "clip/trim",
  params: { id: "open", edge: "out", value: 6.5 } });
exec.execute({ type: "text/setContent",
  params: { id: "title", text: "Bloom first" } });
exec.undo();
exec.redo();

// The file again, changed by exactly those edits.
const { text: next } = foldToSource(text, exec.log(), exec.state());
```

</Example>

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

<p class="home-element-lead">Any component on the video's clock: three.js, Motion, SVG or canvas, frame-exact when you scrub or export. Next: a 3D scene with a camera path that also renders guidance for video models. <a :href="withBase('/guide/free-code')">Free code →</a> · <a href="#aim">Where it's going →</a></p>

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
